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

import { external, getDeviceTypeServiceFromServiceElement, getPayload, getTaskName, msgevent } from './IotProps';

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

    it('reads no aspects for a controlling task without aspects', () => {
        const selection: any = getDeviceTypeServiceFromServiceElement(
            serviceElement({ function: controlling, device_class: deviceClass, aspect: null }, 'optimistic'),
        );
        expect(selection.aspects).toEqual([]);
    });
});

describe('IotProps task configured anew', () => {
    const celsius = { id: 'urn:infai:ses:characteristic:celsius', type: 'https://schema.org/Float' };
    const fahrenheit = { id: 'urn:infai:ses:characteristic:fahrenheit', type: 'https://schema.org/Float' };
    const setTemperature = { id: 'urn:infai:ses:controlling-function:set-temperature', name: 'Set Temperature', rdf_type: controlling.rdf_type };
    const controllingInfo = (aspects: any[], characteristic = celsius) =>
        connectorInfo({ function: setTemperature, aspect: aspects[0], aspects, characteristic, completionStrategy: 'optimistic' });
    const measuringInfo = (aspects: any[]) => connectorInfo({ aspect: aspects[0], aspects, characteristic: celsius });

    /** Runs the Select Function entry with `info` as the dialog result and returns the element that replaces `element`. */
    const configure = (element: any, info: any) => {
        const group = { entries: [] as any[] };
        let replaced: any;
        const bpmnjs = {
            get: () => ({ create: (type: string, attributes: any) => ({ $type: type, ...attributes }) }),
            designerCallbacks: { findIotDeviceType: (_: any, callback: (result: any) => void) => callback(info) },
        };
        const bpmnFactory = {
            create: () => {
                const businessObject: any = {};
                businessObject.get = (name: string) => (name === 'camunda:topic' ? businessObject.topic : undefined);
                return businessObject;
            },
        };
        const replace = { replaceElement: (_: any, newElement: any) => (replaced = newElement) };
        external(group, element, bpmnjs, { fire: () => {} }, bpmnFactory, replace, { select: () => {} });
        group.entries.find((entry) => entry.id === 'iot-extern-device-type-select-button').selectIotDeviceTypeForExtern(element, null);
        return replaced;
    };
    const io = (element: any) => element.businessObject.extensionElements.values[0];
    const task = { businessObject: { name: 'Task', get: () => undefined } };

    it('keeps the edited input values when the aspects change and the characteristic stays', () => {
        const before = configure(task, controllingInfo([air]));
        expect(io(before).inputParameters[1].value).toBe('0');
        io(before).inputParameters[1].value = '${target}';
        const after = configure(before, controllingInfo([air, water]));
        expect(io(after).inputParameters.map((p: any) => p.name)).toEqual(['payload', 'inputs']);
        expect(io(after).inputParameters[1].value).toBe('${target}');
        expect(JSON.parse(io(after).inputParameters[0].value).aspects).toEqual([air, water]);
    });

    it('writes the default input values for another characteristic', () => {
        const before = configure(task, controllingInfo([air]));
        io(before).inputParameters[1].value = '21';
        const after = configure(before, controllingInfo([air], fahrenheit));
        expect(io(after).inputParameters[1].value).toBe('0');
        expect(JSON.parse(io(after).inputParameters[0].value).characteristic_id).toBe(fahrenheit.id);
    });

    it('keeps the renamed output variables when the aspects change and the characteristic stays', () => {
        const before = configure(task, measuringInfo([air]));
        expect(io(before).outputParameters.map((p: any) => [p.name, p.value])).toEqual([
            ['outputs', '${result}'],
            ['outputs_results', '${results}'],
        ]);
        io(before).outputParameters[0].name = 'temperature';
        io(before).outputParameters[1].name = 'readings';
        const after = configure(before, measuringInfo([water]));
        expect(io(after).outputParameters.map((p: any) => [p.name, p.value])).toEqual([
            ['temperature', '${result}'],
            ['readings', '${results}'],
        ]);
        expect(JSON.parse(io(after).inputParameters[0].value).aspects).toEqual([water]);
    });

    it('maps the device, service and value of every answer of a measuring task to outputs_results', () => {
        const outputs = io(configure(task, measuringInfo([air]))).outputParameters;
        expect(outputs.find((p: any) => p.value === '${results}')?.name).toBe('outputs_results');
    });

    it('maps no results for a controlling task, which reads nothing', () => {
        expect(io(configure(task, controllingInfo([air]))).outputParameters).toEqual([]);
    });
});

describe('IotProps task name', () => {
    it('names the device class of a controlling task', () => {
        expect(getTaskName(connectorInfo({ function: controlling, device_class: deviceClass }), 'Task')).toBe('Lamp Set On');
    });

    it('names device class and aspects of a controlling task', () => {
        expect(getTaskName(connectorInfo({ function: controlling, device_class: deviceClass, aspect: air, aspects: [air] }), 'Task')).toBe(
            'Lamp Air Set On',
        );
    });

    it('names the aspects of a controlling task without device class', () => {
        expect(getTaskName(connectorInfo({ function: controlling, aspect: air, aspects: [air] }), 'Task')).toBe('Air Set On');
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
