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

import { Injectable, InjectionToken, Injector, NgZone, OnDestroy, inject } from '@angular/core';
import { defer, EMPTY, of } from 'rxjs';
import { catchError, finalize, map, mergeMap } from 'rxjs/operators';
import { AuthorizationService } from '../../core/services/authorization.service';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../modules/exports/shared/export.service';
import { ImportInstancesService } from '../../modules/imports/import-instances/shared/import-instances.service';
import { AutomationEngineService } from '../../core/services/automation-engine.service';
import {
    deleteResources,
    describeGeneratedResource,
    GeneratedResource,
    GeneratedResourceDeleters,
    GeneratedResourceKind,
    GeneratedResourceLog,
    NO_LOG,
    resourceKey,
    withExport,
} from './generated-resources';

/** The storage of the pending list; null when the browser denies it, which turns the janitor off. */
export const GENERATED_RESOURCE_STORAGE = new InjectionToken<Storage | null>('GeneratedResourceStorage', {
    providedIn: 'root',
    factory: () => {
        try {
            return window.localStorage;
        } catch {
            return null;
        }
    },
});

export const PENDING_GENERATED_RESOURCES_KEY = 'pendingGeneratedResources';
/** Entries touched more recently may belong to a dialog open in another tab, whose heartbeat stops while it is frozen. */
export const SETTLE_AFTER_MS = 24 * 60 * 60 * 1000;
export const HEARTBEAT_MS = 60 * 1000;
/** Prefix of the per-tab liveness markers of open widget dialogs; the value is the epoch ms of the last write. */
export const TAB_MARKER_PREFIX = 'widgetDialogTab:';
/** A marker not rewritten for this long belongs to a closed, crashed or frozen tab and is ignored. */
export const TAB_MARKER_TTL_MS = 3 * 60 * 1000;
/** A move of a widget is two dashboard updates, so an entry is deleted only when two reads this far apart miss it. */
export const DELETE_AFTER_UNREFERENCED_MS = 10 * 60 * 1000;

/** A generated resource a widget dialog may have left behind; entries written before carry an unused widgetType. */
export interface PendingGeneratedResource {
    userId: string;
    dashboardId: string;
    widgetId: string;
    resource: GeneratedResource;
    /** Epoch ms; wall clock, because other tabs compare it. */
    touched: number;
    /** Epoch ms of the settle that first found no widget referencing the resource; cleared when the entry is touched. */
    unreferencedSince?: number;
}

const KINDS: GeneratedResourceKind[] = ['export', 'process deployment', 'schedule', 'import instance'];

/** The stored form of a resource: links only on import instances. */
const storedForm = (r: GeneratedResource): GeneratedResource => {
    const base: GeneratedResource = { kind: r.kind, id: r.id, label: r.label };
    return r.kind === 'import instance' ? withExport(base, ...(r.exportIds ?? [])) : base;
};

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v !== '';

function isPendingEntry(v: unknown): v is PendingGeneratedResource {
    const e = v as PendingGeneratedResource;
    return (
        typeof v === 'object' &&
        v !== null &&
        nonEmpty(e.userId) &&
        nonEmpty(e.dashboardId) &&
        nonEmpty(e.widgetId) &&
        typeof e.resource === 'object' &&
        e.resource !== null &&
        KINDS.includes(e.resource.kind) &&
        nonEmpty(e.resource.id) &&
        typeof e.resource.label === 'string' &&
        (e.resource.exportIds === undefined || (Array.isArray(e.resource.exportIds) && e.resource.exportIds.every(nonEmpty))) &&
        Number.isFinite(e.touched)
    );
}

const widgetKey = (e: { userId: string; dashboardId: string; widgetId: string }) => JSON.stringify([e.userId, e.dashboardId, e.widgetId]);
const entryKey = (e: PendingGeneratedResource) => JSON.stringify([e.userId, e.dashboardId, e.widgetId, e.resource.kind, e.resource.id]);

/** A missing, malformed or future mark counts as unmarked. */
const markedAt = (e: PendingGeneratedResource, now: number): number | undefined =>
    Number.isFinite(e.unreferencedSince) && (e.unreferencedSince as number) <= now ? e.unreferencedSince : undefined;

