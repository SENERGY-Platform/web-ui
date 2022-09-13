/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var iotProps = require('./IotProps');

var ImplementationTypeHelper = require('bpmn-js-properties-panel/lib/helper/ImplementationTypeHelper');
var is = require('bpmn-js/lib/util/ModelUtil').is;
var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;
var inherits = require('inherits');
var PropertiesActivator = require('bpmn-js-properties-panel/lib/PropertiesActivator');

var CamundaProvider = require('bpmn-js-properties-panel/lib/provider/camunda').propertiesProvider[1];

function SenergyPropertiesProvider(eventBus, canvas, bpmnFactory, elementRegistry, elementTemplates, bpmnjs, replace, selection, modeling, translate) {
    this.getTabs = function(element) {
        var camunda = new CamundaProvider(eventBus, canvas, bpmnFactory, elementRegistry, elementTemplates, translate);
        var camundaTabs = camunda.getTabs(element);
        camundaTabs[0].groups.unshift(createDescriptionGroup(element));
        camundaTabs[0].groups.unshift(createOrderGroup(element));
        camundaTabs[0].groups.unshift(createIotInfoGroup(element, bpmnjs));
        camundaTabs[0].groups.unshift(createIotMsgEventGroup(element, bpmnjs, eventBus, modeling));
        camundaTabs[0].groups.unshift(createIotExternalTaskGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection));
        camundaTabs[0].groups.unshift(createProcessIoTaskGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection));
        camundaTabs[0].groups.unshift(createHelperGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection));
        camundaTabs[0].groups.unshift(createInfluxTaskGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection));
        camundaTabs[0].groups.unshift(createTimeEventHelperGroup(element, bpmnjs, eventBus, modeling));
        return camundaTabs;
    };
}

var isTask = function(element){
  return is(element, "bpmn:Task") && !is(element, "bpmn:ReceiveTask")
};

var isEvent = function(element) {
    return element.type == "bpmn:StartEvent"  || element.type == "bpmn:IntermediateCatchEvent";
};

var isMsgEvent = function (element) {
    return element.businessObject && element.businessObject.eventDefinitions && element.businessObject.eventDefinitions[0] && element.businessObject.eventDefinitions[0].$type == "bpmn:MessageEventDefinition"
};

var isOrderElement = function (element) {
    return isTask(element) || isMsgEvent(element) || isTimeEvent(element)
};


var isTimeEvent = function (element) {
    return element.businessObject && element.businessObject.eventDefinitions && element.businessObject.eventDefinitions[0] && element.businessObject.eventDefinitions[0].$type == "bpmn:TimerEventDefinition"
};

var isCollaborationOrProcess = function (element) {
    return is(element, "bpmn:Collaboration") || is(element, "bpmn:Process")
    // return element.businessObject && element.businessObject.eventDefinitions && element.businessObject.eventDefinitions[0] && element.businessObject.eventDefinitions[0].$type == "bpmn:TimerEventDefinition"
};

function createIotExternalTaskGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var iotGroup = {
        id: 'iot-extern',
        label: 'Function',
        entries: [],
        enabled: isTask
    };
    iotProps.external(iotGroup, element, bpmnjs, eventBus, bpmnFactory, replace, selection);
    return iotGroup;
}

function createProcessIoTaskGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var iotGroup = {
        id: 'process-io',
        label: 'Process-IO',
        entries: [],
        enabled: isTask
    };
    iotProps.io(iotGroup, element, bpmnjs, eventBus, bpmnFactory, replace, selection);
    return iotGroup;
}

function createIotMsgEventGroup(element, bpmnjs, eventBus, modeling) {
    var iotGroup = {
        id: 'iot-event',
        label: 'IoT-Message-Event',
        entries: [],
        enabled: isMsgEvent
    };
    iotProps.msgevent(iotGroup, element, bpmnjs, eventBus, modeling);
    return iotGroup;
}

function createHelperGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var helperGroup = {
        id: 'iot-helper',
        label: 'IoT-Helper',
        entries: [],
        enabled: isTask
    };
    iotProps.email(helperGroup, element, bpmnjs, eventBus, bpmnFactory, replace, selection);
    iotProps.notification(helperGroup, element, bpmnjs, eventBus, bpmnFactory, replace, selection);
    return helperGroup;
}


function createInfluxTaskGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var iotGroup = {
        id: 'iot-influx',
        label: 'Historic Data',
        entries: [],
        enabled: isTask
    };
    iotProps.influx(iotGroup, element, bpmnjs, eventBus, bpmnFactory, replace, selection);
    return iotGroup;
}


function createIotInfoGroup(element, bpmnjs) {
    var infoGroup = {
        id: 'iot-info',
        label: 'IoT-Info',
        entries: [],
        enabled: isTask
    };
    iotProps.info(infoGroup, element, bpmnjs);
    return infoGroup;
}

function createTimeEventHelperGroup(element, bpmnjs, eventBus, modeling){
    var timeEventGroup = {
        id: 'time-event-helper',
        label: 'Time-Event-Helper',
        entries: [],
        enabled: isTimeEvent
    };
    iotProps.timeHelper(timeEventGroup, element, bpmnjs, eventBus, modeling);
    return timeEventGroup;
}

function createDescriptionGroup(){
    var descGroup = {
        id: 'description',
        label: 'Process Description',
        entries: [],
        enabled: isCollaborationOrProcess
    };
    iotProps.description(descGroup);
    return descGroup;
}


function createOrderGroup(){
    var group = {
        id: 'order',
        label: 'Deployment-Order',
        entries: [],
        enabled: isOrderElement
    };
    iotProps.order(group);
    return group;
}

SenergyPropertiesProvider.$inject = [
    'eventBus',
    'canvas',
    'bpmnFactory',
    'elementRegistry',
    'elementTemplates',
    'bpmnjs',
    'replace',
    'selection',
    'modeling',
    'translate'
];

inherits(SenergyPropertiesProvider, PropertiesActivator);

module.exports = SenergyPropertiesProvider;
