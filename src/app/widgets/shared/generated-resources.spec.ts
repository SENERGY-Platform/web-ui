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

import { of } from 'rxjs';
import { deleteGeneratedResources, deleteResources, GeneratedResource, UnsavedGeneratedResources } from './generated-resources';

describe('deleteGeneratedResources', () => {
    const exp = (id: string, label = 'a'): GeneratedResource => ({ kind: 'export', id, label });
    const dep = (id: string, label = 'a'): GeneratedResource => ({ kind: 'process deployment', id, label });

    function deleters(status: (id: string) => number) {
        const calls: string[] = [];
        const make = (kind: string) => (id: string) => {
            calls.push(kind + ':' + id);
            return of({ status: status(id) });
        };
        return { calls, api: { export: make('export'), deployment: make('deployment'), schedule: make('schedule') } };
    }

    it('deletes every candidate once, however often it is listed', (done) => {
        const d = deleters(() => 204);
        deleteGeneratedResources([exp('e1'), exp('e1', 'b'), dep('e1')], [], d.api).subscribe((failed) => {
            expect(d.calls).toEqual(['export:e1', 'deployment:e1']);
            expect(failed).toEqual([]);
            done();
        });
    });

    it('skips what is still used, by kind and id', (done) => {
        const d = deleters(() => 204);
        deleteGeneratedResources([exp('e1'), dep('e1'), exp('e2')], [exp('e1')], d.api).subscribe(() => {
            expect(d.calls).toEqual(['deployment:e1', 'export:e2']);
            done();
        });
    });

    it('takes a 404 for done and names the other failures', (done) => {
        const d = deleters((id) => (id === 'gone' ? 404 : id === 'bad' ? 500 : 204));
        deleteGeneratedResources([exp('gone'), exp('bad', 'living room'), dep('ok')], [], d.api).subscribe((failed) => {
            expect(failed).toEqual(['export of living room']);
            done();
        });
    });

    it('answers an empty list without a request when nothing is left', (done) => {
        const d = deleters(() => 204);
        deleteGeneratedResources([exp('e1')], [exp('e1')], d.api).subscribe((failed) => {
            expect(d.calls).toEqual([]);
            expect(failed).toEqual([]);
            done();
        });
    });
});

describe('deleteResources', () => {
    const res = (kind: GeneratedResource['kind'], id: string): GeneratedResource => ({ kind, id, label: 'a' });

    it('uses the deleter of each kind and takes a kind without one for a failed delete', (done) => {
        const calls: string[] = [];
        const ok = (name: string) => (id: string) => {
            calls.push(name + ':' + id);
            return of({ status: 200 });
        };
        deleteResources(
            [res('import instance', 'i1'), res('export', 'e1'), res('schedule', 's1'), res('process deployment', 'd1')],
            { importInstance: ok('instance'), export: ok('export') },
        ).subscribe((failed) => {
            expect(calls).toEqual(['instance:i1', 'export:e1']);
            expect(failed.map((r) => r.id)).toEqual(['s1', 'd1']);
            done();
        });
    });
});

describe('UnsavedGeneratedResources', () => {
    const exp = (id: string): GeneratedResource => ({ kind: 'export', id, label: 'a' });
    let deleted: string[];
    let failing: Set<string>;
    let reported: GeneratedResource[][];
    let unsaved: UnsavedGeneratedResources;

    beforeEach(() => {
        deleted = [];
        failing = new Set();
        reported = [];
        unsaved = new UnsavedGeneratedResources({
            delete: (resources) => {
                deleted.push(...resources.map((r) => r.id));
                return of(resources.filter((r) => failing.has(r.id)));
            },
            reportNotDeleted: (notDeleted) => reported.push(notDeleted),
        });
    });

    it('deletes what was recorded when it is closed outside an attempt and reports what failed', () => {
        failing.add('e2');
        unsaved.record(exp('e1'));
        unsaved.record(exp('e2'));

        unsaved.close();

        expect(deleted).toEqual(['e1', 'e2']);
        expect(reported).toEqual([[exp('e2')]]);
    });

    it('waits for a running attempt before it deletes on close', () => {
        unsaved.startAttempt();
        unsaved.record(exp('e1'));
        unsaved.close();
        unsaved.record(exp('e2'));
        expect(deleted).toEqual([]);

        unsaved.endAttempt();

        expect(deleted).toEqual(['e1', 'e2']);
    });

    it('hands everything recorded over to a save and deletes nothing of it on close', () => {
        unsaved.startAttempt();
        unsaved.record(exp('e1'));
        expect(unsaved.takeForSave()).toEqual([exp('e1')]);
        unsaved.endAttempt();

        unsaved.close();

        expect(deleted).toEqual([]);
    });

    it('deletes a resource recorded after it was closed at once', () => {
        unsaved.close();

        unsaved.record(exp('late'));

        expect(deleted).toEqual(['late']);
    });

    it('keeps and names on close what a property update without OK sent, and deletes the rest', () => {
        unsaved.record(exp('sent'));
        unsaved.propertiesNotSaved([exp('sent'), exp('old')]);
        unsaved.record(exp('later'));

        unsaved.close();

        expect(deleted).toEqual(['later']);
        expect(reported).toEqual([[exp('sent')]]);
    });

    it('does not hand what a property update without OK sent over to a later save and lists it as possibly stored', () => {
        unsaved.record(exp('sent'));
        unsaved.propertiesNotSaved([exp('sent'), exp('old')]);
        unsaved.record(exp('retry'));

        expect(unsaved.takeForSave()).toEqual([exp('retry')]);
        expect(unsaved.possiblyStored()).toEqual([exp('sent'), exp('old')]);

        unsaved.close();
        expect(deleted).toEqual([]);
        expect(reported).toEqual([[exp('sent')]]);
    });
});
