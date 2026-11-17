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

import {
    additionalFunctionNameError,
    additionalFunctionsOfElement,
    AdditionalFunctionModel,
    parseAdditionalFunctions,
    serializeAdditionalFunctions,
} from './additional-functions';

const air = { id: 'urn:infai:ses:aspect:air', name: 'Air', root_id: 'urn:infai:ses:aspect:air', parent_id: '', child_ids: [], ancestor_ids: [], descendent_ids: [] };
const water = { id: 'urn:infai:ses:aspect:water', name: 'Water', root_id: 'urn:infai:ses:aspect:water', parent_id: '', child_ids: [], ancestor_ids: [], descendent_ids: [] };
const transition = { id: 'urn:infai:ses:controlling-function:transition', name: 'Set Transition', rdf_type: 'https://senergy.infai.org/ontology/ControllingFunction', concept_id: 'urn:infai:ses:concept:time' };
const rgb = { id: 'urn:infai:ses:characteristic:rgb', name: 'rgb', type: 'https://schema.org/StructuredValue', sub_characteristics: [] };

/** A BPMN XML string with one service task; the payload is written the way the process designer writes it. */
function diagram(taskId: string, payload: object | null): string {
    const escaped = JSON.stringify(payload).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const extension = payload
        ? `<bpmn:extensionElements><camunda:inputOutput><camunda:inputParameter name="payload">${escaped}</camunda:inputParameter></camunda:inputOutput></bpmn:extensionElements>`
        : '';
    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:serviceTask id="${taskId}" name="Lamp">${extension}</bpmn:serviceTask>
  </bpmn:process>
</bpmn:definitions>`;
}

describe('additional functions: names', () => {
    it('rejects an empty name, blanks included', () => {
        expect(additionalFunctionNameError('', [])).toBe('empty');
        expect(additionalFunctionNameError('   ', [])).toBe('empty');
    });

    it('rejects a dot and a colon', () => {
        expect(additionalFunctionNameError('transition.speed', [])).toBe('characters');
        expect(additionalFunctionNameError('inputs:transition', [])).toBe('characters');
    });

    it('rejects a name another function of the task has, blanks aside', () => {
        expect(additionalFunctionNameError('transition', ['brightness', 'transition'])).toBe('duplicate');
        expect(additionalFunctionNameError('transition', [' transition '])).toBe('duplicate');
    });

    it('accepts a unique name', () => {
        expect(additionalFunctionNameError('transition', ['brightness'])).toBeNull();
    });
});

describe('additional functions: payload', () => {
    it('reads the entries of a payload, leaving out one without a name or a function', () => {
        const entries = parseAdditionalFunctions({
            additional_functions: [
                { name: 'transition', function: transition, characteristic_id: rgb.id, aspects: [water, air], input: {} },
                { function: transition },
                { name: 'broken', function: 'x' },
            ],
        });
        expect(entries).toEqual([{ name: 'transition', function: transition, characteristic_id: rgb.id, aspects: [air, water] }]);
    });

    it('reads no entries from a payload without the key', () => {
        expect(parseAdditionalFunctions({ function: transition })).toEqual([]);
        expect(parseAdditionalFunctions(null)).toEqual([]);
    });

    it('writes each entry with its name, function, characteristic, aspects and default input, in this order', () => {
        const written = serializeAdditionalFunctions(
            [{ name: ' transition ', function: transition, characteristic: rgb, aspects: [water, air], characteristic_id: rgb.id } as unknown as AdditionalFunctionModel],
            (characteristic) => ({ id: characteristic.id }),
        );
        expect(written).toEqual([
            {
                name: 'transition',
                function: transition,
                characteristic_id: rgb.id,
                aspects: [air, water],
                input: { id: rgb.id },
            },
        ]);
        expect(Object.keys(written[0])).toEqual(['name', 'function', 'characteristic_id', 'aspects', 'input']);
    });

    describe('of an element in a diagram', () => {
        it('finds the entries of the task with the given id', () => {
            const xml = diagram('Task_1', {
                function: transition,
                additional_functions: [{ name: 'transition', function: transition, characteristic_id: rgb.id, aspects: [air], input: {} }],
            });
            expect(additionalFunctionsOfElement(xml, 'Task_1')).toEqual([
                { name: 'transition', function: transition, characteristic_id: rgb.id, aspects: [air] },
            ]);
        });

        it('finds an empty list for a task whose payload has no additional functions', () => {
            expect(additionalFunctionsOfElement(diagram('Task_1', { function: transition }), 'Task_1')).toEqual([]);
        });

        it('finds no payload, and so no answer, for a task without one or an unknown id', () => {
            expect(additionalFunctionsOfElement(diagram('Task_1', null), 'Task_1')).toBeUndefined();
            expect(additionalFunctionsOfElement(diagram('Task_1', { function: transition }), 'Task_2')).toBeUndefined();
            expect(additionalFunctionsOfElement('', 'Task_1')).toBeUndefined();
        });

        it('reads a payload with characters that XML escapes', () => {
            const aspect = { ...air, name: 'Air & <Water>' };
            const xml = diagram('Task_1', { additional_functions: [{ name: 'transition', function: transition, characteristic_id: rgb.id, aspects: [aspect] }] });
            expect(additionalFunctionsOfElement(xml, 'Task_1')?.[0].aspects).toEqual([aspect]);
        });
    });
});
