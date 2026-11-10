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
 * The error boundary event of the automation-engine (BPMN-19, SNRGY-5130): it catches every error
 * of the task it is attached to. The engine sets the local variables error_message and, for device
 * commands, device_id and service_id at the boundary event; camunda:errorMessageVariable copies the
 * message into an instance variable. The other two reach the process through output mappings of the
 * boundary event, which the Camunda panel does not offer for boundary events.
 */

import { businessObject, isType } from './bpmn-elements';

/** Local variables of the boundary event with the device and service of a failed device command. */
export type ErrorVariable = 'device_id' | 'service_id';

export function isErrorBoundary(element: any): boolean {
    const definitions = businessObject(element)?.eventDefinitions;
    return isType(element, 'bpmn:BoundaryEvent') && !!definitions && definitions.length === 1 && isType(definitions[0], 'bpmn:ErrorEventDefinition');
}

/** Whether the boundary event is attached to a service task, which may be a device command. */
export function isOnServiceTask(element: any): boolean {
    return isType(businessObject(element)?.attachedToRef, 'bpmn:ServiceTask');
}

/**
 * The script of the output mapping; a task that is no device command has no device_id, which a
 * plain reference would turn into an incident at the boundary event.
 */
export function errorVariableScript(local: ErrorVariable): string {
    return `typeof ${local} === 'undefined' ? null : ${local}`;
}

function inputOutputOf(element: any): any {
    const values = businessObject(element)?.extensionElements?.values || [];
    return values.find((value: any) => isType(value, 'camunda:InputOutput'));
}

function mapsLocal(parameter: any, local: ErrorVariable): boolean {
    const definition = parameter.definition;
    if (!definition || !isType(definition, 'camunda:Script')) {
        return false;
    }
    const value = (definition.value || '').trim();
    return value === errorVariableScript(local) || value === local;
}

/** The instance variable the boundary event maps the local variable to; '' if none. */
export function readErrorVariable(element: any, local: ErrorVariable): string {
    const parameter = (inputOutputOf(element)?.outputParameters || []).find((p: any) => mapsLocal(p, local));
    return parameter ? parameter.name || '' : '';
}

/**
 * Maps the local variable to the instance variable name, or removes the mapping for an empty name.
 * One command on the command stack, so that undo and the unsaved-changes guard see it; other
 * extension elements and mappings stay.
 */
export function writeErrorVariable(modeling: any, moddle: any, element: any, local: ErrorVariable, name: string): void {
    const bo = businessObject(element);
    const trimmed = (name || '').trim();
    const current = inputOutputOf(element);
    const outputs = (current?.outputParameters || []).filter((p: any) => !mapsLocal(p, local));
    if (trimmed !== '') {
        const script = moddle.create('camunda:Script', { scriptFormat: 'Javascript', value: errorVariableScript(local) });
        outputs.push(moddle.create('camunda:OutputParameter', { name: trimmed, definition: script }));
    }
    const inputs = current?.inputParameters || [];
    const others = (bo.extensionElements?.values || []).filter((value: any) => value !== current);
    const values = [...others];
    if (inputs.length || outputs.length) {
        values.push(moddle.create('camunda:InputOutput', { inputParameters: inputs, outputParameters: outputs }));
    }
    const extensionElements = values.length ? moddle.create('bpmn:ExtensionElements', { values }) : undefined;
    modeling.updateModdleProperties(element, bo, { extensionElements });
}
