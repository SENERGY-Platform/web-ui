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
import { map } from 'rxjs/operators';

export type GeneratedResourceKind = 'export' | 'process deployment' | 'schedule';

/** A resource a widget dialog generated, with the element it belongs to for messages. */
export interface GeneratedResource {
    kind: GeneratedResourceKind;
    id: string;
    label: string;
}

export interface GeneratedResourceDeleters {
    export: (id: string) => Observable<{ status: number }>;
    deployment: (id: string) => Observable<{ status: number }>;
    schedule: (id: string) => Observable<{ status: number }>;
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
    const key = (r: GeneratedResource) => r.kind + '|' + r.id;
    const skip = new Set(stillUsed.map(key));
    const unique = new Map<string, GeneratedResource>();
    candidates.filter((r) => !!r.id && !skip.has(key(r))).forEach((r) => unique.set(key(r), r));
    const deletes = [...unique.values()].map((r) => {
        const request = r.kind === 'export' ? deleters.export(r.id) : r.kind === 'schedule' ? deleters.schedule(r.id) : deleters.deployment(r.id);
        return request.pipe(map((resp) => (resp.status >= 400 && resp.status !== 404 ? r.kind + ' of ' + r.label : null)));
    });
    if (deletes.length === 0) {
        return of([]);
    }
    return forkJoin(deletes).pipe(map((results) => results.filter((r): r is string => r !== null)));
}
