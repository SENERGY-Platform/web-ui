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
import {
    BpmnBusinessObject,
    BpmnElement,
    BpmnElementRef,
    BpmnParameter,
    BpmnParameterWithLabel,
} from '../../../../processes/designer/shared/designer.model';
import { ImportTypeContentVariableModel } from '../../../../imports/import-types/shared/import-types.model';
import { editableCriteria, SmartServiceCriteria, storableCriteria } from '../../shared/smart-service-criteria';

/*
 * Pure conversions between the flat input list of a smart-service task and the models the
 * dialog edits. Nothing here touches component state, so the saved output can be pinned
 * without rendering the dialog.
 */

export interface ProcessStartInputModel {
    key: string;
    value: string;
}

export interface ProcessStartModel {
    deployment_id: string;
    inputs: ProcessStartInputModel[];
}

export interface GenericWatcherRequest {
    method: string;
    endpoint: string;
    body?: string; // base64 encoded byte array
    add_auth_token: boolean;
    header?: { [index: string]: string[] };
}

export interface DeviceRepositoryWorkerInfo {
    name: string;
    key: string;
    operation: string;
    create_device_group: {
        ids: string;
    };
}

export interface WatcherWorkerInfo {
    operation: string;
    maintenance_producer: string;
    interval: string;
    hash_type: string;
    maintenance_procedure_inputs: { key: string; value: string }[];
    devices_by_criteria: {
        criteria: SmartServiceCriteria[];
    };
    request: GenericWatcherRequest;
}

export const DEVICE_REPOSITORY_CREATE_DEVICE_GROUP_KEY = 'device_repository.create_device_group';
export const DEVICE_REPOSITORY_NAME_KEY = 'device_repository.name';
export const DEVICE_REPOSITORY_KEY_KEY = 'device_repository.key';
export const DEVICE_REPOSITORY_WAIT_KEY = 'device_repository.wait';

export const WATCHER_MAINTENANCE_PRODUCER_KEY = 'watcher.maintenance_procedure';
export const WATCHER_WATCH_INTERVAL_KEY = 'watcher.watch_interval';
export const WATCHER_HASH_TYPE_KEY = 'watcher.hash_type';
export const WATCHER_DEVICES_BY_CRITERIA_KEY = 'watcher.watch_devices_by_criteria';
export const WATCHER_REQUEST_KEY = 'watcher.watch_request';
export const WATCHER_MAINTENANCE_PRODUCER_INPUTS_PREFIX = 'watcher.maintenance_procedure_inputs.';

export function newDeviceRepositoryWorkerInfo(): DeviceRepositoryWorkerInfo {
    return {
        name: '',
        key: '',
        operation: '',
        create_device_group: {
            ids: ''
        }
    };
}

export function newWatcherWorkerInfo(): WatcherWorkerInfo {
    return {
        operation: 'devices_by_criteria',
        maintenance_producer: '',
        interval: '1h',
        hash_type: 'deviceids',
        maintenance_procedure_inputs: [],
        devices_by_criteria: {
            criteria: [],
        },
        request: {
            method: 'GET',
            endpoint: 'http://example.com',
            body: '',
            add_auth_token: false,
            header: { 'Accept-Charset': ['utf-8'] }
        }
    };
}

/******************************
 *      Chunking
 ******************************/

export function chunkString(str: string, length: number): string[] {
    return str.match(new RegExp('[^]{1,' + length + '}', 'g')) || [];
}

export function padNumber(num: number, size: number): string {
    let s = num + '';
    while (s.length < size) {
        s = '0' + s;
    }
    return s;
}

/** Splits a value into inputs of 1000 characters: `prefix`, then `prefix_01`, ... numbered to the width of the chunk count plus one. */
export function getChunkedInputs(inputNamePrefix: string, value: string): SmartServiceTaskInputDescription[] {
    const result = [] as SmartServiceTaskInputDescription[];
    const chunks = chunkString(value, 1000);
    const size = chunks.length.toString().length + 1;
    chunks.forEach((value2: string, i: number) => {
        let name = inputNamePrefix;
        if (i > 0) {
            name = name + '_' + padNumber(i, size);
        }
        result.push({ name, type: 'text', value: value2 });
    });
    return result;
}

export function getChunkedDataFromInputs(inputNamePrefix: string, inputs: SmartServiceTaskInputDescription[], defaultValue: string): string {
    return inputs.filter(value => value.name.startsWith(inputNamePrefix))
        .sort((a, b) => (a.name < b.name ? -1 : 1))
        .map(value => value.value)
        .join('') || defaultValue;
}