/** An entry's own id, and for an import instance the exports logged as linked to it. */
const referenceIds = (e: PendingGeneratedResource): string[] => [e.resource.id, ...(e.resource.exportIds ?? [])];

function refreshed(e: PendingGeneratedResource, now: number): PendingGeneratedResource {
    const copy = { ...e, touched: now };
    delete copy.unreferencedSince;
    return copy;
}

function newTabId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/**
 * Every string key and value in the properties of all widgets, joined; undefined unless the answer is a dashboard list.
 * A failed read answers null; an empty list means no widget references anything.
 */
function widgetPropertyText(dashboards: unknown): string | undefined {
    if (!Array.isArray(dashboards)) {
        return undefined;
    }
    const strings: string[] = [];
    for (const dashboard of dashboards) {
        if (!isObject(dashboard)) {
            return undefined;
        }
        const widgets = dashboard['widgets'];
        if (widgets !== null && !Array.isArray(widgets)) {
            return undefined;
        }
        for (const widget of widgets ?? []) {
            if (!isObject(widget)) {
                return undefined;
            }
            const stack: unknown[] = [widget['properties']];
            while (stack.length > 0) {
                const v = stack.pop();
                if (typeof v === 'string') {
                    strings.push(v);
                } else if (Array.isArray(v)) {
                    v.forEach((item) => stack.push(item));
                } else if (isObject(v)) {
                    Object.entries(v).forEach(([key, value]) => {
                        strings.push(key);
                        stack.push(value);
                    });
                }
            }
        }
    }
    return strings.join('\n');
}

/** Export ids by the filter they read from; undefined unless the answer is a complete export list. */
function exportsByFilter(answer: unknown): Map<string, string[]> | undefined {
    if (!isObject(answer) || Array.isArray(answer)) {
        return undefined;
    }
    // the export service omits empty fields, so a user without exports gets {}
    const instances = answer['instances'] ?? [];
    const total = answer['total'] ?? 0;
    if (!Array.isArray(instances) || typeof total !== 'number' || !(instances.length >= total)) {
        return undefined;
    }
    const byFilter = new Map<string, string[]>();
    for (const e of instances) {
        if (!isObject(e)) {
            return undefined;
        }
        const [filter, id] = [e['Filter'], e['ID']];
        if (nonEmpty(filter)) {
            if (!nonEmpty(id)) {
                return undefined;
            }
            byFilter.set(filter, [...(byFilter.get(filter) ?? []), id]);
        }
    }
    return byFilter;
}

/**
 * Keeps a persistent list of generated resources that widget dialogs may have left behind and deletes those no stored
 * widget of the user references at two settles, run at app start and after each dialog close. When in doubt an entry is kept.
 */
@Injectable({
    providedIn: 'root',
})
export class GeneratedResourceJanitor implements OnDestroy {
    private storage = inject(GENERATED_RESOURCE_STORAGE);
    // resolved on use: without an auth client (tests rendering a widget dialog) the janitor stays off
    private injector = inject(Injector);
    private dashboardService = inject(DashboardService);
    private exportService = inject(ExportService);
    private automationEngineService = inject(AutomationEngineService);
    private importInstancesService = inject(ImportInstancesService);
    private ngZone = inject(NgZone);

    private live = new Set<JanitorSession>();
    private heartbeat?: ReturnType<typeof setInterval>;
    private readonly markerKey = TAB_MARKER_PREFIX + newTabId();
    private readonly onPageHide = () => this.removeMarker();
    // a page restored from the back/forward cache may still show a dialog
    private readonly onPageShow = () => {
        if (this.live.size > 0) {
            this.writeMarker();
        }
    };
    private settling = false;
    private settleAgain = false;

    private readonly deleters: GeneratedResourceDeleters = {
        export: (id) => this.exportService.stopPipelineByIdIfExists(id, true),
        // the engine serves the ids of deployments and schedules created before its switch unchanged
        deployment: (id) => this.automationEngineService.deleteDeploymentIfExists(id, true),
        schedule: (id) => this.automationEngineService.deleteScheduleIfExists(id, true),
        importInstance: (id) =>
            this.importInstancesService.deleteImportInstance(id).pipe(
                map(() => ({ status: 200 })),
                catchError((err: unknown) => of({ status: (err as { status?: number })?.status === 404 ? 404 : 500 })),
            ),
    };

