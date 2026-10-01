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

/*
 * What the process designer's Senergy buttons and fields read from and write to the model.
 * The properties panel only opens the dialogs and hands their results to these functions.
 */

import { aspectsLabel, eventAspectAttributes, eventAspectIds, payloadAspectFields, selectedAspectNodes } from '../properties-provider/aspects';
import {
    businessObject,
    connector,
    firstExtension,
    inputOutput,
    inputParameter,
    ModelServices,
    outputParameter,
    refresh,
    replaceTask,
    setExtension,
} from './bpmn-elements';
import { ProcessIoDesignerConfig, ProcessIoDesignerInfo } from '../../../process-io/shared/process-io.model';
import { ConditionalEventEditModel } from '../../shared/designer-dialog.model';

const typeString = 'https://schema.org/Text';
const typeInteger = 'https://schema.org/Integer';
const typeFloat = 'https://schema.org/Float';
const typeBoolean = 'https://schema.org/Boolean';
const typeList = 'https://schema.org/ItemList';
const typeStructure = 'https://schema.org/StructuredValue';

const controllingFunction = 'https://senergy.infai.org/ontology/ControllingFunction';
const measuringFunction = 'https://senergy.infai.org/ontology/MeasuringFunction';

type TaskServices = Pick<ModelServices, 'moddle' | 'bpmnFactory' | 'replace' | 'selection' | 'eventBus'>;

// ---- incident ----

export function readIncident(element: any): { message: string } {
    const first = firstExtension(element);
    let message = '';
    if (first && first.inputParameters && first.inputParameters.length > 0) {
        message = first.inputParameters[0].value;
    }
    return { message };
}

export function writeIncident(services: TaskServices, element: any, config: { message: string }): void {
    replaceTask(services, element, 'bpmn:ServiceTask', true, (task) => {
        task.topic = 'optimistic';
        setExtension(services.moddle, task, inputOutput(services.moddle, [inputParameter(services.moddle, 'incident', config.message)], []));
    });
}

// ---- notification ----

/** Prefills from subject/text parameters of a connector; the notification connector itself carries a payload. */
export function readNotification(element: any): { subject: string; content: string } {
    const first = firstExtension(element);
    let subject = '';
    let content = '';
    const inputs = first && first.inputOutput && first.inputOutput.inputParameters;
    (inputs || []).forEach((input: any) => {
        if (input.name === 'subject') {
            subject = input.value;
        }
        if (input.name === 'text') {
            content = input.value;
        }
    });
    return { subject, content };
}

export function writeNotification(services: TaskServices, element: any, subject: string, content: string): void {
    replaceTask(services, element, 'bpmn:ServiceTask', false, (task) => {
        task.name = 'send notification';
        const inputs = [
            inputParameter(services.moddle, 'payload', JSON.stringify({ message: content, title: subject })),
            inputParameter(services.moddle, 'deploymentIdentifier', 'notification'),
        ];
        setExtension(services.moddle, task, connector(services.moddle, 'http-connector', inputs, []));
        refresh(services, element);
    });
}

// ---- process io ----

function splitProcessIoKey(config: ProcessIoDesignerConfig, keyWithPlaceholders: string): { key: string; instanceBound: boolean; definitionBound: boolean } {
    let key = keyWithPlaceholders;
    let definitionBound = false;
    if (key.startsWith(config.processIoDefinitionPlaceholder)) {
        definitionBound = true;
        key = key.slice(config.processIoDefinitionPlaceholder.length);
    }
    if (key.startsWith('_')) {
        key = key.slice(1);
    }
    let instanceBound = false;
    if (key.startsWith(config.processIoInstancePlaceholder)) {
        instanceBound = true;
        key = key.slice(config.processIoInstancePlaceholder.length);
    }
    if (key.startsWith('_')) {
        key = key.slice(1);
    }
    return { key, instanceBound, definitionBound };
}

