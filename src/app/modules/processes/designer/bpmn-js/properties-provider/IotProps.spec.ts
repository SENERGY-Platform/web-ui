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

import { getDeviceTypeServiceFromServiceElement, getPayload, getTaskName, msgevent } from './IotProps';

const air = { id: 'urn:infai:ses:aspect:air', name: 'Air', root_id: 'urn:infai:ses:aspect:air', parent_id: '', child_ids: [], ancestor_ids: [], descendent_ids: [] };
const water = { id: 'urn:infai:ses:aspect:water', name: 'Water', root_id: 'urn:infai:ses:aspect:water', parent_id: '', child_ids: [], ancestor_ids: [], descendent_ids: [] };
const measuring = { id: 'urn:infai:ses:measuring-function:temperature', name: 'Get Temperature', rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction' };
const controlling = { id: 'urn:infai:ses:controlling-function:on', name: 'Set On', rdf_type: 'https://senergy.infai.org/ontology/ControllingFunction' };
const deviceClass = { id: 'urn:infai:ses:device-class:lamp', name: 'Lamp' };

const connectorInfo = (overrides: any) => ({
    function: measuring,
    device_class: null,
    aspect: null,
    aspects: [],
    characteristic: { id: 'urn:infai:ses:characteristic:celsius' },
    completionStrategy: 'pessimistic',
    retries: 0,
    prefer_events: false,
    ...overrides,
});

const serviceElement = (payload: any, topic = 'pessimistic') => ({
    businessObject: {
        get: (name: string) => (name === 'camunda:topic' ? topic : undefined),
        extensionElements: { values: [{ inputParameters: [{ name: 'payload', value: JSON.stringify(payload) }] }] },
    },
});

describe('IotProps task payload', () => {
    it('writes aspect null and no aspects for a task without an aspect, as before the list', () => {
        const payload = JSON.parse(getPayload(connectorInfo({ function: controlling, device_class: deviceClass }), false));
        expect(payload.aspect).toBeNull();
        expect('aspects' in payload).toBe(false);
        expect(payload.device_class).toEqual(deviceClass);
    });

    it('writes a single aspect in both fields', () => {
        const payload = JSON.parse(getPayload(connectorInfo({ aspect: air, aspects: [air] }), false));
        expect(payload.aspect).toEqual(air);
        expect(payload.aspects).toEqual([air]);
    });

    it('writes the aspects sorted by id and the first of them as the deprecated aspect', () => {
        const payload = JSON.parse(getPayload(connectorInfo({ aspect: water, aspects: [water, air] }), false));
        expect(payload.aspect).toEqual(air);
        expect(payload.aspects).toEqual([air, water]);
    });

    it('writes the same text for the same selection in any order', () => {
        expect(getPayload(connectorInfo({ aspect: air, aspects: [water, air] }), false)).toBe(
            getPayload(connectorInfo({ aspect: air, aspects: [air, water] }), false),
        );
    });

    it('keeps the payload fields around the aspects unchanged', () => {
        const payload = JSON.parse(getPayload(connectorInfo({ aspect: air, aspects: [air], retries: 3, prefer_events: true }), false));
        expect(Object.keys(payload)).toEqual([
            'version', 'function', 'device_class', 'aspect', 'aspects', 'label', 'input', 'characteristic_id', 'retries', 'prefer_event',
        ]);
        expect(payload.label).toBe(measuring.name);
        expect(payload.retries).toBe(3);
        expect(payload.prefer_event).toBe(true);
    });

    it('reads the aspects of a payload back into the selection', () => {
        const selection: any = getDeviceTypeServiceFromServiceElement(serviceElement({ function: measuring, device_class: null, aspect: air, aspects: [air, water] }));
        expect(selection.aspect).toEqual(air);
        expect(selection.aspects).toEqual([air, water]);
        expect(selection.completionStrategy).toBe('pessimistic');
    });

    it('reads a payload written before the list as a list of its single aspect', () => {
        const selection: any = getDeviceTypeServiceFromServiceElement(serviceElement({ function: measuring, device_class: null, aspect: air }));
        expect(selection.aspect).toEqual(air);
        expect(selection.aspects).toEqual([air]);
    });

    it('reads no aspects for a controlling task', () => {
        const selection: any = getDeviceTypeServiceFromServiceElement(
            serviceElement({ function: controlling, device_class: deviceClass, aspect: null }, 'optimistic'),
        );
        expect(selection.aspects).toEqual([]);
    });
});

describe('IotProps task name', () => {
    it('names the device class of a controlling task', () => {
        expect(getTaskName(connectorInfo({ function: controlling, device_class: deviceClass }), 'Task')).toBe('Lamp Set On');
    });

    it('names a single aspect as before', () => {
        expect(getTaskName(connectorInfo({ aspect: air, aspects: [air] }), 'Task')).toBe('Air Get Temperature');
    });

    it('names every aspect of a list', () => {
        expect(getTaskName(connectorInfo({ aspect: air, aspects: [water, air] }), 'Task')).toBe('Air, Water Get Temperature');
    });

    it('keeps the current name when neither is set', () => {
        expect(getTaskName(connectorInfo({}), 'Task')).toBe('Task Get Temperature');
    });
});

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