    /** Called once the user is logged in: settles old entries and keeps the entries of open dialogs fresh for other tabs. */
    start(): void {
        if (this.heartbeat === undefined) {
            this.ngZone.runOutsideAngular(() => {
                this.heartbeat = setInterval(() => {
                    if (this.live.size > 0) {
                        this.live.forEach((s) => s.touch());
                        this.writeMarker();
                    }
                }, HEARTBEAT_MS);
                window.addEventListener('pagehide', this.onPageHide);
                window.addEventListener('pageshow', this.onPageShow);
            });
        }
        this.settle();
    }

    ngOnDestroy(): void {
        if (this.heartbeat !== undefined) {
            clearInterval(this.heartbeat);
            window.removeEventListener('pagehide', this.onPageHide);
            window.removeEventListener('pageshow', this.onPageShow);
        }
        this.removeMarker();
    }

    /** The log of one dialog of the given widget; it counts as open until it is released. */
    session(dashboardId: string, widgetId: string): GeneratedResourceLog {
        const userId = this.userId();
        if (userId === undefined) {
            return NO_LOG;
        }
        const session = new JanitorSession(
            { userId, dashboardId, widgetId },
            () => this.read(),
            (change) => this.update(change),
            (released) => {
                this.live.delete(released);
                if (this.live.size === 0) {
                    this.removeMarker();
                }
                this.settle();
            },
        );
        this.live.add(session);
        this.writeMarker();
        session.touch();
        return session;
    }

    /**
     * For the current user's entries old enough, while no dialog is open in any tab: drops the referenced ones, marks the
     * unreferenced ones and deletes those already marked at least DELETE_AFTER_UNREFERENCED_MS ago.
     */
    settle(): void {
        if (this.settling) {
            this.settleAgain = true;
            return;
        }
        const userId = this.userId();
        const entries = userId === undefined ? undefined : this.read();
        if (userId === undefined || entries === undefined) {
            return;
        }
        const now = Date.now();
        const due = entries.filter((e) => this.isDue(e, userId, now));
        if (due.length === 0 || this.otherTabBusy(now)) {
            return;
        }
        this.settling = true;
        const loadDashboards = () =>
            defer(() => this.dashboardService.getDashboards({ quiet: true, bypassCache: true })).pipe(map((dashboards) => widgetPropertyText(dashboards)));
        // containment rather than equality, so an id embedded in a longer string still counts
        const mentionedIn = (text: string) => (ids: string[]) => ids.some((id) => text.includes(id));
        loadDashboards()
            .pipe(
                mergeMap((first) => {
                    if (first === undefined) {
                        return EMPTY;
                    }
                    // the logged links miss exports a dialog did not know of, so an import instance is only released by the live list
                    const needsExports = due.some((e) => e.resource.kind === 'import instance' && !mentionedIn(first)(referenceIds(e)));
                    if (!needsExports) {
                        return of({ mentioned: mentionedIn(first), readers: undefined as Map<string, string[]> | undefined });
                    }
                    // a widget saved while the export list loaded is only in a later read, which then decides alone
                    return defer(() => this.exportService.getAllExportsQuietly()).pipe(
                        map((answer) => exportsByFilter(answer)),
                        mergeMap((readers) =>
                            loadDashboards().pipe(mergeMap((text) => (text === undefined ? EMPTY : of({ mentioned: mentionedIn(text), readers })))),
                        ),
                    );
                }),
                mergeMap(({ mentioned, readers }) => {
                    const at = Date.now();
                    // re-check: a dialog may have opened elsewhere, or another tab refreshed or settled an entry meanwhile
                    if (this.otherTabBusy(at)) {
                        return EMPTY;
                    }
                    const current = this.stillDue(due, userId, at);
                    const isInstance = (e: PendingGeneratedResource) => e.resource.kind === 'import instance';
                    const referenced = (e: PendingGeneratedResource) =>
                        mentioned(referenceIds(e)) || (isInstance(e) && readers !== undefined && mentioned(readers.get(e.resource.id) ?? []));
                    this.removeUnchanged(current.filter(referenced));
                    // without the live export list an unreferenced import instance is neither marked nor deleted
                    const unreferenced = current.filter((e) => !referenced(e) && (!isInstance(e) || readers !== undefined));
                    this.markUnchanged(
                        unreferenced.filter((e) => markedAt(e, at) === undefined),
                        at,
                    );
                    const ripe = unreferenced.filter((e) => at - (markedAt(e, at) ?? at) >= DELETE_AFTER_UNREFERENCED_MS);
                    if (ripe.length === 0) {
                        return EMPTY;
                    }
                    return deleteResources(
                        ripe.map((e) => e.resource),
                        this.deleters,
                    ).pipe(
                        map((failed) => {
                            const failedKeys = new Set(failed.map(resourceKey));
                            this.removeUnchanged(ripe.filter((e) => !failedKeys.has(resourceKey(e.resource))));
                            if (failed.length > 0) {
                                console.warn('GeneratedResourceJanitor: could not delete the ' + failed.map(describeGeneratedResource).join(', ') + ', retried later');
                            }
                        }),
                    );
                }),
                catchError((err: unknown) => {
                    console.warn('GeneratedResourceJanitor: clean-up failed', err);
                    return EMPTY;
                }),
                finalize(() => {
                    this.settling = false;
                    if (this.settleAgain) {
                        this.settleAgain = false;
                        this.settle();
                    }
                }),
            )
            .subscribe();
    }

