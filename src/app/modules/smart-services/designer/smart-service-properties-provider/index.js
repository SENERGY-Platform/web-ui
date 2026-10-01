/* eslint-env es2020 */

import { is } from 'bpmn-js/lib/util/ModelUtil';
import inherits from 'inherits';
import PropertiesActivator from 'bpmn-js-properties-panel/lib/PropertiesActivator';
import * as camundaimport from 'bpmn-js-properties-panel/lib/provider/camunda' ;
import { textBox } from 'bpmn-js-properties-panel/lib/factory/EntryFactory';
import { augmentScriptEntries } from '../../../processes/designer/bpmn-js/properties-provider/ScriptEditorEntry';
import { modelServices } from '../../../processes/designer/bpmn-js/model/bpmn-elements';
import {
    readSmartServiceInputs,
    readTask,
    readTaskInputOutput,
    writeJsonExtraction,
    writeSmartServiceInputs,
    writeTask,
} from './smart-service-writers';

var CamundaProvider = camundaimport.propertiesProvider[1];

// The entries below only open the dialogs; what they read and write lives in ./smart-service-writers.

function SmartServicePropertiesProvider(eventBus, canvas, bpmnFactory, elementRegistry, elementTemplates, bpmnjs, translate) {
    this.getTabs = function(element) {
        var camunda = new CamundaProvider(eventBus, canvas, bpmnFactory, elementRegistry, elementTemplates, translate);
        var camundaTabs = camunda.getTabs(element);
        camundaTabs[0].groups.unshift(createDescriptionGroup());
        camundaTabs[0].groups.unshift(createTaskGroup(bpmnjs));
        camundaTabs[0].groups.unshift(createSmartServiceInputsGroup(bpmnjs));
        // gives the camunda script fields (sequence flow conditions in particular) the
        // same editor button the process designer has -- the panel's own field is a few
        // lines tall and these decide which way a smart service proceeds
        augmentScriptEntries(camundaTabs, bpmnjs);
        return camundaTabs;
    };
}

var isTask = function(element){
    return is(element, "bpmn:Task") && !is(element, "bpmn:ReceiveTask")
};

var isStartEvent = function(element) {
    return is(element, "bpmn:StartEvent");
};

var isCollaborationOrProcess = function (element) {
    return is(element, "bpmn:Collaboration") || is(element, "bpmn:Process")
};

function createDescriptionGroup(){
    return {
        id: 'description',
        label: 'Smart-Service Description',
        entries: [
            textBox({
                id : 'desc-field',
                label : 'Description',
                modelProperty : 'senergy:description'
            })
        ],
        enabled: isCollaborationOrProcess
    };
}

function createTaskGroup(bpmnjs){
    return {
        id: 'task',
        label: 'Smart-Service Task',
        entries: [
            {
                id: "smart-service-task-button",
                html: "<button class='bpmn-iot-button' data-action='editSmartServiceTask'>Edit Smart-Service Task</button>",
                editSmartServiceTask: function (element) {
                    bpmnjs.designerCallbacks.openTaskEditDialog(readTask(element), element, function (taskInfo) {
                        writeTask(modelServices(bpmnjs), element, taskInfo);
                    });
                    return true;
                }
            },
            {
                id: "smart-service-extract-button",
                html: "<button class='bpmn-iot-button' data-action='extractJsonFields'>Extract Field from JSON</button>",
                extractJsonFields: function (element) {
                    bpmnjs.designerCallbacks.openExtractJsonFieldsDialog(readTaskInputOutput(element), element, function (taskInfo) {
                        writeJsonExtraction(modelServices(bpmnjs), element, taskInfo);
                    });
                    return true;
                }
            }
        ],
        enabled: isTask
    };
}

function createSmartServiceInputsGroup(bpmnjs){
    return {
        id: 'smart_service_inputs_group',
        label: 'Smart-Service Inputs',
        entries: [
            {
                id: "smart-service-inputs-button",
                html: "<button class='bpmn-iot-button' data-action='editSmartServiceInputs'>Edit Smart-Service Inputs</button>",
                editSmartServiceInputs: function (element) {
                    bpmnjs.designerCallbacks.openSmartServiceInputsEditDialog(readSmartServiceInputs(element), element, function (info) {
                        writeSmartServiceInputs(modelServices(bpmnjs), element, info);
                    });
                    return true;
                }
            }
        ],
        enabled: isStartEvent
    };
}

SmartServicePropertiesProvider.$inject = [
    'eventBus',
    'canvas',
    'bpmnFactory',
    'elementRegistry',
    'elementTemplates',
    'bpmnjs',
    'translate'
];

inherits(SmartServicePropertiesProvider, PropertiesActivator);

export const __init__ = ['propertiesProvider'];
export const propertiesProvider = ['type', SmartServicePropertiesProvider];
