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

import { createProcessModeler } from '../bpmn-js';
import { modelServices, ModelServices } from './bpmn-elements';
import {
    getPayload,
    getTaskName,
    hasEditableInputs,
    hasOutputsForTopic,
    readConditionalEvent,
    readDeviceTask,
    readHistoricDataConfig,
    readIncident,
    readNotification,
    readProcessIo,
    readTimer,
    writeConditionalEvent,
    writeDeviceTask,
    writeHistoricDataConfig,
    writeIncident,
    writeNotification,
    writeProcessIo,
    writeTimer,
} from './process-writers';
import { defaultProcessIoDesignerConfig } from '../../../process-io/shared/process-io.model';
import { fetchText, importXml, mountModeler, MountedModeler, saveXml } from '../../../../../../testing/bpmn-modeler';
import { parseXml } from '../../../../../../testing/bpmn-xml-compare';

const air = { id: 'urn:infai:ses:aspect:air', name: 'Air', root_id: 'urn:infai:ses:aspect:air', parent_id: '', child_ids: [], ancestor_ids: [], descendent_ids: [] };
const water = { id: 'urn:infai:ses:aspect:water', name: 'Water', root_id: 'urn:infai:ses:aspect:water', parent_id: '', child_ids: [], ancestor_ids: [], descendent_ids: [] };
const measuring = { id: 'urn:infai:ses:measuring-function:temperature', name: 'Get Temperature', rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction' };
const controlling = { id: 'urn:infai:ses:controlling-function:on', name: 'Set On', rdf_type: 'https://senergy.infai.org/ontology/ControllingFunction' };
const deviceClass = { id: 'urn:infai:ses:device-class:lamp', name: 'Lamp' };
const integer = (name: string) => ({ id: 'urn:infai:ses:characteristic:' + name, name, type: 'https://schema.org/Integer' });
const rgb = { id: 'urn:infai:ses:characteristic:rgb', name: 'rgb', type: 'https://schema.org/StructuredValue', sub_characteristics: [integer('r'), integer('g'), integer('b')] };

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

describe('process writers: task payload', () => {
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
        const selection: any = readDeviceTask(serviceElement({ function: measuring, device_class: null, aspect: air, aspects: [air, water] }));
        expect(selection.aspect).toEqual(air);
        expect(selection.aspects).toEqual([air, water]);
        expect(selection.completionStrategy).toBe('pessimistic');
    });

    it('reads a payload written before the list as a list of its single aspect', () => {
        const selection: any = readDeviceTask(serviceElement({ function: measuring, device_class: null, aspect: air }));
        expect(selection.aspect).toEqual(air);
        expect(selection.aspects).toEqual([air]);
    });

    it('reads no aspects for a controlling task', () => {
        const selection: any = readDeviceTask(serviceElement({ function: controlling, device_class: deviceClass, aspect: null }, 'optimistic'));
        expect(selection.aspects).toEqual([]);
    });
});