    /** Nothing is due while a dialog is open here: it may have picked up another widget's generated resource. */
    private isDue(e: PendingGeneratedResource, userId: string, now: number): boolean {
        return e.userId === userId && now - e.touched >= SETTLE_AFTER_MS && this.live.size === 0;
    }

    /** The stored versions of the entries that are still due and were not touched meanwhile. */
    private stillDue(group: PendingGeneratedResource[], userId: string, now: number): PendingGeneratedResource[] {
        const stored = new Map((this.read() || []).map((e) => [entryKey(e), e]));
        return group.flatMap((e) => {
            const current = stored.get(entryKey(e));
            return current !== undefined && current.touched === e.touched && this.isDue(current, userId, now) ? [current] : [];
        });
    }

    /** Marks the entries as unreferenced since now unless they were touched or validly marked meanwhile. */
    private markUnchanged(entries: PendingGeneratedResource[], now: number): void {
        if (entries.length === 0) {
            return;
        }
        const seen = new Map(entries.map((e) => [entryKey(e), e.touched]));
        this.update((stored) =>
            stored.map((e) => (seen.get(entryKey(e)) === e.touched && markedAt(e, now) === undefined ? { ...e, unreferencedSince: now } : e)),
        );
    }

    /** True while another tab has a widget dialog open, or when that cannot be told; removes stale markers. */
    private otherTabBusy(now: number): boolean {
        const storage = this.storage;
        if (storage === null) {
            return true;
        }
        const markers: [string, string][] = [];
        try {
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                const value = key === null ? null : storage.getItem(key);
                if (key !== null && value !== null && key.startsWith(TAB_MARKER_PREFIX) && key !== this.markerKey) {
                    markers.push([key, value]);
                }
            }
        } catch {
            return true;
        }
        let busy = false;
        markers.forEach(([key, value]) => {
            const at = Number(value);
            // a marker from the future counts as stale too, so a clock set back cannot block settling
            if (value.trim() !== '' && Number.isFinite(at) && Math.abs(now - at) < TAB_MARKER_TTL_MS) {
                busy = true;
                return;
            }
            try {
                // its tab may have woken up and rewritten it since it was read
                if (storage.getItem(key) === value) {
                    storage.removeItem(key);
                }
            } catch {
                // best effort; a stale marker is ignored anyway
            }
        });
        return busy;
    }

    private writeMarker(): void {
        try {
            this.storage?.setItem(this.markerKey, String(Date.now()));
        } catch {
            // best effort, like the entries themselves
        }
    }

    private removeMarker(): void {
        try {
            this.storage?.removeItem(this.markerKey);
        } catch {
            // best effort; the marker goes stale on its own
        }
    }

    /** Removes the entries unless another dialog refreshed them meanwhile. */
    private removeUnchanged(entries: PendingGeneratedResource[]): void {
        if (entries.length === 0) {
            return;
        }
        const seen = new Map(entries.map((e) => [entryKey(e), e.touched]));
        this.update((stored) => stored.filter((e) => seen.get(entryKey(e)) !== e.touched));
    }

    private userId(): string | undefined {
        try {
            const id = this.injector.get(AuthorizationService).getUserId();
            return nonEmpty(id) ? id : undefined;
        } catch {
            return undefined;
        }
    }

    /** undefined when the storage cannot be read; unreadable content counts as an empty list. */
    private read(): PendingGeneratedResource[] | undefined {
        if (this.storage === null) {
            return undefined;
        }
        let raw: string | null;
        try {
            raw = this.storage.getItem(PENDING_GENERATED_RESOURCES_KEY);
        } catch {
            return undefined;
        }
        if (raw === null) {
            return [];
        }
        try {
            const parsed: unknown = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter(isPendingEntry) : [];
        } catch {
            return [];
        }
    }

    /** Read-modify-write of the list; answers whether the result is stored. */
    private update(change: (entries: PendingGeneratedResource[]) => PendingGeneratedResource[]): boolean {
        const entries = this.read();
        if (entries === undefined || this.storage === null) {
            return false;
        }
        try {
            const changed = change(entries);
            if (changed.length === 0) {
                this.storage.removeItem(PENDING_GENERATED_RESOURCES_KEY);
            } else {
                this.storage.setItem(PENDING_GENERATED_RESOURCES_KEY, JSON.stringify(changed));
            }
            return true;
        } catch {
            return false;
        }
    }
}

