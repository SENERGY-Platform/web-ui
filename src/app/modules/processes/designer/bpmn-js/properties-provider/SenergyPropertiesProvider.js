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


import { is } from 'bpmn-js/lib/util/ModelUtil';
import { augmentScriptEntries } from './ScriptEditorEntry';
import { attributeSelectEntry, attributeTextEntry, buttonEntry, htmlEntry } from './senergy-entries';
import { modelServices, refresh } from '../model/bpmn-elements';
import {
    hasEditableInputs,
    hasOutputsForTopic,
    orderOptions,
    readConditionalEvent,
    readDeviceTask,
    readHistoricDataConfig,
    readIncident,
    readNotification,
    readProcessIo,
    readTimer,
    taskOutputParameters,
    writeConditionalEvent,
    writeDeviceTask,
    writeHistoricDataConfig,
    writeIncident,
    writeNotification,
    writeProcessIo,
    writeTimer,
} from '../model/process-writers';

// after the Camunda Platform provider (500), so the script entries it adds can be augmented
const LOW_PRIORITY = 400;

var isTask = function (element) {
    return is(element, 'bpmn:Task') && !is(element, 'bpmn:ReceiveTask');
};

var firstEventDefinitionType = function (element) {
    var definitions = element.businessObject && element.businessObject.eventDefinitions;
    return definitions && definitions[0] && definitions[0].$type;
};

var isMsgEvent = function (element) {
    return firstEventDefinitionType(element) === 'bpmn:MessageEventDefinition';
};

var isTimeEvent = function (element) {
    return firstEventDefinitionType(element) === 'bpmn:TimerEventDefinition';
};

var isOrderElement = function (element) {
    return isTask(element) || isMsgEvent(element) || isTimeEvent(element);
};

var isCollaborationOrProcess = function (element) {
    return is(element, 'bpmn:Collaboration') || is(element, 'bpmn:Process');
};

/**
 * The Senergy groups for the element, top to bottom. Every button reads designerCallbacks when
 * clicked and hands the dialog's answer to the writers in ../model/process-writers.
 */