function joinProcessIoKey(config: ProcessIoDesignerConfig, info: { key: string; instanceBound: boolean; definitionBound: boolean }): string {
    let result = info.key;
    if (info.instanceBound) {
        result = config.processIoInstancePlaceholder + '_' + result;
    }
    if (info.definitionBound) {
        result = config.processIoDefinitionPlaceholder + '_' + result;
    }
    return result;
}

export function readProcessIo(config: ProcessIoDesignerConfig, element: any): ProcessIoDesignerInfo {
    const result: ProcessIoDesignerInfo = { set: [], get: [] };
    const first = firstExtension(element);
    if (!first) {
        return result;
    }
    const inputs: any[] = first.inputParameters || [];
    const outputs: any[] = first.outputParameters || [];
    inputs.forEach((input) => {
        const inputName: string = input.name;
        const inputValue = input.value;
        if (inputName.startsWith(config.processIoReadPrefix)) {
            const keyWithPlaceholders: string = inputValue || '';
            const localVariableName = inputName.slice(config.processIoReadPrefix.length);
            const output = outputs.find((candidate) => candidate.value === '${' + localVariableName + '}');
            const defaultInput = inputs.find(
                (candidate) =>
                    candidate.name.startsWith(config.processIoReadDefaultPrefix) &&
                    candidate.name.slice(config.processIoReadDefaultPrefix.length) === keyWithPlaceholders,
            );
            result.get.push({
                ...splitProcessIoKey(config, keyWithPlaceholders),
                outputVariableName: output ? output.name : localVariableName,
                defaultValue: defaultInput ? defaultInput.value : 'null',
            });
        }
        if (inputName.startsWith(config.processIoWritePrefix)) {
            result.set.push({ ...splitProcessIoKey(config, inputName.slice(config.processIoWritePrefix.length)), value: inputValue });
        }
    });
    return result;
}

export function writeProcessIo(services: TaskServices, element: any, config: ProcessIoDesignerConfig, infos: ProcessIoDesignerInfo): void {
    const moddle = services.moddle;
    replaceTask(services, element, 'bpmn:ServiceTask', true, (task) => {
        task.topic = config.processIoWorkerTopic;
        const inputs: any[] = [];
        const outputs: any[] = [];
        infos.set.forEach((info) => {
            inputs.push(inputParameter(moddle, config.processIoWritePrefix + joinProcessIoKey(config, info), info.value));
        });
        infos.get.forEach((info) => {
            inputs.push(inputParameter(moddle, config.processIoReadPrefix + info.outputVariableName + '_local', joinProcessIoKey(config, info)));
            inputs.push(inputParameter(moddle, config.processIoReadDefaultPrefix + joinProcessIoKey(config, info), info.defaultValue));
            outputs.push(outputParameter(moddle, info.outputVariableName, '${' + info.outputVariableName + '_local}'));
        });
        setExtension(moddle, task, inputOutput(moddle, inputs, outputs));
        refresh(services, element);
    });
}

// ---- device task ----

export function getPayload(connectorInfo: any, input: boolean): string {
    const aspectFields = payloadAspectFields(connectorInfo);
    return JSON.stringify(
        {
            version: 2,
            function: connectorInfo.function,
            device_class: connectorInfo.device_class || null,
            aspect: aspectFields.aspect,
            aspects: aspectFields.aspects,
            label: connectorInfo.function.name,
            input: input ? generateStructure(connectorInfo.characteristic, true, '') : {},
            characteristic_id: connectorInfo.characteristic.id,
            retries: connectorInfo.retries,
            prefer_event: connectorInfo.prefer_events,
        },
        null,
        4,
    );
}

export function getTaskName(connectorInfo: any, currentName: string): string {
    let name = currentName;
    if (connectorInfo.device_class !== null) {
        name = connectorInfo.device_class.name;
    } else {
        const label = aspectsLabel(connectorInfo);
        if (label !== undefined) {
            name = label;
        }
    }
    return name + ' ' + connectorInfo.function.name;
}

