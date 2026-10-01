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
 * Builds the camunda elements both designers write. Panel-independent: everything here goes
 * through moddle and modeler services only, so it works the same under any properties panel.
 */

/** The modeler services the writers use; any bpmn-js modeler provides them under these names. */
export interface ModelServices {
    moddle: any;
    bpmnFactory: any;
    replace: any;
    selection: any;
    modeling: any;
    eventBus: any;
}

export function modelServices(modeler: any): ModelServices {
    return {
        moddle: modeler.get('moddle'),
        bpmnFactory: modeler.get('bpmnFactory'),
        replace: modeler.get('replace'),
        selection: modeler.get('selection'),
        modeling: modeler.get('modeling'),
        eventBus: modeler.get('eventBus'),
    };
}

export function businessObject(element: any): any {
    return (element && element.businessObject) || element;
}

/** Same check as bpmn-js ModelUtil.is, through the moddle API both bpmn-js versions share. */
export function isType(element: any, type: string): boolean {
    const bo = businessObject(element);
    return !!bo && typeof bo.$instanceOf === 'function' && bo.$instanceOf(type);
}

/** The first extension element; the designers keep their camunda:InputOutput (or connector, formData) there. */
export function firstExtension(element: any): any {
    const bo = businessObject(element);
    return bo && bo.extensionElements && bo.extensionElements.values && bo.extensionElements.values[0];
}

/** Text parameter; undefined for a null value, as the designers always did. */
export function inputParameter(moddle: any, name: string, value: any): any {
    return value !== null ? moddle.create('camunda:InputParameter', { name, value }) : undefined;
}

export function outputParameter(moddle: any, name: string, value: any): any {
    return value !== null ? moddle.create('camunda:OutputParameter', { name, value }) : undefined;
}

function script(moddle: any, value: string): any {
    return moddle.create('camunda:Script', { scriptFormat: 'Javascript', value });
}

export function scriptInputParameter(moddle: any, name: string, value: string): any {
    return moddle.create('camunda:InputParameter', { name, definition: script(moddle, value) });
}

export function scriptOutputParameter(moddle: any, name: string, value: string): any {
    return moddle.create('camunda:OutputParameter', { name, definition: script(moddle, value) });
}

/**
 * Leaves out the parameters a null value produced: the module workers only replace a default
 * when the variable is present, and an empty parameter reaches them as the string "null".
 */
export function inputOutput(moddle: any, inputs: any[] | undefined, outputs: any[] | undefined): any {
    const present = (parameters: any[] | undefined) => parameters && parameters.filter((parameter) => parameter !== undefined);
    return moddle.create('camunda:InputOutput', { inputParameters: present(inputs), outputParameters: present(outputs) });
}

export function connector(moddle: any, connectorId: string, inputs: any[], outputs: any[]): any {
    return moddle.create('camunda:Connector', { connectorId, inputOutput: inputOutput(moddle, inputs, outputs) });
}

/** Replaces all extension elements of a business object with the one given. */
export function setExtension(moddle: any, bo: any, child: any): void {
    bo.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [child] });
}

/** Lets the panel re-render the element after a change made outside the command stack. */
export function refresh(services: Pick<ModelServices, 'eventBus'>, element: any): void {
    services.eventBus.fire('elements.changed', { elements: [element] });
}

/**
 * Replaces a task with a fresh bpmn:Task or bpmn:ServiceTask (camunda:type="external" when
 * external), keeping name, loop, default flow and compensation. `change` fills the new business
 * object before the replacement, so the replaced shape renders with it.
 */
export function replaceTask(
    services: Pick<ModelServices, 'bpmnFactory' | 'replace' | 'selection'>,
    element: any,
    type: 'bpmn:Task' | 'bpmn:ServiceTask',
    external: boolean,
    change: (bo: any, newElement: any) => void,
): void {
    const old = element.businessObject;
    const bo = services.bpmnFactory.create(type);
    if (external) {
        bo.type = 'external';
        bo.topic = '';
    }
    const newElement = { type, businessObject: bo };

    bo.name = old.name;
    // a fresh task is never an event subprocess, so its loop characteristics always carry over
    bo.loopCharacteristics = old.loopCharacteristics;
    if (isType(old, 'bpmn:ExclusiveGateway') || isType(old, 'bpmn:InclusiveGateway') || isType(old, 'bpmn:Activity')) {
        bo.default = old.default;
    }
    if (old.isForCompensation) {
        bo.isForCompensation = true;
    }

    change(bo, newElement);

    services.selection.select(services.replace.replaceElement(element, newElement, {}));
}