/******************************
 *      Process start
 ******************************/

export function inputsToProcessStartModel(inputs: SmartServiceTaskInputDescription[]): ProcessStartModel {
    const result: ProcessStartModel = {
        deployment_id: '',
        inputs: []
    };
    inputs?.forEach(value => {
        if (value.name === 'process_deployment_start.process_deployment_id') {
            result.deployment_id = value.value;
        }
        if (value.name.startsWith('process_deployment_start.input.')) {
            const key = value.name.replace('process_deployment_start.input.', '');
            result.inputs.push({ key, value: value.value });
        }
    });
    return result;
}

export function processStartModelToInputs(processStart: ProcessStartModel): SmartServiceTaskInputDescription[] {
    const result: SmartServiceTaskInputDescription[] = [{
        name: 'process_deployment_start.process_deployment_id',
        value: processStart.deployment_id,
        type: 'text'
    }];
    processStart.inputs.forEach(value => {
        result.push({
            name: 'process_deployment_start.input.' + value.key,
            value: value.value,
            type: 'text'
        });
    });
    return result;
}

/******************************
 *      Device repository
 ******************************/

/** Fills `info` from the stored inputs; creating a device group is the default operation. */
export function applyDeviceRepositoryInputs(info: DeviceRepositoryWorkerInfo, inputs: SmartServiceTaskInputDescription[]) {
    inputs.forEach(input => {
        if (input.name === DEVICE_REPOSITORY_NAME_KEY) {
            info.name = input.value;
        }
        if (input.name === DEVICE_REPOSITORY_CREATE_DEVICE_GROUP_KEY) {
            info.create_device_group.ids = input.value;
            info.operation = 'create_device_group';
        }
        if (input.name === DEVICE_REPOSITORY_KEY_KEY) {
            info.key = input.value;
        }
    });
    if (!info.operation) {
        info.operation = 'create_device_group';
    }
}

export function deviceRepositoryWorkerInfoToInputs(info: DeviceRepositoryWorkerInfo): SmartServiceTaskInputDescription[] {
    const result: SmartServiceTaskInputDescription[] = [];
    switch (info.operation) {
        case 'create_device_group': {
            result.push({ name: DEVICE_REPOSITORY_CREATE_DEVICE_GROUP_KEY, type: 'text', value: info.create_device_group.ids });
            result.push({ name: DEVICE_REPOSITORY_NAME_KEY, type: 'text', value: info.name });
            result.push({ name: DEVICE_REPOSITORY_WAIT_KEY, type: 'text', value: 'true' });
            if (info.key) {
                result.push({ name: DEVICE_REPOSITORY_KEY_KEY, type: 'text', value: info.key });
            }
            break;
        }
    }
    return result;
}

/******************************
 *      Watcher
 ******************************/

export function applyWatcherInputs(info: WatcherWorkerInfo, inputs: SmartServiceTaskInputDescription[]) {
    inputs.forEach(input => {
        if (input.name === WATCHER_MAINTENANCE_PRODUCER_KEY) {
            info.maintenance_producer = input.value;
        }
        if (input.name === WATCHER_WATCH_INTERVAL_KEY) {
            info.interval = input.value;
        }
        if (input.name === WATCHER_HASH_TYPE_KEY) {
            info.hash_type = input.value;
        }
        if (input.name === WATCHER_DEVICES_BY_CRITERIA_KEY) {
            const criteria = JSON.parse(input.value);
            info.devices_by_criteria.criteria = Array.isArray(criteria) ? criteria.map(editableCriteria) : criteria;
            info.operation = 'devices_by_criteria';
        }
        if (input.name.startsWith(WATCHER_MAINTENANCE_PRODUCER_INPUTS_PREFIX)) {
            if (!info.maintenance_procedure_inputs) {
                info.maintenance_procedure_inputs = [];
            }
            info.maintenance_procedure_inputs.push({
                key: input.name.slice(WATCHER_MAINTENANCE_PRODUCER_INPUTS_PREFIX.length),
                value: input.value
            });
        }
        if (input.name === WATCHER_REQUEST_KEY) {
            info.request = JSON.parse(input.value);
            if (!info.request.body) {
                info.request.body = '';
            }
            info.operation = 'watch_request';
        }
    });
}

