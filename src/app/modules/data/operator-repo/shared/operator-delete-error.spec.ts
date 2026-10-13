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
 *  limitations under the License.
 */

import {HttpErrorResponse} from '@angular/common/http';
import {OperatorModel} from './operator.model';
import {deleteErrorMessage, describeUsage} from './operator-delete-error';

const operators = [{_id: 'a', name: 'Alpha'}, {_id: 'b', name: 'Beta'}] as OperatorModel[];

describe('deleteErrorMessage', () => {
    it('names the flows and pipelines that use a single operator, with the readable names', () => {
        const message = deleteErrorMessage(new HttpErrorResponse({
            status: 409,
            error: {error: 'in use', flows: 2, readable: [{id: 'f1', name: 'Flow 1'}], pipelines: 1, readable_pipelines: [{id: 'p1', name: 'Pipe 1'}]},
        }), [operators[0]]);
        expect(message).toBe('Operator "Alpha" is in use by 2 flows (Flow 1) and 1 pipeline (Pipe 1), it was not deleted');
    });

    it('omits what does not use the operator', () => {
        expect(describeUsage({flows: 0, pipelines: 3})).toBe('3 pipelines');
        expect(describeUsage({flows: 1, pipelines: 0, readable: []})).toBe('1 flow');
    });

    it('lists every operator of a batch by name, falling back to the id', () => {
        const message = deleteErrorMessage(new HttpErrorResponse({
            status: 409,
            error: {error: 'in use', operators: [
                {id: 'a', flows: 1, readable: [{id: 'f1', name: 'Flow 1'}], pipelines: 0},
                {id: 'zzz', flows: 0, pipelines: 2},
            ]},
        }), operators);
        expect(message).toBe('Operators in use, nothing was deleted: Alpha: 1 flow (Flow 1); zzz: 2 pipelines');
    });

    it('reads a 409 body that arrived as text', () => {
        const message = deleteErrorMessage(new HttpErrorResponse({status: 409, error: JSON.stringify({error: 'x', flows: 1, pipelines: 0})}), [operators[0]]);
        expect(message).toContain('1 flow');
    });

    it('says that nothing was deleted when a usage service is down', () => {
        expect(deleteErrorMessage(new HttpErrorResponse({status: 502, error: 'bad gateway'}), operators))
            .toBe('Could not check whether the operator is in use, nothing was deleted');
    });

    it('uses the generic text for any other error', () => {
        for (const status of [403, 404, 500, 0]) {
            expect(deleteErrorMessage(new HttpErrorResponse({status}), operators)).toBe('Could not delete operator');
        }
    });
});
