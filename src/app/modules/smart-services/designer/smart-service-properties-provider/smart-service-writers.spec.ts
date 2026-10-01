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

import { createSmartServiceModeler } from '../smart-service-modeler';
import { modelServices, ModelServices } from '../../../processes/designer/bpmn-js/model/bpmn-elements';
import {
    findStartElement,
    readSmartServiceInputs,
    readTask,
    readTaskInputOutput,
    writeJsonExtraction,
    writeSmartServiceInputs,
    writeTask,
} from './smart-service-writers';
import { fetchText, importXml, mountModeler, MountedModeler, saveXml } from '../../../../../testing/bpmn-modeler';
import { parseXml } from '../../../../../testing/bpmn-xml-compare';
import { SmartServiceInputsDescription } from '../shared/designer.model';

describe('smart-service writers on the smart-service designer modeler', () => {
    let mounted: MountedModeler;
    let modeler: any;
    let services: ModelServices;

    beforeEach(async () => {
        mounted = mountModeler(createSmartServiceModeler);
        modeler = mounted.modeler;
        await importXml(modeler, await fetchText('/bpmn-fixtures/process/writers.bpmn'));
        services = modelServices(modeler);
    });

    afterEach(() => mounted.destroy());

    const element = (id: string) => modeler.get('elementRegistry').get(id);
    const selected = () => modeler.get('selection').get()[0];
    const saved = async () => parseXml(await saveXml(modeler));
    const byId = (doc: Document, id: string) => Array.from(doc.getElementsByTagName('*')).find((el) => el.getAttribute('id') === id) as Element;
    const parameters = (el: Element, tag: string): Record<string, string> =>
        Object.fromEntries(Array.from(el.getElementsByTagName(tag)).map((p) => [p.getAttribute('name') || '', p.textContent || '']));

    const inputs: SmartServiceInputsDescription = {
        inputs: [
            { id: 'device', label: 'Device', type: 'string', default_value: '', properties: [{ id: 'iot', value: 'device' }, { id: 'order', value: '0' }] },
            { id: 'limit', label: 'Limit', type: 'long', default_value: '42', properties: [] },
        ],
    };

    it('writes the inputs as formData of the start event and reads them back', async () => {
        writeSmartServiceInputs(services, element('StartEvent_1'), inputs);

        const start = byId(await saved(), 'StartEvent_1');
        const fields = Array.from(start.getElementsByTagName('camunda:formField'));
        expect(fields.map((field) => [field.getAttribute('id'), field.getAttribute('label'), field.getAttribute('type'), field.getAttribute('defaultValue')])).toEqual([
            ['device', 'Device', 'string', ''],
            ['limit', 'Limit', 'long', '42'],
        ]);
        const properties = Array.from(fields[0].getElementsByTagName('camunda:property')).map((p) => [p.getAttribute('id'), p.getAttribute('value')]);
        expect(properties).toEqual([['iot', 'device'], ['order', '0']]);
        expect(readSmartServiceInputs(element('StartEvent_1'))).toEqual(inputs);
    });

    it('finds the start event a task is reached from', () => {
        expect(findStartElement(element('Task_extract')).id).toBe('StartEvent_1');
        expect(findStartElement(element('StartEvent_1'))).toBeNull();
    });

    it('writes a process_deployment task with fog outputs named after the task it was opened for', async () => {
        writeTask(services, element('Task_1'), {
            name: 'deploy',
            topic: 'process_deployment',
            inputs: [
                { type: 'text', name: 'process_deployment.prefer_fog_deployment', value: 'true' },
                { type: 'script', name: 'process_deployment.name', value: '"a" + "b"' },
            ],
            outputs: [{ type: 'script', name: 'answer', value: '42' }],
            smartServiceInputs: inputs,
        });

        const doc = await saved();
        const task = byId(doc, selected().id);
        expect(task.tagName).toBe('bpmn:serviceTask');
        expect(task.getAttribute('camunda:type')).toBe('external');
        expect(task.getAttribute('camunda:topic')).toBe('process_deployment');
        expect(task.getAttribute('name')).toBe('deploy');
        const script = task.getElementsByTagName('camunda:inputParameter')[1].getElementsByTagName('camunda:script')[0];
        expect(script.getAttribute('scriptFormat')).toBe('Javascript');
        expect(script.textContent).toBe('"a" + "b"');
        expect(parameters(task, 'camunda:outputParameter')).toEqual({
            answer: '42',
            Task_1_process_deployment_id: '${process_deployment_id}',
            Task_1_is_fog_deployment: '${is_fog_deployment}',
            Task_1_fog_hub: '${fog_hub}',
        });
        expect(byId(doc, 'StartEvent_1').getElementsByTagName('camunda:formField').length).toBe(2);

        const read = readTask(selected());
        expect(read.topic).toBe('process_deployment');
        expect(read.name).toBe('deploy');
        expect(read.inputs).toEqual([
            { type: 'text', name: 'process_deployment.prefer_fog_deployment', value: 'true' },
            { type: 'script', name: 'process_deployment.name', value: '"a" + "b"' },
        ]);
        expect(read.smartServiceInputs).toEqual(inputs);
    });

    // the task dialog fills a start parameter without default with value null
    ['process_deployment', 'export'].forEach((topic) => {
        it(`leaves out a ${topic} parameter whose value is null, so the worker keeps the prepared default`, async () => {
            writeTask(services, element('Task_1'), {
                name: 'deploy',
                topic,
                inputs: [
                    { type: 'text', name: 'process_deployment.process_model_id', value: 'model' },
                    { type: 'text', name: 'process_deployment.start_parameter.default.limit', value: null as any },
                    { type: 'text', name: 'process_deployment.prefer_fog_deployment', value: 'false' },
                ],
                outputs: [],
                smartServiceInputs: { inputs: [] },
            });

            const task = byId(await saved(), 'Task_1');
            expect(task.getAttribute('camunda:topic')).toBe(topic);
            expect(parameters(task, 'camunda:inputParameter')).toEqual({
                'process_deployment.process_model_id': 'model',
                'process_deployment.prefer_fog_deployment': 'false',
            });
            expect(readTask(element('Task_1')).inputs.map((input) => input.name)).toEqual([
                'process_deployment.process_model_id',
                'process_deployment.prefer_fog_deployment',
            ]);
        });
    });

    const topics: { topic: string; outputs: Record<string, string> }[] = [
        { topic: 'analytics', outputs: { Task_1_pipeline_id: '${pipeline_id}' } },
        { topic: 'export', outputs: { Task_1_export_id: '${export_id}' } },
        { topic: 'import', outputs: { Task_1_import_id: '${import_id}' } },
        { topic: 'device_repository', outputs: { Task_1_device_group_id: '${device_group_id}', Task_1_device_group_selection: '${device_group_iot_option}' } },
        { topic: 'info', outputs: {} },
    ];
    topics.forEach(({ topic, outputs }) => {
        it(`adds the result outputs of the ${topic} topic`, async () => {
            writeTask(services, element('Task_1'), { name: topic, topic, inputs: [], outputs: [], smartServiceInputs: { inputs: [] } });
            expect(parameters(byId(await saved(), selected().id), 'camunda:outputParameter')).toEqual(outputs);
        });
    });

    // the old reader threw for a task whose input/output mapping has no inputs
    it('reads a task whose mapping has only outputs', () => {
        expect(readTask(element('Task_extract')).inputs).toEqual([]);
        expect(readTaskInputOutput(element('Task_extract'))).toEqual({
            name: 'extract',
            inputs: [],
            outputs: [{ type: 'script', name: 'lat', value: 'JSON.parse(location).Latitude' }],
        });
    });

    it('writes a JSON extraction as a plain task with its mapping', async () => {
        writeJsonExtraction(services, element('Task_connector'), {
            name: 'extract lon',
            inputs: [{ type: 'text', name: 'source', value: '${location}' }],
            outputs: [{ type: 'script', name: 'lon', value: 'JSON.parse(source).Longitude' }],
        });

        const task = byId(await saved(), selected().id);
        expect(task.tagName).toBe('bpmn:task');
        expect(task.getAttribute('name')).toBe('extract lon');
        expect(task.hasAttribute('camunda:type')).toBe(false);
        expect(task.getElementsByTagName('camunda:connector').length).toBe(0);
        expect(parameters(task, 'camunda:inputParameter')).toEqual({ source: '${location}' });
        expect(task.getElementsByTagName('camunda:outputParameter')[0].getElementsByTagName('camunda:script')[0].textContent).toBe('JSON.parse(source).Longitude');
    });
});