function storableWatcherCriteria(info: WatcherWorkerInfo): unknown {
    const criteria = info.devices_by_criteria.criteria;
    return Array.isArray(criteria) ? criteria.map(storableCriteria) : criteria;
}

/** An empty request body is dropped from `info.request` itself, as the stored JSON must not carry it. */
export function watcherWorkerInfoToInputs(info: WatcherWorkerInfo): SmartServiceTaskInputDescription[] {
    const result: SmartServiceTaskInputDescription[] = [];
    result.push({ name: WATCHER_MAINTENANCE_PRODUCER_KEY, type: 'text', value: info.maintenance_producer });
    result.push({ name: WATCHER_WATCH_INTERVAL_KEY, type: 'text', value: info.interval });
    result.push({ name: WATCHER_HASH_TYPE_KEY, type: 'text', value: info.hash_type });
    if (info.maintenance_procedure_inputs) {
        info.maintenance_procedure_inputs.forEach((v) => {
            result.push({ name: WATCHER_MAINTENANCE_PRODUCER_INPUTS_PREFIX + v.key, type: 'text', value: v.value });
        });
    }
    switch (info.operation) {
        case 'devices_by_criteria': {
            result.push({ name: WATCHER_DEVICES_BY_CRITERIA_KEY, type: 'text', value: JSON.stringify(storableWatcherCriteria(info)) });
            break;
        }
        case 'watch_request': {
            const req = info.request;
            if (req.body === '') {
                req.body = undefined;
            }
            result.push({ name: WATCHER_REQUEST_KEY, type: 'text', value: JSON.stringify(req) });
            break;
        }
    }
    return result;
}

/******************************
 *      Import output paths
 ******************************/

export function getImportTypeOutputPathsFormSubElements(importOutputs: ImportTypeContentVariableModel[] | null, current?: string[]): { path: string; characteristic: string }[] {
    if (!current) {
        current = [];
    }
    if (!importOutputs || importOutputs.length === 0) {
        return [{ path: current.join('.'), characteristic: '' }];
    } else {
        let result: { path: string; characteristic: string }[] = [];
        importOutputs.forEach(sub => {
            result = result.concat(getImportTypeOutputPaths(sub, JSON.parse(JSON.stringify(current))));
        });
        return result;
    }
}

function getImportTypeOutputPaths(importOutputs: ImportTypeContentVariableModel, current?: string[]): { path: string; characteristic: string }[] {
    if (!current) {
        current = [];
    }
    current.push(importOutputs.name);
    if (!importOutputs.sub_content_variables || importOutputs.sub_content_variables.length === 0) {
        return [{ path: current.join('.'), characteristic: importOutputs.characteristic_id || '' }];
    } else {
        return getImportTypeOutputPathsFormSubElements(importOutputs.sub_content_variables, current);
    }
}

/******************************
 *      Incoming outputs
 ******************************/

export function getDefaultStartEvent(elements: BpmnBusinessObject[] | undefined): BpmnBusinessObject | undefined {
    return elements?.find(e => e.$type === 'bpmn:StartEvent' && !e?.eventDefinitions);
}