/** Inputs are default values, outputs ${result...} expressions; undefined for an unknown characteristic type. */
function generateStructure(characteristic: any, input: boolean, name: string): any {
    const outputValue = '${result' + name + '}';
    switch (characteristic.type) {
    case typeString:
        return input ? '' : outputValue;
    case typeFloat:
        return input ? 0.0 : outputValue;
    case typeInteger:
        return input ? 0 : outputValue;
    case typeBoolean:
        return input ? false : outputValue;
    case typeStructure: {
        const result: any = {};
        characteristic.sub_characteristics.forEach((sub: any) => {
            result[sub.name] = generateStructure(sub, input, name + '.' + sub.name);
        });
        return result;
    }
    case typeList: {
        const result: any[] = [];
        characteristic.sub_characteristics.forEach((sub: any) => {
            result[parseInt(sub.name, 10)] = generateStructure(sub, input, name + '.' + sub.name);
        });
        return result;
    }
    }
    return undefined;
}

function parameterPaths(value: any, path: string, input: boolean): { path: string; value: any }[] {
    if (value !== Object(value)) {
        return [{ path, value: input ? JSON.stringify(value) : value }];
    }
    let result: { path: string; value: any }[] = [];
    for (const key in value) {
        result = result.concat(parameterPaths(value[key], [path, key].join('.'), input));
    }
    return result;
}

function taskParameters(moddle: any, structure: any, path: string, input: boolean): any[] {
    if (structure === null || structure === undefined) {
        return [];
    }
    return parameterPaths(structure, path, input)
        .filter((entry) => input || entry.value !== undefined)
        .map((entry) => (input ? inputParameter(moddle, entry.path, entry.value) : outputParameter(moddle, entry.path, entry.value)));
}

export function readDeviceTask(element: any): any {
    const bo = businessObject(element);
    const first = firstExtension(element);
    const payloadInput = first && (first.inputParameters || []).find((input: any) => input.name === 'payload');
    if (!payloadInput) {
        return undefined;
    }
    const payload = JSON.parse(payloadInput.value);
    return {
        function: payload.function,
        device_class: payload.device_class,
        aspect: payload.aspect,
        aspects: selectedAspectNodes(payload),
        completionStrategy: bo.get('camunda:topic'),
        retries: payload.retries,
        prefer_events: payload.prefer_event,
    };
}

export function writeDeviceTask(services: TaskServices, element: any, connectorInfo: any): void {
    const moddle = services.moddle;
    replaceTask(services, element, 'bpmn:ServiceTask', true, (task) => {
        task.topic = connectorInfo.completionStrategy;
        task.name = getTaskName(connectorInfo, task.name);
        let inputs: any[] | undefined;
        let outputs: any[] | undefined;
        if (connectorInfo.function.rdf_type === controllingFunction) {
            const payload = inputParameter(moddle, 'payload', getPayload(connectorInfo, true));
            inputs = [payload].concat(taskParameters(moddle, generateStructure(connectorInfo.characteristic, true, ''), 'inputs', true));
            outputs = [];
        }
        if (connectorInfo.function.rdf_type === measuringFunction) {
            inputs = [inputParameter(moddle, 'payload', getPayload(connectorInfo, false))];
            outputs = taskParameters(moddle, generateStructure(connectorInfo.characteristic, false, ''), 'outputs', false);
        }
        setExtension(moddle, task, inputOutput(moddle, inputs, outputs));
        refresh(services, element);
    });
}

/** Edit Input is offered once a controlling task has inputs besides its payload. */
export function hasEditableInputs(element: any): boolean {
    const first = firstExtension(element);
    return !!(first && first.inputParameters && first.inputParameters.length > 1);
}

/** Select Output-Variables is offered for task outputs under the given topic. */
export function hasOutputsForTopic(element: any, topic: string): boolean {
    const first = firstExtension(element);
    return !!(first && first.outputParameters && first.outputParameters.length > 0 && businessObject(element).topic === topic);
}

