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
 * bpmn-js 4 (ModelCloneHelper) dropped an extension element on replace and paste unless the
 * new element's exact type was listed in the extension's allowedIn; bpmn-js 18 copies all of
 * them. The lists are those of camunda-bpmn-moddle 4.5.0, which the designers ran with.
 */
const LEGACY_ALLOWED_IN: Record<string, string[]> = {
    'camunda:Connector': ['camunda:ServiceTaskLike'],
    'camunda:ExecutionListener': [
        'bpmn:Task', 'bpmn:ServiceTask', 'bpmn:UserTask', 'bpmn:BusinessRuleTask', 'bpmn:ScriptTask', 'bpmn:ReceiveTask', 'bpmn:ManualTask',
        'bpmn:ExclusiveGateway', 'bpmn:SequenceFlow', 'bpmn:ParallelGateway', 'bpmn:InclusiveGateway', 'bpmn:EventBasedGateway',
        'bpmn:StartEvent', 'bpmn:IntermediateCatchEvent', 'bpmn:IntermediateThrowEvent', 'bpmn:EndEvent', 'bpmn:BoundaryEvent',
        'bpmn:CallActivity', 'bpmn:SubProcess', 'bpmn:Process',
    ],
    'camunda:FailedJobRetryTimeCycle': ['camunda:AsyncCapable', 'bpmn:MultiInstanceLoopCharacteristics'],
    'camunda:Field': ['camunda:ServiceTaskLike', 'camunda:ExecutionListener', 'camunda:TaskListener'],
    'camunda:FormData': ['bpmn:StartEvent', 'bpmn:UserTask'],
    'camunda:FormProperty': ['bpmn:StartEvent', 'bpmn:UserTask'],
    'camunda:In': ['bpmn:CallActivity', 'bpmn:SignalEventDefinition'],
    'camunda:InputOutput': ['bpmn:FlowNode', 'camunda:Connector'],
    'camunda:Out': ['bpmn:CallActivity'],
    'camunda:Properties': ['*'],
    'camunda:TaskListener': ['bpmn:UserTask'],
};

/** The element the copy is made for: the top of the $parent chain being built. */
function copyTarget(element: any): any {
    let target = element;
    while (target.$parent) {
        target = target.$parent;
    }
    return target;
}

/** Whether bpmn-js 4 copied an extension element of `type` into an element of `targetType`; it compared type names exactly. */
export function legacyAllowsCopy(type: string, targetType: string): boolean {
    const allowedIn = LEGACY_ALLOWED_IN[type];
    if (!allowedIn || (allowedIn.length === 1 && allowedIn[0] === '*')) {
        return true;
    }
    return allowedIn.indexOf(targetType) !== -1;
}

class ExtensionCopyRules {
    static $inject = ['eventBus'];

    constructor(eventBus: any) {
        // before ModdleCopy's own default rule (priority 1000)
        eventBus.on('moddleCopy.canCopyProperty', 1500, (context: { parent: any; property: any; propertyName: string }) => {
            const { parent, property, propertyName } = context;
            if (propertyName !== 'values' || !parent || parent.$type !== 'bpmn:ExtensionElements' || !property || !property.$type) {
                return undefined;
            }
            return legacyAllowsCopy(property.$type, copyTarget(parent).$type) ? undefined : false;
        });
    }
}

export const extensionCopyRulesModule = {
    __init__: ['extensionCopyRules'],
    extensionCopyRules: ['type', ExtensionCopyRules],
};
