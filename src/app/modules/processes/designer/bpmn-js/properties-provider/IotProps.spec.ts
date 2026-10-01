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

import { msgevent } from './IotProps';

const air = { id: 'urn:infai:ses:aspect:air' };
const water = { id: 'urn:infai:ses:aspect:water' };
const measuring = { id: 'urn:infai:ses:measuring-function:temperature' };

// payload and task name are covered with the writers in ../model/process-writers.spec.ts
describe('IotProps conditional event', () => {
    const eventElement = (attributes: { [key: string]: string }) => ({
        businessObject: { get: (name: string) => attributes[name] },
    });

    /** Runs the entries msgevent adds, opening the dialog with `reply` as its result. */
    const openDialog = (attributes: { [key: string]: string }, reply?: any) => {
        const group = { entries: [] as any[] };
        const opened: any[] = [];
        const bpmnjs = {
            designerCallbacks: {
                editConditionalEvent: (model: any, callback: (result: any) => void) => {
                    opened.push(model);
                    if (reply) {
                        callback(reply);
                    }
                },
            },
        };
        const modeling = { updateProperties: jasmine.createSpy('updateProperties') };
        const eventBus = { fire: () => {} };
        const element = eventElement(attributes);
        msgevent(group, element, bpmnjs, eventBus, modeling);
        const button = group.entries.find((entry) => entry.id === 'iot-conditional-event-button');
        button.editConditionalEvent(element, null);
        return { group, opened, modeling };
    };

    const reply = (aspect: string, aspects: string[]) => ({
        aspect,
        aspects,
        iotfunction: measuring.id,
        characteristic: 'urn:infai:ses:characteristic:celsius',
        script: 'value > 20',
        valueVariableName: 'value',
        variables: '',
        qos: '0',
        label: 'Get Temperature Celsius\nvalue > 20',
    });

    it('shows the aspect list next to the single aspect in the properties panel', () => {
        const { group } = openDialog({});
        const ids = group.entries.map((entry: any) => entry.id);
        expect(ids.indexOf('aspects-field')).toBe(ids.indexOf('aspect-field') + 1);
    });

    it('passes the list attribute into the dialog', () => {
        const { opened } = openDialog({ 'senergy:aspects': `${air.id},${water.id}`, 'senergy:aspect': air.id });
        expect(opened[0].aspects).toEqual([air.id, water.id]);
        expect(opened[0].aspect).toBe(air.id);
    });

    it('passes an element written before the list into the dialog as a list of its single aspect', () => {
        const { opened } = openDialog({ 'senergy:aspect': air.id });
        expect(opened[0].aspects).toEqual([air.id]);
    });

    it('writes the sorted list and its alias', () => {
        const { modeling } = openDialog({}, reply(air.id, [water.id, air.id]));
        const update = modeling.updateProperties.calls.mostRecent().args[1];
        expect(update['senergy:aspects']).toBe(`${air.id},${water.id}`);
        expect(update['senergy:aspect']).toBe(air.id);
        expect(update['senergy:function']).toBe(measuring.id);
        expect(update.name).toBe('Get Temperature Celsius\nvalue > 20');
    });

    it('writes a single aspect in both attributes', () => {
        const { modeling } = openDialog({}, reply(air.id, [air.id]));
        const update = modeling.updateProperties.calls.mostRecent().args[1];
        expect(update['senergy:aspects']).toBe(air.id);
        expect(update['senergy:aspect']).toBe(air.id);
    });

    it('removes both attributes for an empty selection', () => {
        const { modeling } = openDialog({ 'senergy:aspects': air.id, 'senergy:aspect': air.id }, reply('', []));
        const update = modeling.updateProperties.calls.mostRecent().args[1];
        expect('senergy:aspects' in update).toBe(true);
        expect('senergy:aspect' in update).toBe(true);
        expect(update['senergy:aspects']).toBeUndefined();
        expect(update['senergy:aspect']).toBeUndefined();
    });
});
