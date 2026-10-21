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

import { doneEventVariable, messageNameExpression, waitsForDoneEvent } from './done-event';

describe('smart service done event', () => {
    const catchEvent = (attrs: Record<string, unknown>, messageRefName?: string) => ({
        $type: 'bpmn:IntermediateCatchEvent',
        $attrs: attrs,
        eventDefinitions: [{ $type: 'bpmn:MessageEventDefinition', messageRef: messageRefName === undefined ? undefined : { name: messageRefName } }],
    });

    it('names the variable after the task', () => {
        expect(doneEventVariable('Task_1')).toBe('Task_1_done_event');
    });

    it('recognizes a wait by senergy:messageName', () => {
        expect(waitsForDoneEvent(catchEvent({ 'senergy:messageName': 'Task_1_done_event' }), 'Task_1')).toBeTrue();
        expect(waitsForDoneEvent(catchEvent({ 'senergy:messageName': ' Task_1_done_event ' }), 'Task_1')).toBeTrue();
        expect(waitsForDoneEvent(catchEvent({ 'senergy:messageName': 'Task_2_done_event' }), 'Task_1')).toBeFalse();
    });

    it('recognizes a wait of the Camunda time by ${...} message name', () => {
        expect(waitsForDoneEvent(catchEvent({}, '${Task_1_done_event}'), 'Task_1')).toBeTrue();
        expect(waitsForDoneEvent(catchEvent({}, 'Task_1_done_event'), 'Task_1')).toBeFalse();
    });

    it('lets senergy:messageName win over the message reference, as the engine does', () => {
        expect(waitsForDoneEvent(catchEvent({ 'senergy:messageName': 'other' }, '${Task_1_done_event}'), 'Task_1')).toBeFalse();
    });

    it('ignores other elements', () => {
        expect(waitsForDoneEvent(null, 'Task_1')).toBeFalse();
        expect(waitsForDoneEvent({ ...catchEvent({ 'senergy:messageName': 'Task_1_done_event' }), $type: 'bpmn:StartEvent' }, 'Task_1')).toBeFalse();
        expect(
            waitsForDoneEvent(
                { $type: 'bpmn:IntermediateCatchEvent', $attrs: { 'senergy:messageName': 'Task_1_done_event' }, eventDefinitions: [{ $type: 'bpmn:TimerEventDefinition' }] },
                'Task_1',
            ),
        ).toBeFalse();
    });

    it('reads the expression through get when the object is a moddle element', () => {
        const bo = { get: (name: string) => (name === 'senergy:messageName' ? 'x' : undefined) };
        expect(messageNameExpression(bo)).toBe('x');
        expect(messageNameExpression({ $attrs: { 'senergy:messageName': '  ' } })).toBeUndefined();
    });
});
