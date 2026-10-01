/*
 *    Copyright 2019 InfAI (CC SES)
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

/* eslint-env es6 */
import { textBox, selectBox } from 'bpmn-js-properties-panel/lib/factory/EntryFactory';
import { modelServices } from '../model/bpmn-elements';
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

// The entries below only open the dialogs; what they read and write lives in ../model/process-writers.

export function processIncident(group, element, bpmnjs) {
    const callback = bpmnjs.designerCallbacks.processIncident;

    if (callback != null) {
        group.entries.push({
            id: "process-incident-helper",
            html: "<button class='bpmn-iot-button' data-action='saveIncident'>Incident</button>",
            saveIncident: function (element) {
                callback(readIncident(element), function (newConfig) {
                    writeIncident(modelServices(bpmnjs), element, newConfig);
                });
                return true;
            }
        });
    }
}

export function notification(group, element, bpmnjs) {
    if (bpmnjs.designerCallbacks.configNotification) {
        group.entries.push({
            id: "send-notification-helper",
            html: "<button class='bpmn-iot-button' data-action='sendNotificationHelper'>Notification</button>",
            sendNotificationHelper: function (element) {
                var current = readNotification(element);
                bpmnjs.designerCallbacks.configNotification(current.subject, current.content, function (subj, content) {
                    writeNotification(modelServices(bpmnjs), element, subj, content);
                }, function () {
                });
                return true;
            }
        });
    }
}

export function io(group, element, bpmnjs) {
    group.entries.push({
        id: "process-io-button",
        html: "<button class='process-io-button' data-action='openProcessIoDialog'>Process-IO</button>",
        openProcessIoDialog: function (element) {
            bpmnjs.designerCallbacks.getProcessIoConfigs(function (processIoConfig) {
                bpmnjs.designerCallbacks.openProcessIoDialog(readProcessIo(processIoConfig, element), function (processIoDesignerInfos) {
                    writeProcessIo(modelServices(bpmnjs), element, processIoConfig, processIoDesignerInfos);
                });
            });
            return true;
        }
    });
}

export function external(group, element, bpmnjs, eventBus) {
    var refresh = function () {
        eventBus.fire('elements.changed', { elements: [element] });
    };

    group.entries.push({
        id: "iot-extern-device-type-select-button",
        html: "<button class='bpmn-iot-button' data-action='selectIotDeviceTypeForExtern'>Select Function</button>",
        selectIotDeviceTypeForExtern: function (element) {
            bpmnjs.designerCallbacks.findIotDeviceType(readDeviceTask(element), function (connectorInfo) {
                writeDeviceTask(modelServices(bpmnjs), element, connectorInfo);
            });
            return true;
        }
    });

    if (hasEditableInputs(element)) {
        group.entries.push({
            id: "iot-extern-device-input-edit-button",
            html: "<button class='bpmn-iot-button' data-action='editInput'>Edit Input</button>",
            editInput: function (element) {
                bpmnjs.designerCallbacks.editInput(element, function () {
                    refresh();
                });
                return true;
            }
        });
    }

    if (hasOutputsForTopic(element, "pessimistic")) {
        group.entries.push({
            id: "iot-extern-device-output-edit-button",
            html: "<button class='bpmn-iot-button' data-action='editOutput'>Select Output-Variables</button>",
            editOutput: function (element) {
                bpmnjs.designerCallbacks.editOutput(taskOutputParameters(element), function () {
                    refresh();
                });
                return true;
            }
        });
    }
}

