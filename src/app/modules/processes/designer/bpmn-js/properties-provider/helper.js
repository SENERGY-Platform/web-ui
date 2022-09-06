/*
 * Copyright 2019 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var pick = require('lodash.pick');
var assign = require('lodash.assign');

var is = require('bpmn-js/lib/util/ModelUtil').is,
    isEventSubProcess = require('bpmn-js/lib/util/DiUtil').isEventSubProcess;

module.exports = {
    toMessageEvent: toMessageEvent,
    toExternalServiceTask: toExternalServiceTask,
    getOutputPaths: getOutputPaths,
    toServiceTask: toServiceTask
};

var CUSTOM_PROPERTIES = [
    'cancelActivity',
    'instantiate',
    'eventGatewayType',
    'triggeredByEvent',
    'isInterrupting'
];

function toMessageEvent(bpmnFactory, replace, selection, element, additionalChanges){
    var EventTargets = {
        "bpmn:StartEvent":{
            type: 'bpmn:StartEvent',
            eventDefinitionType: 'bpmn:MessageEventDefinition'
        },
        "bpmn:IntermediateCatchEvent":{
            type: 'bpmn:IntermediateCatchEvent',
            eventDefinitionType: 'bpmn:MessageEventDefinition'
        }
    };

    var target = EventTargets[element.type];
    if(!target){
        console.log("not implemented event type: ", oldBusinessObject.type);
        return
    }
    var type = target.type;


    var hints = {};

    var oldBusinessObject = element.businessObject;

    var newBusinessObject = bpmnFactory.create(type);
    newBusinessObject.type = "external";
    newBusinessObject.topic = "";

    var newElement = {
        type: type,
        businessObject: newBusinessObject
    };

    if (target.eventDefinitionType) {
        newElement.eventDefinitionType = target.eventDefinitionType;
    }

    // initialize special properties defined in target definition
    assign(newBusinessObject, pick(target, CUSTOM_PROPERTIES));

    newBusinessObject.name = oldBusinessObject.name;

    // retain loop characteristics if the target element is not an event sub process
    if (!isEventSubProcess(newBusinessObject)) {
        newBusinessObject.loopCharacteristics = oldBusinessObject.loopCharacteristics;
    }

    // retain default flow's reference between inclusive <-> exclusive gateways and activities
    if ((is(oldBusinessObject, 'bpmn:ExclusiveGateway') || is(oldBusinessObject, 'bpmn:InclusiveGateway') ||
        is(oldBusinessObject, 'bpmn:Activity')) &&
        (is(newBusinessObject, 'bpmn:ExclusiveGateway') || is(newBusinessObject, 'bpmn:InclusiveGateway') ||
        is(newBusinessObject, 'bpmn:Activity')))
    {
        newBusinessObject.default = oldBusinessObject.default;
    }

    if (oldBusinessObject.isForCompensation) {
        newBusinessObject.isForCompensation = true;
    }

    newElement = replace.replaceElement(element, newElement, hints);

    if (hints.select !== false) {
        selection.select(newElement);
    }

    if(additionalChanges){
        additionalChanges(newBusinessObject, newElement);
    }
}

function toServiceTask(bpmnFactory, replace, selection, element, additionalChanges) {
    var target = {
        type: 'bpmn:ServiceTask'
    };
    var hints = {};

    var type = target.type;
    var oldBusinessObject = element.businessObject;

    var newBusinessObject = bpmnFactory.create(type);

    var newElement = {
        type: type,
        businessObject: newBusinessObject
    };

    // initialize special properties defined in target definition
    assign(newBusinessObject, pick(target, CUSTOM_PROPERTIES));

    newBusinessObject.name = oldBusinessObject.name;

    // retain loop characteristics if the target element is not an event sub process
    if (!isEventSubProcess(newBusinessObject)) {
        newBusinessObject.loopCharacteristics = oldBusinessObject.loopCharacteristics;
    }

    // retain default flow's reference between inclusive <-> exclusive gateways and activities
    if ((is(oldBusinessObject, 'bpmn:ExclusiveGateway') || is(oldBusinessObject, 'bpmn:InclusiveGateway') ||
        is(oldBusinessObject, 'bpmn:Activity')) &&
        (is(newBusinessObject, 'bpmn:ExclusiveGateway') || is(newBusinessObject, 'bpmn:InclusiveGateway') ||
            is(newBusinessObject, 'bpmn:Activity')))
    {
        newBusinessObject.default = oldBusinessObject.default;
    }

    if (oldBusinessObject.isForCompensation) {
        newBusinessObject.isForCompensation = true;
    }

    if(additionalChanges){
        additionalChanges(newBusinessObject, newElement);
    }

    newElement = replace.replaceElement(element, newElement, hints);

    if (hints.select !== false) {
        selection.select(newElement);
    }
}

function toExternalServiceTask(bpmnFactory, replace, selection, element, additionalChanges) {
    var target = {
        type: 'bpmn:ServiceTask'
    };
    var hints = {};

    var type = target.type;
    var oldBusinessObject = element.businessObject;

    var newBusinessObject = bpmnFactory.create(type);
    newBusinessObject.type = "external";
    newBusinessObject.topic = "";

    var newElement = {
        type: type,
        businessObject: newBusinessObject
    };

    // initialize special properties defined in target definition
    assign(newBusinessObject, pick(target, CUSTOM_PROPERTIES));

    newBusinessObject.name = oldBusinessObject.name;

    // retain loop characteristics if the target element is not an event sub process
    if (!isEventSubProcess(newBusinessObject)) {
        newBusinessObject.loopCharacteristics = oldBusinessObject.loopCharacteristics;
    }

    // retain default flow's reference between inclusive <-> exclusive gateways and activities
    if ((is(oldBusinessObject, 'bpmn:ExclusiveGateway') || is(oldBusinessObject, 'bpmn:InclusiveGateway') ||
        is(oldBusinessObject, 'bpmn:Activity')) &&
        (is(newBusinessObject, 'bpmn:ExclusiveGateway') || is(newBusinessObject, 'bpmn:InclusiveGateway') ||
        is(newBusinessObject, 'bpmn:Activity')))
    {
        newBusinessObject.default = oldBusinessObject.default;
    }

    if (oldBusinessObject.isForCompensation) {
        newBusinessObject.isForCompensation = true;
    }

    if(additionalChanges){
        additionalChanges(newBusinessObject, newElement);
    }

    newElement = replace.replaceElement(element, newElement, hints);

    if (hints.select !== false) {
        selection.select(newElement);
    }
}

function isPrimitive(test) {
    return (test !== Object(test));
}



function getOutputPaths(structure, currentPath){
    if(!currentPath){
        currentPath = ["outputs"];
    }

    if(isPrimitive(structure)){
        return [currentPath];
    }

    var result = [];
    for (key in structure){
        if(structure.hasOwnProperty(key)){
            result = result.concat(getInputPaths(structure[key], currentPath.concat([key])));
        }
    }

    return result;
}
