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

import { SmartServiceTaskInputDescription } from '../../shared/designer.model';
import { BpmnBusinessObject, BpmnElement } from '../../../../processes/designer/shared/designer.model';
import { ImportTypeContentVariableModel } from '../../../../imports/import-types/shared/import-types.model';
import {
    applyDeviceRepositoryInputs,
    applyWatcherInputs,
    chunkString,
    deviceRepositoryWorkerInfoToInputs,
    getChunkedDataFromInputs,
    getChunkedInputs,
    getDefaultStartEvent,
    getImportTypeOutputPathsFormSubElements,
    getIncomingOutputs,
    inputsToProcessStartModel,
    newDeviceRepositoryWorkerInfo,
    newWatcherWorkerInfo,
    padNumber,
    processStartModelToInputs,
    watcherWorkerInfoToInputs,
} from './smart-service-task-inputs';

const text = (name: string, value: string): SmartServiceTaskInputDescription => ({ name, type: 'text', value });

describe('smart-service-task-inputs', () => {
    describe('chunking', () => {
        it('splits at the length and keeps line breaks inside the chunks', () => {
            expect(chunkString('ab\ncd\nef', 3)).toEqual(['ab\n', 'cd\n', 'ef']);
            expect(chunkString('', 3)).toEqual([]);
        });

        it('pads with zeros up to the width and never truncates', () => {
            expect(padNumber(7, 2)).toBe('07');
            expect(padNumber(7, 3)).toBe('007');
            expect(padNumber(123, 2)).toBe('123');
        });

        it('names the first chunk by the prefix and numbers the rest to the width of the chunk count plus one', () => {
            expect(getChunkedInputs('k', '')).toEqual([]);
            expect(getChunkedInputs('k', 'x'.repeat(1000)).map((i) => i.name)).toEqual(['k']);
            expect(getChunkedInputs('k', 'x'.repeat(1001)).map((i) => i.name)).toEqual(['k', 'k_01']);
            expect(getChunkedInputs('k', 'x'.repeat(10000)).map((i) => i.name).slice(0, 3)).toEqual(['k', 'k_001', 'k_002']);
            expect(getChunkedInputs('k', 'x'.repeat(10001))[10].name).toBe('k_010');
        });

        it('reads chunks back in name order, and falls back to the default', () => {
            expect(getChunkedDataFromInputs('k', [text('k_01', 'B'), text('k', 'A'), text('other', 'Z')], 'd')).toBe('AB');
            expect(getChunkedDataFromInputs('k', [text('other', 'Z')], 'd')).toBe('d');
        });

        it('round-trips a value', () => {
            const value = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i).repeat(777)).join('\n');
            expect(getChunkedDataFromInputs('k', getChunkedInputs('k', value).reverse(), '')).toBe(value);
        });
    });

    describe('process start', () => {
        it('reads the deployment id and the inputs, ignoring other inputs', () => {
            expect(inputsToProcessStartModel([
                text('process_deployment_start.input.a', '1'),
                text('process_deployment_start.process_deployment_id', 'dep'),
                text('info.key', 'k'),
            ])).toEqual({ deployment_id: 'dep', inputs: [{ key: 'a', value: '1' }] });
            expect(inputsToProcessStartModel(undefined as unknown as SmartServiceTaskInputDescription[])).toEqual({ deployment_id: '', inputs: [] });
        });

        it('writes the deployment id first and round-trips', () => {
            const model = { deployment_id: 'dep', inputs: [{ key: 'a.b', value: '1' }, { key: 'c', value: '' }] };
            const inputs = processStartModelToInputs(model);
            expect(inputs.map((i) => i.name)).toEqual([
                'process_deployment_start.process_deployment_id', 'process_deployment_start.input.a.b', 'process_deployment_start.input.c',
            ]);
            expect(inputsToProcessStartModel(inputs)).toEqual(model);
        });
    });

    describe('device repository', () => {
        it('defaults to creating a group, and reads the stored values', () => {
            const info = newDeviceRepositoryWorkerInfo();
            applyDeviceRepositoryInputs(info, []);
            expect(info.operation).toBe('create_device_group');
            applyDeviceRepositoryInputs(info, [text('device_repository.name', 'n'), text('device_repository.key', 'k'), text('device_repository.create_device_group', 'a,b')]);
            expect(info).toEqual({ name: 'n', key: 'k', operation: 'create_device_group', create_device_group: { ids: 'a,b' } });
        });

        it('writes the key only when set, and nothing for an unknown operation', () => {
            const info = newDeviceRepositoryWorkerInfo();
            info.operation = 'create_device_group';
            expect(deviceRepositoryWorkerInfoToInputs(info).map((i) => i.name)).toEqual(['device_repository.create_device_group', 'device_repository.name', 'device_repository.wait']);
            expect(deviceRepositoryWorkerInfoToInputs(info)[2].value).toBe('true');
            info.key = 'k';
            expect(deviceRepositoryWorkerInfoToInputs(info).map((i) => i.name)).toContain('device_repository.key');
            info.operation = 'other';
            expect(deviceRepositoryWorkerInfoToInputs(info)).toEqual([]);
        });
    });

    describe('watcher', () => {
        it('keeps the defaults without stored inputs', () => {
            const info = newWatcherWorkerInfo();
            applyWatcherInputs(info, []);
            expect(info).toEqual(newWatcherWorkerInfo());
        });

        it('reads producer, interval, hash type, procedure inputs and criteria', () => {
            const info = newWatcherWorkerInfo();
            applyWatcherInputs(info, [
                text('watcher.maintenance_procedure', 'p'),
                text('watcher.watch_interval', '5m'),
                text('watcher.hash_type', 'none'),
                text('watcher.maintenance_procedure_inputs.a', '1'),
                text('watcher.watch_devices_by_criteria', '[{"function_id":"f"}]'),
            ]);
            expect(info.maintenance_producer).toBe('p');
            expect(info.interval).toBe('5m');
            expect(info.hash_type).toBe('none');
            expect(info.maintenance_procedure_inputs).toEqual([{ key: 'a', value: '1' }]);
            expect(info.devices_by_criteria.criteria.map((c) => c.function_id)).toEqual(['f']);
            expect(info.operation).toBe('devices_by_criteria');
        });

        it('switches to the request operation and normalises a missing body', () => {
            const info = newWatcherWorkerInfo();
            applyWatcherInputs(info, [text('watcher.watch_request', '{"method":"GET","endpoint":"e","add_auth_token":false}')]);
            expect(info.operation).toBe('watch_request');
            expect(info.request.body).toBe('');
        });

        it('writes the request without its empty body, which it also removes from the model', () => {
            const info = newWatcherWorkerInfo();
            info.operation = 'watch_request';
            const inputs = watcherWorkerInfoToInputs(info);
            expect(inputs[inputs.length - 1]).toEqual(text('watcher.watch_request', '{"method":"GET","endpoint":"http://example.com","add_auth_token":false,"header":{"Accept-Charset":["utf-8"]}}'));
            expect(info.request.body).toBeUndefined();
        });

        it('writes the criteria list for devices by criteria', () => {
            const info = newWatcherWorkerInfo();
            const inputs = watcherWorkerInfoToInputs(info);
            expect(inputs.map((i) => [i.name, i.value])).toEqual([
                ['watcher.maintenance_procedure', ''],
                ['watcher.watch_interval', '1h'],
                ['watcher.hash_type', 'deviceids'],
                ['watcher.watch_devices_by_criteria', '[]'],
            ]);
        });
    });

    describe('import output paths', () => {
        const variable = (name: string, characteristic?: string, sub: ImportTypeContentVariableModel[] | null = null) =>
            ({ name, characteristic_id: characteristic, sub_content_variables: sub } as ImportTypeContentVariableModel);

        it('yields one empty path for no outputs', () => {
            expect(getImportTypeOutputPathsFormSubElements(null)).toEqual([{ path: '', characteristic: '' }]);
            expect(getImportTypeOutputPathsFormSubElements([])).toEqual([{ path: '', characteristic: '' }]);
        });

        it('joins nested names with dots and takes the characteristic of the leaf', () => {
            expect(getImportTypeOutputPathsFormSubElements([
                variable('a', 'c1'),
                variable('b', 'ignored', [variable('c', 'c2', []), variable('d')]),
            ])).toEqual([
                { path: 'a', characteristic: 'c1' },
                { path: 'b.c', characteristic: 'c2' },
                { path: 'b.d', characteristic: '' },
            ]);
        });
    });

    describe('incoming outputs', () => {
        const param = (name: string, value = '') => ({ name, value });
        const element = (businessObject: Record<string, unknown>, incoming: { source: BpmnElement }[] = []) =>
            ({ id: 'e', incoming, businessObject } as unknown as BpmnElement);
        const ext = (outputParameters: unknown[], inputParameters: unknown[] = []) => ({ values: [{ $type: 'camunda:InputOutput', outputParameters, inputParameters }] });

        it('finds the default start event: a start event without event definitions', () => {
            const plain = { $type: 'bpmn:StartEvent' } as BpmnBusinessObject;
            const timed = { $type: 'bpmn:StartEvent', eventDefinitions: { $type: 'bpmn:TimerEventDefinition' } } as BpmnBusinessObject;
            expect(getDefaultStartEvent([{ $type: 'bpmn:Task' } as BpmnBusinessObject, timed, plain])).toBe(plain);
            expect(getDefaultStartEvent([timed])).toBeUndefined();
            expect(getDefaultStartEvent(undefined)).toBeUndefined();
        });

        it('groups by topic with the task name as label prefix, and sends untopiced outputs to uncategorized', () => {
            const a = element({ $type: 'bpmn:ServiceTask', name: 'A', topic: 'info', extensionElements: ext([param('o1')]) });
            const b = element({ $type: 'bpmn:ServiceTask', extensionElements: ext([param('o2')]) });
            const result = getIncomingOutputs(element({}, [{ source: a }, { source: b }]));
            expect(Array.from(result.keys())).toEqual(['info', 'uncategorized']);
            expect(result.get('info')).toEqual([{ name: 'o1', value: '', label: 'A: o1' }]);
            expect(result.get('uncategorized')).toEqual([{ name: 'o2', value: '' }]);
        });

        it('adds raw flow and import selections for analytics and import tasks', () => {
            const analytics = element({ $type: 'bpmn:ServiceTask', name: 'Ana', topic: 'analytics', extensionElements: ext([param('ana_out')], [param('analytics.flow_id', 'f1')]) });
            const imp = element({ $type: 'bpmn:ServiceTask', name: 'Imp', topic: 'import', extensionElements: ext([param('imp_out')], [param('import.request', '{"import_type_id":"t1"}')]) });
            const result = getIncomingOutputs(element({}, [{ source: analytics }, { source: imp }]));
            expect(result.get('flow_selection_raw')).toEqual([{ name: 'ana_out', label: 'Ana', value: 'f1' }]);
            expect(result.get('import_selection_raw')).toEqual([{ name: 'imp_out', label: 'Imp', value: 't1' }]);
        });

        it('reads form fields of a start event, and recurses through the default start event for an event start', () => {
            const form = (id: string, iot?: string) => ({
                $type: 'bpmn:StartEvent',
                extensionElements: { values: [{ $type: 'camunda:FormData', fields: [{ id, label: id, properties: { values: iot ? [{ id: 'iot', value: iot }] : [] } }] }] },
            });
            const direct = getIncomingOutputs(element({}, [{ source: element(form('dev', 'device')) }]));
            expect(Array.from(direct.keys())).toEqual(['form_fields', 'iot_form_fields', 'device_iot_form_fields']);

            const viaEvent = element({
                $type: 'bpmn:StartEvent', eventDefinitions: { $type: 'bpmn:MessageEventDefinition' }, extensionElements: {},
                $parent: { flowElements: [form('val')] },
            });
            const result = getIncomingOutputs(element({}, [{ source: viaEvent }]));
            expect(Array.from(result.keys())).toEqual(['form_fields', 'value_form_fields']);
        });

        it('stops at an element it has already visited', () => {
            const source = element({ $type: 'bpmn:ServiceTask', topic: 'info', extensionElements: ext([param('o1')]) });
            const done = element({}, [{ source }]);
            expect(getIncomingOutputs(done).size).toBe(1);
            expect(getIncomingOutputs(done, [done]).size).toBe(0);
        });
    });
});