export function taskOutputParameters(element: any): any[] {
    return firstExtension(element).outputParameters;
}

// ---- conditional (message) event ----

export function readConditionalEvent(element: any): Omit<ConditionalEventEditModel, 'label'> {
    const bo = businessObject(element);
    return {
        aspect: bo.get('senergy:aspect'),
        aspects: eventAspectIds(bo.get('senergy:aspects'), bo.get('senergy:aspect')),
        iotfunction: bo.get('senergy:function'),
        characteristic: bo.get('senergy:characteristic'),
        script: bo.get('senergy:script'),
        valueVariableName: bo.get('senergy:value_variable_name'),
        variables: bo.get('senergy:variables'),
        qos: bo.get('senergy:qos'),
    };
}

/** The attribute update for a dialog result; an empty aspect selection removes both aspect attributes. */
export function conditionalEventUpdate(response: ConditionalEventEditModel): Record<string, any> {
    const aspectAttributes = eventAspectAttributes(Array.isArray(response.aspects) ? response.aspects : [response.aspect]);
    const update: Record<string, any> = {
        'senergy:aspects': aspectAttributes['senergy:aspects'],
        'senergy:aspect': aspectAttributes['senergy:aspect'],
        'senergy:function': response.iotfunction,
        'senergy:characteristic': response.characteristic,
        'senergy:script': response.script,
        'senergy:value_variable_name': response.valueVariableName,
        'senergy:variables': response.variables,
        'senergy:qos': response.qos,
    };
    if (response.label) {
        update['name'] = response.label;
    }
    return update;
}

export function writeConditionalEvent(services: Pick<ModelServices, 'modeling' | 'eventBus'>, element: any, response: ConditionalEventEditModel): void {
    services.modeling.updateProperties(element, conditionalEventUpdate(response));
    refresh(services, element);
}

// ---- historic data ----

/** The stored analysis config; undefined when the first input holds none. */
export function readHistoricDataConfig(element: any): any {
    const first = firstExtension(element);
    const inputs = first && first.inputParameters;
    if (!inputs || !inputs[0]) {
        return undefined;
    }
    try {
        return JSON.parse(inputs[0].value);
    } catch {
        return undefined;
    }
}

export function writeHistoricDataConfig(services: TaskServices, element: any, config: any): void {
    const moddle = services.moddle;
    replaceTask(services, element, 'bpmn:ServiceTask', true, (task) => {
        task.topic = 'export';
        task.name = config.analysisAction;
        const inputs = [inputParameter(moddle, 'config', JSON.stringify(config))];
        const outputs = [outputParameter(moddle, 'export_result', '${global_export_result}')];
        setExtension(moddle, task, inputOutput(moddle, inputs, outputs));
        refresh(services, element);
    });
}

// ---- timer ----

export type TimerKind = 'timeDuration' | 'timeDate' | 'timeCycle';

export function readTimer(element: any, kind: TimerKind): string | undefined {
    const definition = businessObject(element).eventDefinitions[0];
    return definition[kind] && definition[kind].body;
}

/** Leaves only the given timer expression on the event and names the event after it. */
export function writeTimer(services: Pick<ModelServices, 'moddle' | 'modeling' | 'eventBus'>, element: any, kind: TimerKind, body: string, name: string): void {
    const definition = businessObject(element).eventDefinitions[0];
    const expression = services.moddle.create('bpmn:FormalExpression', { body });
    delete definition.timeCycle;
    delete definition.timeDate;
    delete definition.timeDuration;
    definition[kind] = expression;
    refresh(services, element);
    services.modeling.updateProperties(element, { name });
}

// ---- deployment order ----

export function orderOptions(): { name: string; value: string }[] {
    const options = [];
    for (let i = 0; i <= 100; i++) {
        options.push({ name: '' + i, value: '' + i });
    }
    return options;
}
