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

import { of, throwError } from 'rxjs';
import {
    DELETE_RETRY_NOTE,
    deleteResources,
    GeneratedResource,
    GeneratedResourceLog,
    NO_LOG,
    UnsavedGeneratedResources,
    unsavedNotice,
} from './generated-resources';

describe('UnsavedGeneratedResources.releaseUnused without a log', () => {
    const exp = (id: string, label = 'a'): GeneratedResource => ({ kind: 'export', id, label });
    const dep = (id: string, label = 'a'): GeneratedResource => ({ kind: 'process deployment', id, label });

    function tracker(status: (id: string) => number) {
        const calls: string[] = [];
        const make = (kind: string) => (id: string) => {
            calls.push(kind + ':' + id);
            return of({ status: status(id) });
        };
        const api = { export: make('export'), deployment: make('deployment'), schedule: make('schedule') };
        const unsaved = new UnsavedGeneratedResources({ delete: (r) => deleteResources(r, api), reportNotDeleted: () => undefined });
        return { calls, unsaved };
    }

    it('deletes every candidate once, however often it is listed', (done) => {
        const t = tracker(() => 204);
        t.unsaved.releaseUnused([exp('e1'), exp('e1', 'b'), dep('e1')], []).subscribe(({ failed, retried }) => {
            expect(t.calls).toEqual(['export:e1', 'deployment:e1']);
            expect(failed).toEqual([]);
            expect(retried).toBeFalse();
            done();
        });
    });

    it('skips what is still used, by kind and id', (done) => {
        const t = tracker(() => 204);
        t.unsaved.releaseUnused([exp('e1'), dep('e1'), exp('e2')], [exp('e1')]).subscribe(() => {
            expect(t.calls).toEqual(['deployment:e1', 'export:e2']);
            done();
        });
    });

    it('takes a 404 for done and answers the other failures', (done) => {
        const t = tracker((id) => (id === 'gone' ? 404 : id === 'bad' ? 500 : 204));
        t.unsaved.releaseUnused([exp('gone'), exp('bad', 'living room'), dep('ok')], []).subscribe(({ failed, retried }) => {
            expect(failed).toEqual([exp('bad', 'living room')]);
            expect(retried).toBeFalse();
            done();
        });
    });

    it('answers an empty list without a request when nothing is left', (done) => {
        const t = tracker(() => 204);
        t.unsaved.releaseUnused([exp('e1')], [exp('e1')]).subscribe(({ failed, retried }) => {
            expect(t.calls).toEqual([]);
            expect(failed).toEqual([]);
            expect(retried).toBeFalse();
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

describe('UnsavedGeneratedResources without a log', () => {
    const exp = (id: string): GeneratedResource => ({ kind: 'export', id, label: 'a' });
    let deleted: string[];
    let failing: Set<string>;
    let reported: { failed: GeneratedResource[]; unconfirmed: GeneratedResource[] }[];
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
            reportNotDeleted: (failed, unconfirmed) => reported.push({ failed, unconfirmed }),
        });
    });

    it('deletes what was recorded when it is closed outside an attempt and reports what failed', () => {
        failing.add('e2');
        unsaved.record(exp('e1'));
        unsaved.record(exp('e2'));

        unsaved.close();

        expect(deleted).toEqual(['e1', 'e2']);
        expect(reported).toEqual([{ failed: [exp('e2')], unconfirmed: [] }]);
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
        expect(reported).toEqual([{ failed: [], unconfirmed: [exp('sent')] }]);
    });

    it('does not hand what a property update without OK sent over to a later save and lists it as possibly stored', () => {
        unsaved.record(exp('sent'));
        unsaved.propertiesNotSaved([exp('sent'), exp('old')]);
        unsaved.record(exp('retry'));

        expect(unsaved.takeForSave()).toEqual([exp('retry')]);
        expect(unsaved.possiblyStored()).toEqual([exp('sent'), exp('old')]);

        unsaved.close();
        expect(deleted).toEqual([]);
        expect(reported).toEqual([{ failed: [], unconfirmed: [exp('sent')] }]);
    });
});

describe('UnsavedGeneratedResources with a log', () => {
    const exp = (id: string): GeneratedResource => ({ kind: 'export', id, label: 'a' });
    const ins = (id: string): GeneratedResource => ({ kind: 'import instance', id, label: 'a' });
    const dep = (id: string): GeneratedResource => ({ kind: 'process deployment', id, label: 'a' });
    const sch = (id: string): GeneratedResource => ({ kind: 'schedule', id, label: 'a' });
    let calls: string[];
    let stored: boolean;
    let failing: Set<string>;
    let reported: { failed: string[]; unconfirmed: string[]; logged: boolean }[];
    let added: GeneratedResource[][];
    let unsaved: UnsavedGeneratedResources;

    const ids = (resources: GeneratedResource[]) => resources.map((r) => r.id).join(',');

    beforeEach(() => {
        calls = [];
        stored = true;
        failing = new Set();
        reported = [];
        added = [];
        const log: GeneratedResourceLog = {
            add: (resources) => {
                calls.push('add ' + ids(resources));
                added.push(resources);
                return stored;
            },
            remove: (resources) => calls.push('remove ' + ids(resources)),
            touch: () => calls.push('touch'),
            release: () => calls.push('release'),
            isPending: () => false,
            link: (instanceId, exportId) => calls.push('link ' + instanceId + ' ' + exportId),
        };
        unsaved = new UnsavedGeneratedResources({
            delete: (resources) => {
                calls.push('delete ' + ids(resources));
                return of(resources.filter((r) => failing.has(r.id)));
            },
            reportNotDeleted: (failed, unconfirmed, logged) => reported.push({ failed: failed.map((r) => r.id), unconfirmed: unconfirmed.map((r) => r.id), logged }),
        });
        unsaved.logTo(log);
    });

    it('logs what an attempt creates and refreshes the log when the attempt ends', () => {
        unsaved.startAttempt();
        unsaved.record(exp('e1'));
        unsaved.endAttempt();

        expect(calls).toEqual(['add e1', 'touch']);
    });

    it('on close hands what was recorded to the log and deletes and reports nothing', () => {
        unsaved.record(exp('e1'));
        unsaved.record(exp('e2'));
        calls = [];

        unsaved.close();

        expect(calls).toEqual(['touch', 'add e1,e2', 'release']);
        expect(reported).toEqual([]);
    });

    it('on close hands what a property update without OK sent to the log too', () => {
        unsaved.record(exp('sent'));
        unsaved.propertiesNotSaved([exp('sent')]);
        unsaved.record(exp('later'));
        calls = [];

        unsaved.close();

        expect(calls).toEqual(['touch', 'add later,sent', 'release']);
        expect(reported).toEqual([]);
    });

    it('on close deletes the deployments and schedules at once, keeps a failed one logged and names it as retried', () => {
        failing.add('d2');
        unsaved.record(exp('e1'));
        unsaved.record(dep('d1'));
        unsaved.record(sch('s1'));
        unsaved.record(ins('i1'));
        unsaved.record(dep('d2'));
        calls = [];

        unsaved.close();

        expect(calls).toEqual(['touch', 'add e1,d1,s1,i1,d2', 'delete d1,s1,d2', 'remove d1,s1', 'release']);
        expect(reported).toEqual([{ failed: ['d2'], unconfirmed: [], logged: true }]);
    });

    it('on close keeps and names a deployment or schedule a property update without OK sent, logged for a later clean-up', () => {
        unsaved.record(dep('sent'));
        unsaved.record(exp('sentExport'));
        unsaved.propertiesNotSaved([dep('sent'), exp('sentExport')]);
        unsaved.record(sch('later'));
        calls = [];

        unsaved.close();

        expect(calls).toEqual(['touch', 'add later,sent,sentExport', 'delete later', 'remove later', 'release']);
        expect(reported).toEqual([{ failed: [], unconfirmed: ['sent'], logged: true }]);
    });

    it('on close reports a failed delete apart from what a property update without OK sent', () => {
        failing.add('d1');
        unsaved.record(dep('d1'));
        unsaved.record(dep('sent'));
        unsaved.propertiesNotSaved([dep('sent')]);

        unsaved.close();

        expect(reported).toEqual([{ failed: ['d1'], unconfirmed: ['sent'], logged: true }]);
    });

    it('carries an export linked to a recorded import instance into the log, and forwards the link', () => {
        unsaved.record(ins('i1'));
        unsaved.link('i1', 'x1');
        unsaved.link('i1', 'x1');
        unsaved.link('i2', 'x2');
        added = [];

        unsaved.close();

        expect(calls.filter((c) => c.startsWith('link'))).toEqual(['link i1 x1', 'link i1 x1', 'link i2 x2']);
        expect(added).toEqual([[{ ...ins('i1'), exportIds: ['x1'] }]]);
    });

    it('merges the linked exports of an import instance listed twice among the clean-up candidates', (done) => {
        unsaved.releaseUnused([{ ...ins('i1'), exportIds: ['x1'] }, { ...ins('i1'), exportIds: ['x2'] }, ins('i1')], []).subscribe(() => {
            expect(added).toEqual([[{ ...ins('i1'), exportIds: ['x2', 'x1'] }]]);
            done();
        });
    });

    it('deletes a deployment recorded after the close at once', () => {
        unsaved.close();
        calls = [];

        unsaved.record(dep('late'));

        expect(calls).toEqual(['add late', 'add late', 'delete late', 'remove late', 'release']);
    });

    it('hands a resource recorded after the close to the log', () => {
        unsaved.close();
        calls = [];

        unsaved.record(exp('late'));

        expect(calls).toEqual(['add late', 'add late', 'release']);
    });

    it('deletes at once on close and reports a failed delete when the log cannot store the resources', () => {
        stored = false;
        failing.add('e2');
        unsaved.record(exp('e1'));
        unsaved.record(exp('e2'));
        calls = [];

        unsaved.close();

        expect(calls).toEqual(['touch', 'add e1,e2', 'delete e1,e2', 'remove e1', 'release']);
        expect(reported).toEqual([{ failed: ['e2'], unconfirmed: [], logged: false }]);
    });

    it('reports everything as not deleted when the delete request errors and the log cannot store it', () => {
        unsaved = new UnsavedGeneratedResources({
            delete: () => throwError(() => new Error('offline')),
            reportNotDeleted: (failed, unconfirmed, logged) => reported.push({ failed: failed.map((r) => r.id), unconfirmed: unconfirmed.map((r) => r.id), logged }),
        });
        const removed: string[] = [];
        unsaved.logTo({ ...NO_LOG, remove: (r) => removed.push(...r.map((x) => x.id)) });
        unsaved.record(exp('e1'));

        unsaved.close();

        expect(removed).toEqual([]);
        expect(reported).toEqual([{ failed: ['e1'], unconfirmed: [], logged: false }]);
    });

    it('releases the log only after a running attempt has ended', () => {
        unsaved.startAttempt();
        unsaved.close();
        expect(calls).toEqual(['touch']);

        unsaved.endAttempt();

        expect(calls).toEqual(['touch', 'touch', 'release']);
    });

    it('logs the state stored before when a property update did not answer OK', () => {
        unsaved.propertiesNotSaved([exp('sent')], [exp('old1'), exp('old2')]);

        expect(calls).toEqual(['add old1,old2']);
    });

    it('drops what an OK property update sent from the log', () => {
        unsaved.propertiesSaved([exp('sent')]);

        expect(calls).toEqual(['remove sent']);
    });

    it('hands the exports and import instances among the clean-up candidates of a save to the log and deletes nothing', (done) => {
        unsaved.releaseUnused([exp('old1'), ins('old2'), exp('used'), exp('old1')], [exp('used')]).subscribe(({ failed }) => {
            expect(calls).toEqual(['add old1,old2']);
            expect(failed).toEqual([]);
            done();
        });
    });

    it('logs the deployments and schedules among the clean-up candidates of a save, deletes them at once and keeps the failed ones', (done) => {
        failing.add('d2');
        unsaved.releaseUnused([exp('old1'), dep('d1'), sch('s1'), dep('d2'), dep('used')], [dep('used')]).subscribe(({ failed, retried }) => {
            expect(calls).toEqual(['add old1,d1,s1,d2', 'delete d1,s1,d2', 'remove d1,s1']);
            expect(failed).toEqual([dep('d2')]);
            expect(retried).toBeTrue();
            done();
        });
    });

    it('deletes the clean-up candidates of a save at once when the log cannot store them and answers the failed ones', (done) => {
        stored = false;
        failing.add('old2');
        unsaved.releaseUnused([exp('old1'), exp('old2'), exp('used')], [exp('used')]).subscribe(({ failed, retried }) => {
            expect(calls).toEqual(['add old1,old2', 'delete old1,old2', 'remove old1']);
            expect(failed).toEqual([exp('old2')]);
            expect(retried).toBeFalse();
            done();
        });
    });

    it('does not touch the log before the clean-up is subscribed', () => {
        unsaved.releaseUnused([exp('old1')], []);

        expect(calls).toEqual([]);
    });
});


describe('unsavedNotice', () => {
    const dep = (label: string): GeneratedResource => ({ kind: 'process deployment', id: label, label });

    it('claims a failed delete only for the resources whose delete failed', () => {
        expect(unsavedNotice([dep('a')], [], true)).toBe('Could not delete the process deployment of a generated for the unsaved changes' + DELETE_RETRY_NOTE);
        expect(unsavedNotice([dep('a')], [], false)).toBe('Could not delete the process deployment of a generated for the unsaved changes');
    });

    it('names what a property update without OK sent as kept, not as a failed delete', () => {
        expect(unsavedNotice([], [dep('b')], true)).toBe(
            'Kept the process deployment of b generated for the unsaved changes, since a save without confirmation may use it. ' +
                'A later clean-up deletes it if no widget does',
        );
        expect(unsavedNotice([], [dep('b'), dep('c')], false)).toBe(
            'Kept the process deployment of b, process deployment of c generated for the unsaved changes, since a save without confirmation may use them',
        );
    });

    it('names both in one notice, with the given description', () => {
        expect(unsavedNotice([dep('a')], [dep('b')], false, (r) => r.kind + ' for ' + r.label)).toBe(
            'Could not delete the process deployment for a generated for the unsaved changes. ' +
                'Kept the process deployment for b generated for the unsaved changes, since a save without confirmation may use it',
        );
    });
});