interface WidgetRef {
    userId: string;
    dashboardId: string;
    widgetId: string;
}

/** The entries of one dialog: everything logged for its user, dashboard and widget. */
class JanitorSession implements GeneratedResourceLog {
    private released = false;

    constructor(
        private readonly widget: WidgetRef,
        private readonly read: () => PendingGeneratedResource[] | undefined,
        private readonly update: (change: (entries: PendingGeneratedResource[]) => PendingGeneratedResource[]) => boolean,
        private readonly onRelease: (session: JanitorSession) => void,
    ) {}

    owns(e: PendingGeneratedResource): boolean {
        return widgetKey(e) === widgetKey(this.widget);
    }

    add(resources: GeneratedResource[]): boolean {
        const now = Date.now();
        const added = resources.filter((r) => !!r.id).map((r): PendingGeneratedResource => ({ ...this.widget, resource: storedForm(r), touched: now }));
        return this.update((entries) => {
            const byKey = new Map(entries.map((e) => [entryKey(e), e]));
            // a re-added import instance keeps the exports linked to it before
            added.forEach((e) =>
                byKey.set(entryKey(e), { ...e, resource: withExport(e.resource, ...(byKey.get(entryKey(e))?.resource.exportIds ?? [])) }),
            );
            return [...byKey.values()].map((e) => (this.owns(e) ? refreshed(e, now) : e));
        });
    }

    isPending(kind: GeneratedResourceKind, id: string): boolean {
        return (this.read() ?? []).some((e) => e.userId === this.widget.userId && e.resource.kind === kind && e.resource.id === id);
    }

    link(importInstanceId: string, exportId: string): void {
        if (!nonEmpty(importInstanceId) || !nonEmpty(exportId)) {
            return;
        }
        const linked = (e: PendingGeneratedResource) =>
            e.userId === this.widget.userId &&
            e.resource.kind === 'import instance' &&
            e.resource.id === importInstanceId &&
            !(e.resource.exportIds ?? []).includes(exportId);
        if (!(this.read() ?? []).some(linked)) {
            return;
        }
        // a mark taken without the link no longer counts
        this.update((entries) =>
            entries.map((e) => {
                if (!linked(e)) {
                    return e;
                }
                const copy = { ...e, resource: withExport(e.resource, exportId) };
                delete copy.unreferencedSince;
                return copy;
            }),
        );
    }

    remove(resources: GeneratedResource[]): void {
        const keys = new Set(resources.map(resourceKey));
        if (keys.size > 0) {
            this.update((entries) => entries.filter((e) => !(this.owns(e) && keys.has(resourceKey(e.resource)))));
        }
    }

    touch(): void {
        const now = Date.now();
        this.update((entries) => entries.map((e) => (this.owns(e) ? refreshed(e, now) : e)));
    }

    release(): void {
        if (!this.released) {
            this.released = true;
            this.onRelease(this);
        }
    }
}