export function senergyGroups(element, bpmnjs) {
    var callbacks = function () {
        return bpmnjs.designerCallbacks || {};
    };
    var services = function () {
        return modelServices(bpmnjs);
    };
    var groups = [];
    var add = function (id, label, enabled, entries) {
        if (enabled && entries.length) {
            groups.push({ id: id, label: label, entries: entries, shouldOpen: true });
        }
    };

    var task = isTask(element);

    add('incident', 'Incident', task, callbacks().processIncident != null ? [
        buttonEntry('process-incident-helper', 'Incident', function (el) {
            callbacks().processIncident(readIncident(el), function (config) {
                writeIncident(services(), el, config);
            });
        }),
    ] : []);

    var timerEntry = function (id, label, kind, dialog, body) {
        return buttonEntry(id, label, function (el) {
            callbacks()[dialog](readTimer(el, kind)).then(function (result) {
                writeTimer(services(), el, kind, body(result), result.text);
            }, function () {
            });
        });
    };
    add('time-event-helper', 'Time-Event-Helper', isTimeEvent(element), [
        timerEntry('set-duration', 'set Duration', 'timeDuration', 'durationDialog', function (result) { return result.iso.string; }),
        timerEntry('set-date', 'set Date', 'timeDate', 'dateDialog', function (result) { return result.iso; }),
        timerEntry('set-cycle', 'set Cycle', 'timeCycle', 'cycleDialog', function (result) { return result.cron; }),
    ]);

    var outputsButton = function (id) {
        return buttonEntry(id, 'Select Output-Variables', function (el) {
            callbacks().editOutput(taskOutputParameters(el), function () {
                refresh(services(), el);
            });
        });
    };

    var influx = [
        buttonEntry('iot-influx-device-type-select-button', 'Add data analysis', function (el) {
            callbacks().editHistoricDataConfig(readHistoricDataConfig(el), function (config) {
                writeHistoricDataConfig(services(), el, config);
            });
        }),
    ];
    if (task && hasOutputsForTopic(element, 'export')) {
        influx.push(outputsButton('iot-influx-device-output-edit-button'));
    }
    add('iot-influx', 'Historic Data', task, influx);

    add('iot-helper', 'IoT-Helper', task, callbacks().configNotification ? [
        buttonEntry('send-notification-helper', 'Notification', function (el) {
            var current = readNotification(el);
            callbacks().configNotification(current.subject, current.content, function (subject, content) {
                writeNotification(services(), el, subject, content);
            }, function () {
            });
        }),
    ] : []);

    add('process-io', 'Process-IO', task, [
        buttonEntry('process-io-button', 'Process-IO', function (el) {
            callbacks().getProcessIoConfigs(function (config) {
                callbacks().openProcessIoDialog(readProcessIo(config, el), function (infos) {
                    writeProcessIo(services(), el, config, infos);
                });
            });
        }, 'process-io-button'),
    ]);

    var external = [
        buttonEntry('iot-extern-device-type-select-button', 'Select Function', function (el) {
            callbacks().findIotDeviceType(readDeviceTask(el), function (connectorInfo) {
                writeDeviceTask(services(), el, connectorInfo);
            });
        }),
    ];
    if (task && hasEditableInputs(element)) {
        external.push(buttonEntry('iot-extern-device-input-edit-button', 'Edit Input', function (el) {
            callbacks().editInput(el, function () {
                refresh(services(), el);
            });
        }));
    }
    if (task && hasOutputsForTopic(element, 'pessimistic')) {
        external.push(outputsButton('iot-extern-device-output-edit-button'));
    }
    add('iot-extern', 'Function', task, external);

    add('iot-event', 'Event', isMsgEvent(element), [
        buttonEntry('iot-conditional-event-button', 'Edit Conditional Event', function (el) {
            var edit = callbacks().editConditionalEvent;
            if (!edit) {
                console.log('missing bpmnjs.designerCallbacks.editConditionalEvent()');
                return;
            }
            edit(readConditionalEvent(el), function (response) {
                writeConditionalEvent(services(), el, response);
            });
        }),
        attributeTextEntry('aspect-field', 'Aspect', 'senergy:aspect'),
        attributeTextEntry('aspects-field', 'Aspects', 'senergy:aspects'),
        attributeTextEntry('function-field', 'Function', 'senergy:function'),
        attributeTextEntry('characteristic-field', 'Characteristic', 'senergy:characteristic'),
        attributeTextEntry('script-field', 'Script', 'senergy:script'),
        attributeTextEntry('value-variable-field', 'Value Variable Name', 'senergy:value_variable_name'),
        attributeTextEntry('variables-field', 'Variables', 'senergy:variables'),
        attributeTextEntry('qos-field', 'Qos', 'senergy:qos'),
    ]);

    add('iot-info', 'IoT-Info', task, task && callbacks().getInfoHtml ? [
        htmlEntry('iot-extern-device-variable-list', callbacks().getInfoHtml(element)),
    ] : []);

    add('order', 'Deployment-Order', isOrderElement(element), [
        attributeSelectEntry('order-field', 'Order', 'senergy:order', orderOptions().map(function (option) {
            return { value: option.value, label: option.name };
        })),
    ]);

    add('description', 'Process Description', isCollaborationOrProcess(element), [
        attributeTextEntry('desc-field', 'Description', 'senergy:description'),
    ]);

    return groups;
}

export default class SenergyPropertiesProvider {
    constructor(propertiesPanel, bpmnjs) {
        propertiesPanel.registerProvider(LOW_PRIORITY, this);
        this._bpmnjs = bpmnjs;
    }

    getGroups(element) {
        return (groups) => senergyGroups(element, this._bpmnjs).concat(augmentScriptEntries(groups));
    }
}

SenergyPropertiesProvider.$inject = ['propertiesPanel', 'bpmnjs'];
