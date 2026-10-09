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
import { deleteGeneratedResources, GeneratedResource } from './generated-resources';

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