describe('process writers: task name', () => {
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

describe('process writers on the process designer modeler', () => {
    let mounted: MountedModeler;
    let modeler: any;
    let services: ModelServices;

    beforeEach(async () => {
        mounted = mountModeler(createProcessModeler);
        modeler = mounted.modeler;
        expect(await importXml(modeler, await fetchText('/bpmn-fixtures/process/writers.bpmn'))).not.toContain(jasmine.stringMatching(/^unresolved/));
        services = modelServices(modeler);
    });

    afterEach(() => mounted.destroy());

    const element = (id: string) => modeler.get('elementRegistry').get(id);
    /** replaceTask selects the element it created. */
    const selected = () => modeler.get('selection').get()[0];
    const saved = async () => parseXml(await saveXml(modeler));
    const byId = (doc: Document, id: string) => Array.from(doc.getElementsByTagName('*')).find((el) => el.getAttribute('id') === id) as Element;
    const parameters = (el: Element, tag: string): Record<string, string> =>
        Object.fromEntries(Array.from(el.getElementsByTagName(tag)).map((p) => [p.getAttribute('name') || '', p.textContent || '']));

    describe('incident', () => {
        it('makes the task an optimistic external task with the incident message', async () => {
            writeIncident(services, element('Task_1'), { message: 'pump failed' });

            expect(selected().id).toBe('Task_1');
            const task = byId(await saved(), 'Task_1');
            expect(task.tagName).toBe('bpmn:serviceTask');
            expect(task.getAttribute('name')).toBe('Task');
            expect(task.getAttribute('camunda:type')).toBe('external');
            expect(task.getAttribute('camunda:topic')).toBe('optimistic');
            expect(parameters(task, 'camunda:inputParameter')).toEqual({ incident: 'pump failed' });
            expect(readIncident(selected())).toEqual({ message: 'pump failed' });
        });

        it('keeps the flows connected and can be undone', () => {
            writeIncident(services, element('Task_1'), { message: 'pump failed' });
            const replaced = selected();
            expect(replaced.incoming.map((flow: any) => flow.id)).toEqual(['Flow_1']);
            expect(replaced.outgoing.map((flow: any) => flow.id)).toEqual(['Flow_2']);

            modeler.get('commandStack').undo();

            expect(element(replaced.id)).toBeUndefined();
            expect(element('Task_1').businessObject.$type).toBe('bpmn:Task');
        });
    });

    describe('notification', () => {
        it('writes the http-connector with the payload the process-deployment parses', async () => {
            writeNotification(services, element('Task_1'), 'Alarm', 'too hot');

            const task = byId(await saved(), selected().id);
            expect(task.tagName).toBe('bpmn:serviceTask');
            expect(task.getAttribute('name')).toBe('send notification');
            expect(task.hasAttribute('camunda:type')).toBe(false);
            expect(task.getElementsByTagName('camunda:connectorId')[0].textContent).toBe('http-connector');
            const inputs = parameters(task, 'camunda:inputParameter');
            expect(JSON.parse(inputs['payload'])).toEqual({ message: 'too hot', title: 'Alarm' });
            expect(inputs['deploymentIdentifier']).toBe('notification');
        });

        it('prefills from the subject and text parameters of a connector', () => {
            expect(readNotification(element('Task_connector'))).toEqual({ subject: 'Hello', content: 'World' });
        });
    });

    describe('process io', () => {
        const config = defaultProcessIoDesignerConfig;

        it('writes set and get entries with their placeholders and reads them back', async () => {
            const infos = {
                set: [{ key: 'counter', instanceBound: true, definitionBound: true, value: '${counter}' }],
                get: [{ key: 'limit', instanceBound: false, definitionBound: true, outputVariableName: 'limit', defaultValue: '10' }],
            };
            writeProcessIo(services, element('Task_1'), config, infos);

            const task = byId(await saved(), selected().id);
            expect(task.getAttribute('camunda:topic')).toBe('process_io');
            expect(parameters(task, 'camunda:inputParameter')).toEqual({
                'io.write.{{DefinitionId}}_{{InstanceId}}_counter': '${counter}',
                'io.read.limit_local': '{{DefinitionId}}_limit',
                'io.default.{{DefinitionId}}_limit': '10',
            });
            expect(parameters(task, 'camunda:outputParameter')).toEqual({ limit: '${limit_local}' });
            expect(readProcessIo(config, selected())).toEqual(infos);
        });

        // the old reader shared one definitionBound variable across all inputs
        it('does not carry definition binding over from a previous entry', () => {
            writeProcessIo(services, element('Task_1'), config, {
                set: [{ key: 'counter', instanceBound: false, definitionBound: true, value: '1' }],
                get: [{ key: 'limit', instanceBound: true, definitionBound: false, outputVariableName: 'limit', defaultValue: 'null' }],
            });

            const read = readProcessIo(config, selected());
            expect(read.set[0].definitionBound).toBe(true);
            expect(read.get[0].definitionBound).toBe(false);
            expect(read.get[0].instanceBound).toBe(true);
        });

        it('reads nothing from a task whose first extension holds no parameters', () => {
            expect(readProcessIo(config, element('Task_connector'))).toEqual({ set: [], get: [] });
        });
    });

    describe('device task', () => {
        it('writes a controlling task with its payload and one input per characteristic field', async () => {
            writeDeviceTask(services, element('Task_1'), connectorInfo({
                function: controlling, device_class: deviceClass, characteristic: rgb, completionStrategy: 'optimistic',
            }));

            const task = byId(await saved(), selected().id);
            expect(task.getAttribute('name')).toBe('Lamp Set On');
            expect(task.getAttribute('camunda:type')).toBe('external');
            expect(task.getAttribute('camunda:topic')).toBe('optimistic');
            const inputs = parameters(task, 'camunda:inputParameter');
            expect(Object.keys(inputs)).toEqual(['payload', 'inputs.r', 'inputs.g', 'inputs.b']);
            expect(inputs['inputs.r']).toBe('0');
            const payload = JSON.parse(inputs['payload']);
            expect(payload.input).toEqual({ r: 0, g: 0, b: 0 });
            expect(payload.aspect).toBeNull();
            expect(task.getElementsByTagName('camunda:outputParameter').length).toBe(0);
        });

        it('writes a measuring task with both aspect fields and one output per characteristic field', async () => {
            writeDeviceTask(services, element('Task_1'), connectorInfo({ aspect: water, aspects: [water, air], characteristic: rgb }));

            const task = byId(await saved(), selected().id);
            expect(task.getAttribute('name')).toBe('Air, Water Get Temperature');
            const payload = JSON.parse(parameters(task, 'camunda:inputParameter')['payload']);
            expect(payload.aspect.id).toBe(air.id);
            expect(payload.aspects.map((node: any) => node.id)).toEqual([air.id, water.id]);
            expect(parameters(task, 'camunda:outputParameter')).toEqual({
                'outputs.r': '${result.r}',
                'outputs.g': '${result.g}',
                'outputs.b': '${result.b}',
            });
            expect(readDeviceTask(selected()).aspects.map((node: any) => node.id)).toEqual([air.id, water.id]);
            expect(hasOutputsForTopic(selected(), 'pessimistic')).toBe(true);
            expect(hasOutputsForTopic(selected(), 'export')).toBe(false);
        });

        // the old writer put an undefined entry into the output list for an unknown characteristic type
        it('writes no output for a characteristic field of an unknown type', async () => {
            const unknown = { id: 'urn:infai:ses:characteristic:x', name: 'x', type: 'https://schema.org/Unknown' };
            writeDeviceTask(services, element('Task_1'), connectorInfo({ characteristic: { ...rgb, sub_characteristics: [integer('r'), unknown] } }));

            const task = byId(await saved(), selected().id);
            expect(parameters(task, 'camunda:outputParameter')).toEqual({ 'outputs.r': '${result.r}' });
        });

        it('offers Edit Input only for inputs besides the payload', () => {
            writeDeviceTask(services, element('Task_1'), connectorInfo({ characteristic: integer('level') }));
            expect(hasEditableInputs(selected())).toBe(false);

            writeDeviceTask(services, selected(), connectorInfo({ function: controlling, device_class: deviceClass, characteristic: rgb }));
            expect(hasEditableInputs(selected())).toBe(true);
        });

        it('opens the selection empty for a task without a payload', () => {
            expect(readDeviceTask(element('Task_connector'))).toBeUndefined();
            expect(readDeviceTask(element('Task_1'))).toBeUndefined();
        });
    });

    describe('conditional event', () => {
        const reply = (aspect: string, aspects: string[]) => ({
            aspect,
            aspects,
            iotfunction: measuring.id,
            characteristic: 'urn:infai:ses:characteristic:celsius',
            script: 'value > 20',
            valueVariableName: 'value',
            variables: '{"limit": "20"}',
            qos: '1',
            label: 'Get Temperature',
        });

        it('writes every attribute, both aspect spellings and the label, and keeps use_marshaller', async () => {
            writeConditionalEvent(services, element('Event_msg'), reply(water.id, [water.id, air.id]));

            const event = byId(await saved(), 'Event_msg');
            expect(event.getAttribute('senergy:aspects')).toBe(`${air.id},${water.id}`);
            expect(event.getAttribute('senergy:aspect')).toBe(air.id);
            expect(event.getAttribute('senergy:function')).toBe(measuring.id);
            expect(event.getAttribute('senergy:characteristic')).toBe('urn:infai:ses:characteristic:celsius');
            expect(event.getAttribute('senergy:script')).toBe('value > 20');
            expect(event.getAttribute('senergy:value_variable_name')).toBe('value');
            expect(event.getAttribute('senergy:variables')).toBe('{"limit": "20"}');
            expect(event.getAttribute('senergy:qos')).toBe('1');
            expect(event.getAttribute('senergy:use_marshaller')).toBe('true');
            expect(event.getAttribute('name')).toBe('Get Temperature');
        });

        it('removes both aspect attributes for an empty selection', async () => {
            writeConditionalEvent(services, element('Event_msg'), reply('', []));

            const event = byId(await saved(), 'Event_msg');
            expect(event.hasAttribute('senergy:aspect')).toBe(false);
            expect(event.hasAttribute('senergy:aspects')).toBe(false);
        });

        it('reads an element written before the list as a list of its single aspect', () => {
            const model = readConditionalEvent(element('Event_msg'));
            expect(model.aspect).toBe(air.id);
            expect(model.aspects).toEqual([air.id]);
            expect(model.iotfunction).toBe(measuring.id);
        });

        it('can be undone', () => {
            writeConditionalEvent(services, element('Event_msg'), reply(water.id, [water.id]));
            modeler.get('commandStack').undo();
            expect(element('Event_msg').businessObject.get('senergy:aspect')).toBe(air.id);
        });
    });

    describe('historic data', () => {
        const config = { analysisAction: 'mean', interval: { value: '1', type: 'h' }, dateInterval: { start: '', end: '' } };

        it('makes the task an export task with the config and the export result', async () => {
            writeHistoricDataConfig(services, element('Task_1'), config);

            const task = byId(await saved(), selected().id);
            expect(task.getAttribute('camunda:topic')).toBe('export');
            expect(task.getAttribute('name')).toBe('mean');
            expect(JSON.parse(parameters(task, 'camunda:inputParameter')['config'])).toEqual(config);
            expect(parameters(task, 'camunda:outputParameter')).toEqual({ export_result: '${global_export_result}' });
            expect(readHistoricDataConfig(selected())).toEqual(config);
            expect(hasOutputsForTopic(selected(), 'export')).toBe(true);
        });

        // the old reader threw on a first input that is not JSON, so the button did nothing
        it('reads no config from a first input that is not JSON', () => {
            writeIncident(services, element('Task_1'), { message: 'pump failed' });
            expect(readHistoricDataConfig(selected())).toBeUndefined();
            expect(readHistoricDataConfig(element('Task_extract'))).toBeUndefined();
        });
    });

    describe('timer', () => {
        it('replaces the timer expression and names the event after it', async () => {
            expect(readTimer(element('Timer_1'), 'timeDate')).toBe('2020-05-12T23:13:00.000Z');

            writeTimer(services, element('Timer_1'), 'timeDuration', 'PT5M', '5 minutes');

            const definition = byId(await saved(), 'Timer_1').getElementsByTagName('bpmn:timerEventDefinition')[0];
            expect(Array.from(definition.children).map((child) => child.tagName)).toEqual(['bpmn:timeDuration']);
            expect(definition.children[0].textContent).toBe('PT5M');
            expect(definition.children[0].getAttribute('xsi:type')).toBe('bpmn:tFormalExpression');
            expect(element('Timer_1').businessObject.name).toBe('5 minutes');
            expect(readTimer(element('Timer_1'), 'timeDate')).toBeUndefined();
        });
    });
});