export function getIncomingOutputs(element: BpmnElement, done: BpmnElement[] = []): Map<string, BpmnParameterWithLabel[]> {
    const result: Map<string, BpmnParameter[]> = new Map<string, BpmnParameterWithLabel[]>();
    if (done.indexOf(element) !== -1) {
        return result;
    }

    const add = (key: string, value: BpmnParameterWithLabel[], element2?: any) => {
        if (element2 && element2.name) {
            value = value.map(e => {
                if (!e.label) {
                    e.label = element2.name + ': ' + e.name;
                }
                return e;
            });
        }
        let temp = result.get(key) || [];
        temp = temp.concat(value);
        result.set(key, temp);
    };

    done.push(element);
    if (element.incoming) {
        for (let index = 0; index < element.incoming.length; index++) {
            const incoming = element.incoming[index].source;
            if (
                incoming.businessObject.extensionElements &&
                incoming.businessObject.extensionElements.values &&
                incoming.businessObject.extensionElements.values[0] &&
                incoming.businessObject.extensionElements.values[0].outputParameters
            ) {
                if (incoming.businessObject.topic) {
                    const topic = incoming.businessObject.topic;
                    add(topic, incoming.businessObject.extensionElements.values[0].outputParameters, incoming.businessObject);
                    if (topic === 'analytics' && incoming.businessObject.extensionElements.values[0].outputParameters?.length && incoming.businessObject.extensionElements.values[0].outputParameters?.length > 0) {
                        const flowId = incoming.businessObject.extensionElements.values[0].inputParameters?.find(value => value.name === 'analytics.flow_id')?.value;
                        add('flow_selection_raw', [{
                            name: incoming.businessObject.extensionElements.values[0].outputParameters[0].name,
                            label: (incoming.businessObject as any).name,
                            value: flowId || ''
                        }]);
                    }
                    if (topic === 'import' && incoming.businessObject.extensionElements.values[0].outputParameters?.length && incoming.businessObject.extensionElements.values[0].outputParameters?.length > 0) {
                        try {
                            const importRequestStr = incoming.businessObject.extensionElements.values[0].inputParameters?.find(value => value.name === 'import.request')?.value;
                            if (importRequestStr) {
                                const importRequest = JSON.parse(importRequestStr);
                                if (importRequest.import_type_id) {
                                    const importType = importRequest.import_type_id;
                                    add('import_selection_raw', [{
                                        name: incoming.businessObject.extensionElements.values[0].outputParameters[0].name,
                                        label: (incoming.businessObject as any).name,
                                        value: importType || ''
                                    }]);
                                }
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    if (topic === 'process_deployment'
                        && incoming.businessObject.extensionElements.values[0].inputParameters?.length
                        && incoming.businessObject.extensionElements.values[0].outputParameters?.length
                    ) {
                        const processModelId = incoming.businessObject.extensionElements.values[0].inputParameters?.find(value => value.name === 'process_deployment.process_model_id')?.value;
                        const processDeploymentIdVariable = incoming.businessObject.extensionElements.values[0].outputParameters?.find(value => value.name.endsWith('_process_deployment_id'))?.name;
                        if (processModelId && processDeploymentIdVariable && processModelId.match(/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/)) {
                            add('process_deployment_to_model', [{
                                name: processDeploymentIdVariable,
                                label: '',
                                value: processModelId
                            }]);
                        }
                    }
                    if (topic === 'device_repository'
                        && incoming.businessObject.extensionElements.values[0].inputParameters?.length
                        && incoming.businessObject.extensionElements.values[0].outputParameters?.length
                    ) {
                        const deviceGroupSelectionVariable = incoming.businessObject.extensionElements.values[0].outputParameters?.find(value => value.name.endsWith('_device_group_selection'))?.name;
                        if (deviceGroupSelectionVariable) {
                            add('iot_form_fields', [{ name: deviceGroupSelectionVariable, label: '', value: '' }]);
                            add('group_iot_form_fields', [{ name: deviceGroupSelectionVariable, label: '', value: '' }]);
                        }
                    }
                } else {
                    add('uncategorized', incoming.businessObject.extensionElements.values[0].outputParameters, incoming.businessObject);
                }
            }
            if (
                incoming.businessObject.$type === 'bpmn:StartEvent' &&
                incoming.businessObject.extensionElements?.values &&
                incoming.businessObject.extensionElements.values[0] &&
                incoming.businessObject.extensionElements.values[0].$type === 'camunda:FormData'
            ) {
                const formFields = incoming.businessObject.extensionElements.values[0].fields;
                formFields?.forEach(field => {
                    add('form_fields', [{ name: field.id, label: field.label, value: '' }]);
                    const iotProperty = field.properties?.values?.find(property => property.id === 'iot');
                    if (iotProperty) {
                        add('iot_form_fields', [{ name: field.id, label: field.label, value: '' }]);
                        iotProperty.value.split(',').forEach(iotKind => {
                            add(iotKind.trim() + '_iot_form_fields', [{ name: field.id, label: field.label, value: '' }]);
                        });
                    } else {
                        add('value_form_fields', [{ name: field.id, label: field.label, value: '' }]);
                    }
                });
            }
            if (
                incoming.businessObject.$type === 'bpmn:StartEvent' &&
                incoming.businessObject.eventDefinitions
            ) {
                const defaultStartEvent = getDefaultStartEvent(incoming.businessObject?.$parent?.flowElements);
                if (defaultStartEvent) {
                    const sub2 = getIncomingOutputs({ id: '', incoming: [{ source: { businessObject: defaultStartEvent } } as BpmnElementRef] } as BpmnElement, done);
                    sub2.forEach((value, topic) => {
                        add(topic, value);
                    });
                }
            }
            const sub = getIncomingOutputs(incoming, done);
            sub.forEach((value, topic) => {
                add(topic, value);
            });
        }
    }

    return result;
}
