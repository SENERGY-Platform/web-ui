/*
 * Copyright 2026 InfAI (CC SES)
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

import { is } from 'bpmn-js/lib/util/ModelUtil';
import { augmentScriptEntries } from '../../../processes/designer/bpmn-js/properties-provider/ScriptEditorEntry';
import { attributeTextEntry, buttonEntry } from '../../../processes/designer/bpmn-js/properties-provider/senergy-entries';
import { modelServices } from '../../../processes/designer/bpmn-js/model/bpmn-elements';
import {
    readSmartServiceInputs,
    readTask,
    readTaskInputOutput,
    writeJsonExtraction,
    writeSmartServiceInputs,
    writeTask,
} from './smart-service-writers';
import { MESSAGE_NAME_ATTRIBUTE } from './done-event';

// after the Camunda Platform provider (500), so the script entries it adds can be augmented
const LOW_PRIORITY = 400;

var isTask = function (element) {
    return is(element, 'bpmn:Task') && !is(element, 'bpmn:ReceiveTask');
};

var isStartEvent = function (element) {
    return is(element, 'bpmn:StartEvent');
};

var isMessageCatchEvent = function (element) {
    var definitions = element.businessObject && element.businessObject.eventDefinitions;
    return is(element, 'bpmn:IntermediateCatchEvent') && !!definitions && !!definitions[0] && definitions[0].$type === 'bpmn:MessageEventDefinition';
};

var isCollaborationOrProcess = function (element) {
    return is(element, 'bpmn:Collaboration') || is(element, 'bpmn:Process');
};

/**
 * The smart-service groups for the element, top to bottom. Every button reads designerCallbacks
 * when clicked and hands the dialog's answer to the writers in ./smart-service-writers.
 */
export function smartServiceGroups(element, bpmnjs) {
    var callbacks = function () {
        return bpmnjs.designerCallbacks || {};
    };
    var services = function () {
        return modelServices(bpmnjs);
    };
    var groups = [];
    var add = function (id, label, enabled, entries) {
        if (enabled) {
            groups.push({ id: id, label: label, entries: entries, shouldOpen: true });
        }
    };

    add('smart_service_inputs_group', 'Smart-Service Inputs', isStartEvent(element), [
        buttonEntry('smart-service-inputs-button', 'Edit Smart-Service Inputs', function (el) {
            callbacks().openSmartServiceInputsEditDialog(readSmartServiceInputs(el), el, function (info) {
                writeSmartServiceInputs(services(), el, info);
            });
        }),
    ]);

    add('task', 'Smart-Service Task', isTask(element), [
        buttonEntry('smart-service-task-button', 'Edit Smart-Service Task', function (el) {
            callbacks().openTaskEditDialog(readTask(el), el, function (taskInfo) {
                writeTask(services(), el, taskInfo);
            });
        }),
        buttonEntry('smart-service-extract-button', 'Extract Field from JSON', function (el) {
            callbacks().openExtractJsonFieldsDialog(readTaskInputOutput(el), el, function (taskInfo) {
                writeJsonExtraction(services(), el, taskInfo);
            });
        }),
    ]);

    add('description', 'Smart-Service Description', isCollaborationOrProcess(element), [
        attributeTextEntry('desc-field', 'Description', 'senergy:description'),
    ]);

    add('message-name', 'Wait for Message', isMessageCatchEvent(element), [
        attributeTextEntry(
            'senergy-message-name',
            'Message Name (JavaScript)',
            MESSAGE_NAME_ATTRIBUTE,
            'Expression for the name of the awaited message, e.g. Task_1_done_event to wait for the completion of task Task_1. Replaces a message name like ${...}.',
        ),
    ]);

    return groups;
}

class SmartServicePropertiesProvider {
    constructor(propertiesPanel, bpmnjs) {
        propertiesPanel.registerProvider(LOW_PRIORITY, this);
        this._bpmnjs = bpmnjs;
    }

    getGroups(element) {
        // gives the camunda script fields (sequence flow conditions in particular) the same
        // editor button the process designer has; these decide which way a smart service proceeds
        return (groups) => smartServiceGroups(element, this._bpmnjs).concat(augmentScriptEntries(groups));
    }
}

SmartServicePropertiesProvider.$inject = ['propertiesPanel', 'bpmnjs'];

export default {
    __init__: ['smartServicePropertiesProvider'],
    smartServicePropertiesProvider: ['type', SmartServicePropertiesProvider],
};
