/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defer, forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export type GeneratedResourceKind = 'export' | 'process deployment' | 'schedule' | 'import instance';

/** A resource a widget dialog generated, with the element it belongs to for messages. */
export interface GeneratedResource {
    kind: GeneratedResourceKind;
    id: string;
    label: string;
    /** Import instances only: the exports reading from it, which keep it in use while a widget references them. */
    exportIds?: string[];
}

/** A kind without a deleter cannot be deleted; its resources count as failed deletes. */
export interface GeneratedResourceDeleters {
    export?: (id: string) => Observable<{ status: number }>;
    deployment?: (id: string) => Observable<{ status: number }>;
    schedule?: (id: string) => Observable<{ status: number }>;
    importInstance?: (id: string) => Observable<{ status: number }>;
}

export const resourceKey = (r: GeneratedResource) => r.kind + '|' + r.id;

/** Other widgets can adopt exports and import instances; deployments and schedules belong to the widget that made them. */
export const isAdoptable = (r: GeneratedResource) => r.kind === 'export' || r.kind === 'import instance';

export function describeGeneratedResource(r: GeneratedResource): string {
    return r.kind + ' of ' + r.label;
}

/** Appended to a "could not delete" notice once the resources are logged for a later clean-up. */
export const DELETE_RETRY_NOTE = ', deleting is retried later';

/**
 * The close notice of a dialog: `failed` are deletes that were tried and failed, `unconfirmed` were not deleted because a
 * property update without OK sent them; `logged` tells whether a later clean-up takes care of them.
 */
export function unsavedNotice(
    failed: GeneratedResource[],
    unconfirmed: GeneratedResource[],
    logged: boolean,
    describe: (r: GeneratedResource) => string = describeGeneratedResource,
): string {
    const parts: string[] = [];
    if (failed.length > 0) {
        parts.push('Could not delete the ' + failed.map(describe).join(', ') + ' generated for the unsaved changes' + (logged ? DELETE_RETRY_NOTE : ''));
    }
    if (unconfirmed.length > 0) {
        const them = unconfirmed.length === 1 ? 'it' : 'them';
        parts.push(
            'Kept the ' + unconfirmed.map(describe).join(', ') + ' generated for the unsaved changes, since a save without confirmation may use ' + them +
                (logged ? '. A later clean-up deletes ' + them + ' if no widget does' : ''),
        );
    }
    return parts.join('. ');
}

/** Deletes every resource once per kind and id and answers those whose delete failed; status 404 counts as done. */
export function deleteResources(resources: GeneratedResource[], deleters: GeneratedResourceDeleters): Observable<GeneratedResource[]> {
    const unique = uniqueResources(resources);
    const deletes = unique.map((r) => {
        const deleter =
            r.kind === 'export'
                ? deleters.export
                : r.kind === 'schedule'
                  ? deleters.schedule
                  : r.kind === 'process deployment'
                    ? deleters.deployment
                    : deleters.importInstance;
        const request = deleter ? deleter(r.id) : of({ status: 500 });
        return request.pipe(map((resp) => (resp.status >= 400 && resp.status !== 404 ? r : null)));
    });
    if (deletes.length === 0) {
        return of([]);
    }
    return forkJoin(deletes).pipe(map((results) => results.filter((r): r is GeneratedResource => r !== null)));
}

/** Adds the export ids to an import instance, once each. */
export function withExport(r: GeneratedResource, ...exportIds: string[]): GeneratedResource {
    const ids = [...new Set([...(r.exportIds ?? []), ...exportIds].filter((id) => !!id))];
    return ids.length === 0 ? r : { ...r, exportIds: ids };
}

function uniqueResources(resources: GeneratedResource[]): GeneratedResource[] {
    const unique = new Map<string, GeneratedResource>();
    resources.filter((r) => !!r.id).forEach((r) => unique.set(resourceKey(r), withExport(r, ...(unique.get(resourceKey(r))?.exportIds ?? []))));
    return [...unique.values()];
}

/**
 * Persists the resources a widget dialog may leave behind, so that a later clean-up can delete what no stored widget
 * references. Implemented by GeneratedResourceJanitor.
 */
export interface GeneratedResourceLog {
    /** Logs the resources as pending clean-up and answers whether that was stored. */
    add(resources: GeneratedResource[]): boolean;
    /** The resources were deleted, or saved properties reference them. */
    remove(resources: GeneratedResource[]): void;
    touch(): void;
    /** The dialog is gone; its entries may be settled once they are old enough. */
    release(): void;
    /** Whether the resource is logged as pending clean-up for the current user, by any widget. */
    isPending(kind: GeneratedResourceKind, id: string): boolean;
    /** Adds the export to every pending entry of the import instance for the current user; creates no entry. */
    link(importInstanceId: string, exportId: string): void;
}

export const NO_LOG: GeneratedResourceLog = {
    add: () => false,
    remove: () => undefined,
    touch: () => undefined,
    release: () => undefined,
    isPending: () => false,
    link: () => undefined,
};

