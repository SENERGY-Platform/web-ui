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

import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type GeneratedResourceKind = 'export' | 'process deployment' | 'schedule' | 'import instance';

/** A resource a widget dialog generated, with the element it belongs to for messages. */
export interface GeneratedResource {
    kind: GeneratedResourceKind;
    id: string;
    label: string;
}

/** A kind without a deleter cannot be deleted; its resources count as failed deletes. */
export interface GeneratedResourceDeleters {
    export?: (id: string) => Observable<{ status: number }>;
    deployment?: (id: string) => Observable<{ status: number }>;
    schedule?: (id: string) => Observable<{ status: number }>;
    importInstance?: (id: string) => Observable<{ status: number }>;
}

const resourceKey = (r: GeneratedResource) => r.kind + '|' + r.id;

export function describeGeneratedResource(r: GeneratedResource): string {
    return r.kind + ' of ' + r.label;
}

/**
 * Deletes every candidate (once per kind and id) that `stillUsed` does not contain and answers the descriptions of
 * the deletes that failed. Status 404 counts as done: the resource is already gone.
 */
export function deleteGeneratedResources(
    candidates: GeneratedResource[],
    stillUsed: GeneratedResource[],
    deleters: GeneratedResourceDeleters,
): Observable<string[]> {
    const skip = new Set(stillUsed.map(resourceKey));
    return deleteResources(
        candidates.filter((r) => !skip.has(resourceKey(r))),
        deleters,
    ).pipe(map((failed) => failed.map(describeGeneratedResource)));
}

/** Deletes every resource once per kind and id and answers those whose delete failed; status 404 counts as done. */
export function deleteResources(resources: GeneratedResource[], deleters: GeneratedResourceDeleters): Observable<GeneratedResource[]> {
    const unique = new Map<string, GeneratedResource>();
    resources.filter((r) => !!r.id).forEach((r) => unique.set(resourceKey(r), r));
    const deletes = [...unique.values()].map((r) => {
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

export interface UnsavedResourceHandlers {
    /** Deletes the resources and answers those whose delete failed. */
    delete: (resources: GeneratedResource[]) => Observable<GeneratedResource[]>;
    reportNotDeleted: (notDeleted: GeneratedResource[]) => void;
}

/**
 * Resources one widget dialog created in save attempts that have not ended in saved widget properties. They are
 * deleted when the dialog closes, but never while an attempt runs, because that attempt may still save them.
 */
export class UnsavedGeneratedResources {
    private created: GeneratedResource[] = [];
    private attemptRunning = false;
    private closed = false;
    // sent by a property update that did not answer OK: after a timeout the write can still land, even after a later one
    private unconfirmed = new Map<string, GeneratedResource>();

    constructor(private readonly handlers: UnsavedResourceHandlers) {}

    startAttempt(): void {
        this.attemptRunning = true;
    }

    record(resource: GeneratedResource): void {
        this.created.push(resource);
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

    /** Everything a property update without OK sent; a clean-up must treat it as still used. */
    possiblyStored(): GeneratedResource[] {
        return [...this.unconfirmed.values()];
    }

    propertiesNotSaved(sent: GeneratedResource[]): void {
        sent.forEach((r) => this.unconfirmed.set(resourceKey(r), r));
    }

    endAttempt(): void {
        this.attemptRunning = false;
        if (this.closed) {
            this.flush();
        }
    }

    close(): void {
        this.closed = true;
        if (!this.attemptRunning) {
            this.flush();
        }
    }

    private flush(): void {
        const kept = this.created.filter((r) => this.unconfirmed.has(resourceKey(r)));
        const deletable = this.created.filter((r) => !this.unconfirmed.has(resourceKey(r)));
        this.created = [];
        if (kept.length === 0 && deletable.length === 0) {
            return;
        }
        this.handlers
            .delete(deletable)
            .pipe(catchError(() => of(deletable)))
            .subscribe((failed) => {
                if (failed.length + kept.length > 0) {
                    this.handlers.reportNotDeleted([...failed, ...kept]);
                }
            });
    }
}
