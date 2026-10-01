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
 * What the smart-service designer's buttons read from and write to the model. The properties
 * panel only opens the dialogs and hands their results to these functions.
 */

import {
    businessObject,
    firstExtension,
    inputOutput,
    inputParameter,
    ModelServices,
    outputParameter,
    refresh,
    replaceTask,
    scriptInputParameter,
    scriptOutputParameter,
    setExtension,
} from '../../../processes/designer/bpmn-js/model/bpmn-elements';
import {
    SmartServiceInputsDescription,
    SmartServiceTaskDescription,
    SmartServiceTaskInputOutputDescription,
} from '../shared/designer.model';

type TaskServices = Pick<ModelServices, 'moddle' | 'bpmnFactory' | 'replace' | 'selection' | 'eventBus'>;

interface TypedParameter {
    type: string;
    name: string;
    value: any;
}

// ---- smart-service inputs (start event formData) ----

export function readSmartServiceInputs(element: any): SmartServiceInputsDescription {
    const inputs: any[] = [];
    const first = element && firstExtension(element);
    (first?.fields || []).forEach((field: any) => {
        const properties: any[] = [];
        (field.properties?.values || []).forEach((property: any) => {
            properties.push({ id: property.id, value: property.value });
        });
        inputs.push({ id: field.id, label: field.label, type: field.type, default_value: field.defaultValue, properties });
    });
    return { inputs };
}

function formData(moddle: any, info: SmartServiceInputsDescription): any {
    const fields = info.inputs.map((field: any) =>
        moddle.create('camunda:FormField', {
            id: field.id,
            label: field.label,
            type: field.type,
            defaultValue: field.default_value,
            properties: moddle.create('camunda:Properties', {
                values: field.properties.map((property: any) => moddle.create('camunda:Property', { id: property.id, value: property.value })),
            }),
        }),
    );
    return moddle.create('camunda:FormData', { fields });
}

/** Replaces the extension elements of the start event with the given inputs as camunda:formData. */
export function writeSmartServiceInputs(services: Pick<ModelServices, 'moddle' | 'eventBus'>, element: any, info: SmartServiceInputsDescription): void {
    setExtension(services.moddle, element.businessObject, formData(services.moddle, info));
    refresh(services, element);
}

/** The start event the element is reached from, walking incoming flows backwards. */
export function findStartElement(element: any, done: any[] = []): any {
    if (done.indexOf(element) !== -1) {
        return null;
    }
    done.push(element);
    for (const flow of element.incoming || []) {
        const source = flow.source;
        if (source.businessObject.$type === 'bpmn:StartEvent') {
            return source;
        }
        const found = findStartElement(source, done);
        if (found) {
            return found;
        }
    }
    return null;
}

// ---- task parameters ----

function typedParameters(parameters: any[] | undefined): TypedParameter[] {
    return (parameters || []).map((parameter) =>
        parameter.definition && parameter.definition.scriptFormat
            ? { type: 'script', name: parameter.name, value: parameter.definition.value }
            : { type: 'text', name: parameter.name, value: parameter.value },
    );
}

function createParameters(moddle: any, parameters: TypedParameter[] | undefined, output: boolean): any[] {
    const result: any[] = [];
    (parameters || []).forEach((parameter) => {
        switch (parameter.type) {
        case 'script':
            result.push(output ? scriptOutputParameter(moddle, parameter.name, parameter.value) : scriptInputParameter(moddle, parameter.name, parameter.value));
            break;
        case 'text':
            result.push(output ? outputParameter(moddle, parameter.name, parameter.value) : inputParameter(moddle, parameter.name, parameter.value));
            break;
        }
    });
    return result;
}

export function readTask(element: any): SmartServiceTaskDescription {
    const bo = businessObject(element);
    const first = firstExtension(element);
    return {
        topic: bo.topic || '',
        name: bo.name || '',
        inputs: first ? typedParameters(first.inputParameters) : [],
        smartServiceInputs: readSmartServiceInputs(findStartElement(element)),
    } as SmartServiceTaskDescription;
}

/**
 * Makes the element an external service task for the topic and writes the dialog's inputs to the
 * start event. Result variables are named after the element id the dialog was opened for.
 */
export function writeTask(services: TaskServices, element: any, taskInfo: SmartServiceTaskDescription): void {
    const moddle = services.moddle;
    const taskId = element.id;
    const startElement = findStartElement(element);
    if (startElement) {
        setExtension(moddle, startElement.businessObject, formData(moddle, taskInfo.smartServiceInputs));
    }

    replaceTask(services, element, 'bpmn:ServiceTask', true, (task) => {
        task.topic = taskInfo.topic;
        task.name = taskInfo.name;
        const inputs = createParameters(moddle, taskInfo.inputs, false);
        const outputs = createParameters(moddle, taskInfo.outputs, true);

        switch (task.topic) {
        case 'process_deployment': {
            outputs.push(outputParameter(moddle, taskId + '_process_deployment_id', '${process_deployment_id}'));
            const fogInput = inputs.find((input) => input && input.name === 'process_deployment.prefer_fog_deployment');
            if (fogInput && fogInput.value === 'true') {
                outputs.push(outputParameter(moddle, taskId + '_is_fog_deployment', '${is_fog_deployment}'));
                outputs.push(outputParameter(moddle, taskId + '_fog_hub', '${fog_hub}'));
            }
            break;
        }
        case 'analytics':
            outputs.push(outputParameter(moddle, taskId + '_pipeline_id', '${pipeline_id}'));
            break;
        case 'export':
            outputs.push(outputParameter(moddle, taskId + '_export_id', '${export_id}'));
            break;
        case 'import':
            outputs.push(outputParameter(moddle, taskId + '_import_id', '${import_id}'));
            break;
        case 'device_repository':
            outputs.push(outputParameter(moddle, taskId + '_device_group_id', '${device_group_id}'));
            outputs.push(outputParameter(moddle, taskId + '_device_group_selection', '${device_group_iot_option}'));
            break;
        }

        setExtension(moddle, task, inputOutput(moddle, inputs, outputs));
        refresh(services, element);
    });
}

// ---- JSON extraction ----

export function readTaskInputOutput(element: any): SmartServiceTaskInputOutputDescription {
    const bo = businessObject(element);
    const first = firstExtension(element);
    return {
        name: bo.name || '',
        inputs: first ? typedParameters(first.inputParameters) : [],
        outputs: first ? typedParameters(first.outputParameters) : [],
    } as SmartServiceTaskInputOutputDescription;
}

/** Makes the element a plain bpmn:Task whose input/output mapping does the extraction. */
export function writeJsonExtraction(services: TaskServices, element: any, taskInfo: SmartServiceTaskInputOutputDescription): void {
    const moddle = services.moddle;
    replaceTask(services, element, 'bpmn:Task', false, (task) => {
        task.name = taskInfo.name;
        const inputs = createParameters(moddle, taskInfo.inputs, false);
        const outputs = createParameters(moddle, taskInfo.outputs, true);
        setExtension(moddle, task, inputOutput(moddle, inputs, outputs));
        refresh(services, element);
    });
}