export function msgevent(group, element, bpmnjs, eventBus, modeling) {
    var aspect = textBox({
        id: 'aspect-field',
        label: 'Aspect',
        modelProperty: 'senergy:aspect'
    });

    var aspects = textBox({
        id: 'aspects-field',
        label: 'Aspects',
        modelProperty: 'senergy:aspects'
    });

    var iotfunction = textBox({
        id: 'function-field',
        label: 'Function',
        modelProperty: 'senergy:function'
    });

    var characteristic = textBox({
        id: 'characteristic-field',
        label: 'Characteristic',
        modelProperty: 'senergy:characteristic'
    });

    var script = textBox({
        id: 'script-field',
        label: 'Script',
        modelProperty: 'senergy:script'
    });

    var valueVariableName = textBox({
        id: 'value-variable-field',
        label: 'Value Variable Name',
        modelProperty: 'senergy:value_variable_name'
    });

    var variables = textBox({
        id: 'variables-field',
        label: 'Variables',
        modelProperty: 'senergy:variables'
    });

    var qos = textBox({
        id: 'qos-field',
        label: 'Qos',
        modelProperty: 'senergy:qos'
    });

    group.entries.push({
        id: "iot-conditional-event-button",
        html: "<button class='bpmn-iot-button' data-action='editConditionalEvent'>Edit Conditional Event</button>",
        editConditionalEvent: function (element) {
            var f = bpmnjs.designerCallbacks.editConditionalEvent;
            if (!f) {
                console.log("missing bpmnjs.designerCallbacks.editConditionalEvent()");
                return;
            }
            f(readConditionalEvent(element), function (response) {
                writeConditionalEvent({ modeling: modeling, eventBus: eventBus }, element, response);
            });
            return true;
        }
    });

    group.entries.push(aspect);
    group.entries.push(aspects);
    group.entries.push(iotfunction);
    group.entries.push(characteristic);
    group.entries.push(script);
    group.entries.push(valueVariableName);
    group.entries.push(variables);
    group.entries.push(qos);
}

export function influx(group, element, bpmnjs, eventBus) {
    var refresh = function () {
        eventBus.fire('elements.changed', { elements: [element] });
    };

    group.entries.push({
        id: "iot-influx-device-type-select-button",
        html: "<button class='bpmn-iot-button' data-action='influxButton'>Add data analysis</button>",
        influxButton: function (element) {
            bpmnjs.designerCallbacks.editHistoricDataConfig(readHistoricDataConfig(element), function (config) {
                writeHistoricDataConfig(modelServices(bpmnjs), element, config);
            });
            return true;
        }
    });

    if (hasOutputsForTopic(element, "export")) {
        group.entries.push({
            id: "iot-extern-device-output-edit-button",
            html: "<button class='bpmn-iot-button' data-action='editOutput'>Select Output-Variables</button>",
            editOutput: function (element) {
                bpmnjs.designerCallbacks.editOutput(taskOutputParameters(element), function () {
                    refresh();
                });
                return true;
            }
        });
    }
}

export function info(group, element, bpmnjs) {
    group.entries.push({
        id: "iot-extern-device-variable-list",
        html: bpmnjs.designerCallbacks.getInfoHtml(element)
    });
}

export function description(group) {
    group.entries.push(textBox({
        id: 'desc-field',
        label: 'Description',
        modelProperty: 'senergy:description'
    }));
}

export function order(group) {
    group.entries.push(selectBox({
        id: 'order-field',
        label: 'Order',
        modelProperty: 'senergy:order',
        selectOptions: orderOptions()
    }));
}

function timerEntry(group, bpmnjs, id, label, action, kind, dialog, toBody) {
    var entry = {
        id: id,
        html: "<button class='bpmn-iot-button' data-action='" + action + "'>" + label + "</button>"
    };
    entry[action] = function (element) {
        bpmnjs.designerCallbacks[dialog](readTimer(element, kind)).then(function (result) {
            writeTimer(modelServices(bpmnjs), element, kind, toBody(result), result.text);
        }, function () {
        });
        return true;
    };
    group.entries.push(entry);
}

export function timeHelper(group, element, bpmnjs) {
    timerEntry(group, bpmnjs, "set-duration", "set Duration", "setDuration", "timeDuration", "durationDialog", function (result) { return result.iso.string; });
    timerEntry(group, bpmnjs, "set-date", "set Date", "setDate", "timeDate", "dateDialog", function (result) { return result.iso; });
    timerEntry(group, bpmnjs, "set-cycle", "set Cycle", "setCycle", "timeCycle", "cycleDialog", function (result) { return result.cron; });
}