export interface UnsavedResourceHandlers {
    /** Deletes the resources and answers those whose delete failed. */
    delete: (resources: GeneratedResource[]) => Observable<GeneratedResource[]>;
    /** `failed`: deletes that were tried; `unconfirmed`: not deleted, see possiblyStored; `logged`: a later clean-up takes over. */
    reportNotDeleted: (failed: GeneratedResource[], unconfirmed: GeneratedResource[], logged: boolean) => void;
}

/**
 * Resources one widget dialog created in save attempts that have not ended in saved widget properties. They are
 * cleaned up when the dialog closes, but never while an attempt runs, because that attempt may still save them.
 */
export class UnsavedGeneratedResources {
    private created: GeneratedResource[] = [];
    private attemptRunning = false;
    private closed = false;
    // sent by a property update that did not answer OK: after a timeout the write can still land, even after a later one
    private unconfirmed = new Map<string, GeneratedResource>();
    private log: GeneratedResourceLog = NO_LOG;

    constructor(private readonly handlers: UnsavedResourceHandlers) {}

    logTo(log: GeneratedResourceLog): void {
        this.log = log;
    }

    startAttempt(): void {
        this.attemptRunning = true;
    }

    record(resource: GeneratedResource): void {
        this.created.push(resource);
        this.log.add([resource]);
        if (this.closed && !this.attemptRunning) {
            this.flush();
        }
    }

    /**
     * The property update answered OK: what was created so far becomes a clean-up candidate of that save, except what
     * an unconfirmed update sent, which stays listed and is never deleted.
     */
    takeForSave(): GeneratedResource[] {
        const taken = this.created.filter((r) => !this.unconfirmed.has(resourceKey(r)));
        this.created = this.created.filter((r) => this.unconfirmed.has(resourceKey(r)));
        return taken;
    }

    /** The export reads from the import instance; the link travels with the instance into the log. */
    link(importInstanceId: string, exportId: string): void {
        this.created = this.created.map((r) => (r.kind === 'import instance' && r.id === importInstanceId ? withExport(r, exportId) : r));
        this.log.link(importInstanceId, exportId);
    }

    /** Everything a property update without OK sent; a clean-up must treat it as still used. */
    possiblyStored(): GeneratedResource[] {
        return [...this.unconfirmed.values()];
    }

    /** `previous`: the resources of the state stored before; they are orphans if the update was stored after all. */
    propertiesNotSaved(sent: GeneratedResource[], previous: GeneratedResource[] = []): void {
        sent.forEach((r) => this.unconfirmed.set(resourceKey(r), r));
        this.log.add(previous);
    }

    /** The property update answered OK; what it sent is in use. */
    propertiesSaved(sent: GeneratedResource[]): void {
        this.log.remove(sent);
    }

    /**
     * Logs every candidate (once per kind and id) that `stillUsed` does not contain and deletes the deployments and
     * schedules among them at once; the janitor deletes the logged exports and import instances once no widget of any
     * dashboard uses them. When nothing can be logged, all are deleted at once. Answers the failed deletes.
     */
    releaseUnused(candidates: GeneratedResource[], stillUsed: GeneratedResource[]): Observable<{ failed: GeneratedResource[]; retried: boolean }> {
        const skip = new Set(stillUsed.map(resourceKey));
        const unused = uniqueResources(candidates.filter((r) => !skip.has(resourceKey(r))));
        if (unused.length === 0) {
            return of({ failed: [], retried: false });
        }
        return defer(() => {
            // logged before the requests, so a closed tab does not lose a deployment or schedule
            const retried = this.log.add(unused);
            const deletable = retried ? unused.filter((r) => !isAdoptable(r)) : unused;
            return this.deleteAndLog(deletable).pipe(map((failed) => ({ failed, retried })));
        });
    }

    endAttempt(): void {
        this.attemptRunning = false;
        this.log.touch();
        if (this.closed) {
            this.flush();
        }
    }

    close(): void {
        this.closed = true;
        this.log.touch();
        if (!this.attemptRunning) {
            this.flush();
        }
    }

    private deleteAndLog(resources: GeneratedResource[]): Observable<GeneratedResource[]> {
        if (resources.length === 0) {
            return of([]);
        }
        return this.handlers.delete(resources).pipe(
            catchError(() => of(resources)),
            tap((failed) => {
                const failedKeys = new Set(failed.map(resourceKey));
                this.log.remove(resources.filter((r) => !failedKeys.has(resourceKey(r))));
            }),
        );
    }

    private flush(): void {
        const kept = this.created.filter((r) => this.unconfirmed.has(resourceKey(r)));
        const deletable = this.created.filter((r) => !this.unconfirmed.has(resourceKey(r)));
        this.created = [];
        if (kept.length === 0 && deletable.length === 0) {
            this.log.release();
            return;
        }
        // another tab's dialog may have adopted the logged exports and import instances meanwhile, so the janitor checks first
        const logged = this.log.add([...deletable, ...kept]);
        const toDelete = logged ? deletable.filter((r) => !isAdoptable(r)) : deletable;
        const named = logged ? kept.filter((r) => !isAdoptable(r)) : kept;
        this.deleteAndLog(toDelete).subscribe((failed) => {
            if (failed.length + named.length > 0) {
                this.handlers.reportNotDeleted(failed, named, logged);
            }
            this.log.release();
        });
    }
}
