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
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';
import { getOutputPaths, toServiceTask, toExternalServiceTask } from './helper';
const typeString = "https://schema.org/Text";
const typeInteger = "https://schema.org/Integer";
const typeFloat = "https://schema.org/Float";
const typeBoolean = "https://schema.org/Boolean";
const typeList = "https://schema.org/ItemList";
const typeStructure = "https://schema.org/StructuredValue";

function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

var createInputParameter = function (bpmnjs, name, value, definition) {
    var moddle = bpmnjs.get('moddle');
    if (value !== null) {
        return moddle.create('camunda:InputParameter', {
            name: name,
            value: value
        });
    }
    if (definition) {
        return moddle.create('camunda:InputParameter', {
            name: name,
            definition: definition
        });
    }
};

var createTextInputParameter = function (bpmnjs, name, value) {
    return createInputParameter(bpmnjs, name, value, null)
};

var createMailParameter = function (bpmnjs, to, subj, content) {
    return [
        createInputParameter(bpmnjs, "to", to),
        createInputParameter(bpmnjs, "subject", subj),
        createInputParameter(bpmnjs, "text", content),
    ];
};

var createNotificationParameter = function (bpmnjs, subj, message) {
    return [
        createInputParameter(bpmnjs, "payload", JSON.stringify({message: message, title:subj})),
        createInputParameter(bpmnjs, "deploymentIdentifier", "notification")
    ];
};

var createScriptInputParameter = function (bpmnjs, name, value) {
    var moddle = bpmnjs.get('moddle');
    var script = moddle.create('camunda:Script', {
        scriptFormat: "Javascript",
        value: value
    });
    return createInputParameter(bpmnjs, name, null, script)
};

var createInputOutput = function (bpmnjs, inputs, outputs) {
    var moddle = bpmnjs.get('moddle');
    return moddle.create('camunda:InputOutput', {
        inputParameters: inputs,
        outputParameters: outputs
    });
};

var createConnector = function (bpmnjs, connectorId, inputs, outputs) {
    var moddle = bpmnjs.get('moddle');
    return moddle.create('camunda:Connector', {
        connectorId: connectorId,
        inputOutput: createInputOutput(bpmnjs, inputs, outputs)
    });
};

function getPayload(connectorInfo, input) {
    return JSON.stringify({
        version: 2,
        function: connectorInfo.function,
        device_class: connectorInfo.device_class || null,
        aspect: connectorInfo.aspect || null,
        label: connectorInfo.function.name,
        input: input ? generateStructure(connectorInfo.characteristic, true) : {},
        characteristic_id: connectorInfo.characteristic.id,
        retries: connectorInfo.retries,
        prefer_event: connectorInfo.prefer_events
    }, null, 4)
}

function createOutputParameter(bpmnjs, name, value, definition) {
    var moddle = bpmnjs.get('moddle');
    if (value) {
        return moddle.create('camunda:OutputParameter', {
            name: name,
            value: value
        });
    }
    if (definition) {
        return moddle.create('camunda:OutputParameter', {
            name: name,
            definition: definition
        });
    }
}

var setExtentionsElement = function (bpmnjs, parent, child) {
    var moddle = bpmnjs.get('moddle');
    parent.extensionElements = moddle.create('bpmn:ExtensionElements', {
        values: [child]
    });
};

function createScriptOutputParameter(bpmnjs, name, value) {
    var moddle = bpmnjs.get('moddle');
    var script = moddle.create('camunda:Script', {
        scriptFormat: "Javascript",
        value: value
    });
    return createOutputParameter(bpmnjs, name, null, script)
}

function getOutputScript() {
    return "JSON.parse(connector.getVariable('response'));"
}

function getRoot(businessObject) {
    var parent = businessObject;
    while (parent.$parent) {
        parent = parent.$parent;
    }
    return parent;
}

function createTaskParameter(bpmnjs, inputs, path, option) {
    var result = [];
    if (inputs === null || inputs === undefined) {
        return result;
    }
    var inputPaths = getParameterPaths(inputs, path, option);
    for (var i = 0; i < inputPaths.length; i++) {
        if (option === 'input') {
            result.push(createTextInputParameter(bpmnjs, inputPaths[i].path, inputPaths[i].value));
        }
        if (option === 'output') {
            result.push(createOutputParameter(bpmnjs, inputPaths[i].path, inputPaths[i].value));
        }
    }
    return result;
}

function getParameterPaths(value, path, option) {
    //is primitive
    if(value !== Object(value)){
        if (option === 'input') {
            return [{path: path, value: JSON.stringify(value)}]
        }
        if (option === 'output') {
            return [{path: path, value: value}]
        }
    }
    var result = [];
    for(var key in value){
        result = result.concat(getParameterPaths(value[key], [path, key].join("."), option))
    }
    return result
}

function generateStructure(characteristic, input, name) {
    var outputValue = '${result' + name + '}';
    switch (characteristic.type) {
        case typeString: {
            return input ? "" : outputValue;
        }
        case typeFloat: {
            return input ? 0.0 : outputValue;
        }
        case typeInteger: {
            return input ? 0 : outputValue;
        }
        case typeBoolean: {
            return input ? false : outputValue;
        }
        case typeStructure: {
           var result = {};
            characteristic.sub_characteristics.forEach(function (subCharacteristic) {
                result[subCharacteristic.name] = generateStructure(subCharacteristic, input, name + '.' + subCharacteristic.name)
            });
            return result;
        }
        case typeList: {
            var result = [];
            characteristic.sub_characteristics.forEach(function (subCharacteristic) {
                result[parseInt(subCharacteristic.name)] = generateStructure(subCharacteristic, input, name + '.' + subCharacteristic.name)
            });
            return result;
        }
    }
}

function createTaskResults(bpmnjs, outputs) {
    var result = [];
    if (!outputs || outputs == "") {
        return result;
    }
    var paths = getOutputPaths(outputs);
    var variables = [];
    for (var i = 0; i < paths.length; i++) {
        variables.push("${result." + paths[i].join(".") + "}")
    }
    variables.sort();
    for (i = 0; i < variables.length; i++) {
        var name = paths[i][paths[i].length - 1].replace(/[\[\]]/g, "_");
        result.push(createOutputParameter(bpmnjs, name, variables[i], null));
    }
    return result;
}


function getDeviceTypeServiceFromServiceElement(element) {
    var bo = getBusinessObject(element);
    var extentionElements = bo.extensionElements;
    if (extentionElements && extentionElements.values && extentionElements.values[0]) {
        var inputs = extentionElements.values[0].inputParameters;
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].name == "payload") {
                var payload = JSON.parse(inputs[i].value);
              return {
                function: payload.function,
                device_class: payload.device_class,
                aspect: payload.aspect,
                completionStrategy: bo.get('camunda:topic'),
                retries: payload.retries,
                prefer_events: payload.prefer_event
              };
            }
        }
    }
}


export function email(group, element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var refresh = function () {
        eventBus.fire('elements.changed', { elements: [element] });
    };

    if (bpmnjs.designerCallbacks.configEmail) {
        group.entries.push({
            id: "send-email-helper",
            html: "<button class='bpmn-iot-button' data-action='sendEmailHelper'>Email</button>",
            sendEmailHelper: function (element, node) {
                var moddle = bpmnjs.get('moddle');
                var bo = getBusinessObject(element);
                var to = "";
                var subject = "";
                var content = "";
                if (bo.extensionElements
                    && bo.extensionElements.values
                    && bo.extensionElements.values[0]
                    && bo.extensionElements.values[0].inputOutput
                    && bo.extensionElements.values[0].inputOutput.inputParameters) {
                    var inputs = bo.extensionElements.values[0].inputOutput.inputParameters;
                    for (var i = 0; i < inputs.length; i++) {
                        if (inputs[i].name == "to") {
                            to = inputs[i].value;
                        }
                        if (inputs[i].name == "subject") {
                            subject = inputs[i].value;
                        }
                        if (inputs[i].name == "text") {
                            content = inputs[i].value;
                        }
                    }
                }

                bpmnjs.designerCallbacks.configEmail(to, subject, content, function (to, subj, content) {
                    toServiceTask(bpmnFactory, replace, selection, element, function (serviceTask, element) {
                        serviceTask.name = "send mail";
                        var inputs = createMailParameter(bpmnjs, to, subj, content);
                        var mailConnector = createConnector(bpmnjs, "mail-send", inputs, []);
                        setExtentionsElement(bpmnjs, serviceTask, mailConnector);
                        refresh();
                    });
                }, function () {
                });
                return true;
            }
        });
    }
}
export function processIncident(group, element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var refresh = function () {
        eventBus.fire('elements.changed', { elements: [element] });
    };

    const callback = bpmnjs.designerCallbacks.processIncident;

    if (callback != null) {
        group.entries.push({
            id: "process-incident-helper",
            html: "<button class='bpmn-iot-button' data-action='saveIncident'>Incident</button>",
            saveIncident: function (element, node) {
                var bo = getBusinessObject(element);
                let oldMessage = '';
                if (bo.extensionElements != null
                    && bo.extensionElements.values != null
                    && bo.extensionElements.values.length > 0
                    && bo.extensionElements.values[0] != null
                    && bo.extensionElements.values[0].inputParameters
                    && bo.extensionElements.values[0].inputParameters.length > 0) {
                    oldMessage = bo.extensionElements.values[0].inputParameters[0].value;
                }
                var oldConfig = {
                    message: oldMessage
                };

                callback(oldConfig, function (newConfig) {
                    console.log(newConfig);
                    toExternalServiceTask(bpmnFactory, replace, selection, element, function (serviceTask, element) {
                        serviceTask.topic = 'optimistic';
                        const inputs = [];
                        inputs.push(createTextInputParameter(bpmnjs, 'incident', newConfig.message));
                        var inputOutput = createInputOutput(bpmnjs, inputs, []);
                        setExtentionsElement(bpmnjs, serviceTask, inputOutput);
                    });
                });
                return true;
            }
        });
    }
}
export function notification(group, element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var refresh = function () {
        eventBus.fire('elements.changed', { elements: [element] });
    };

    if (bpmnjs.designerCallbacks.configNotification) {
        group.entries.push({
            id: "send-notification-helper",
            html: "<button class='bpmn-iot-button' data-action='sendNotificationHelper'>Notification</button>",
            sendNotificationHelper: function (element, node) {
                var moddle = bpmnjs.get('moddle');
                var bo = getBusinessObject(element);
                var subject = "";
                var content = "";
                if (bo.extensionElements
                    && bo.extensionElements.values
                    && bo.extensionElements.values[0]
                    && bo.extensionElements.values[0].inputOutput
                    && bo.extensionElements.values[0].inputOutput.inputParameters) {
                    var inputs = bo.extensionElements.values[0].inputOutput.inputParameters;
                    for (var i = 0; i < inputs.length; i++) {
                        if (inputs[i].name == "subject") {
                            subject = inputs[i].value;
                        }
                        if (inputs[i].name == "text") {
                            content = inputs[i].value;
                        }
                    }
                }

                bpmnjs.designerCallbacks.configNotification(subject, content, function (subj, content) {
                    toServiceTask(bpmnFactory, replace, selection, element, function (serviceTask, element) {
                        serviceTask.name = "send notification";
                        var inputs = createNotificationParameter(bpmnjs, subj, content);
                        var httpConnector = createConnector(bpmnjs, "http-connector", inputs, []);
                        setExtentionsElement(bpmnjs, serviceTask, httpConnector);
                        refresh();
                    });
                }, function () {
                });
                return true;
            }
        });
    }
}
export function io(group, element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var refresh = function () {
        eventBus.fire('elements.changed', { elements: [element] });
    };

    function getProcessIoBulkRequestFromElement(processIoConfig, element) {
        var result = {
            set: [],
            get: []
        };
        var bo = getBusinessObject(element);
        var extentionElements = bo.extensionElements;
        if (extentionElements && extentionElements.values && extentionElements.values[0]) {
            var inputs = extentionElements.values[0].inputParameters;
            var outputs = extentionElements.values[0].outputParameters;
            for (var i = 0; i < inputs.length; i++) {
                var inputName = inputs[i].name;
                var inputValue = inputs[i].value;
                if (inputName.startsWith(processIoConfig.processIoReadPrefix)) {
                    var keyWithPlaceholder = inputValue;
                    var key = keyWithPlaceholder;
                    if (key.startsWith(processIoConfig.processIoDefinitionPlaceholder)) {
                        definitionBound = true;
                        key = key.slice(processIoConfig.processIoDefinitionPlaceholder.length);
                    }
                    if (key.startsWith("_")) {
                        key = key.slice(1);
                    }
                    var instanceBound = false;
                    if (key.startsWith(processIoConfig.processIoInstancePlaceholder)) {
                        instanceBound = true;
                        key = key.slice(processIoConfig.processIoInstancePlaceholder.length);
                    }
                    if (key.startsWith("_")) {
                        key = key.slice(1);
                    }
                    var localVariableName = inputName.slice(processIoConfig.processIoReadPrefix.length);
                    var outputVariableName = localVariableName;

                    var searchedOutput = "${" + localVariableName + "}";
                    for (var j = 0; j < outputs.length; j++) {
                        var outputName = outputs[j].name;
                        var outputValue = outputs[j].value;
                        if (outputValue === searchedOutput) {
                            outputVariableName = outputName;
                            break;
                        }
                    }

                    var defaultValue = "null";
                    for (var j = 0; j < inputs.length; j++) {
                        var defaultCandidateName = inputs[j].name;
                        var defaultCandidateValue = inputs[j].value;
                        if (defaultCandidateName.startsWith(processIoConfig.processIoReadDefaultPrefix)) {
                            var defaultCandidateKey = defaultCandidateName.slice(processIoConfig.processIoReadDefaultPrefix.length);
                            if (defaultCandidateKey == keyWithPlaceholder) {
                                defaultValue = defaultCandidateValue;
                                break;
                            }
                        }
                    }

                    result.get.push({ key: key, instanceBound: instanceBound, definitionBound: definitionBound, outputVariableName: outputVariableName, defaultValue: defaultValue });
                }
                if (inputName.startsWith(processIoConfig.processIoWritePrefix)) {
                    var key = inputName.slice(processIoConfig.processIoWritePrefix.length);
                    var definitionBound = false;
                    if (key.startsWith(processIoConfig.processIoDefinitionPlaceholder)) {
                        definitionBound = true;
                        key = key.slice(processIoConfig.processIoDefinitionPlaceholder.length);
                    }
                    if (key.startsWith("_")) {
                        key = key.slice(1);
                    }
                    var instanceBound = false;
                    if (key.startsWith(processIoConfig.processIoInstancePlaceholder)) {
                        instanceBound = true;
                        key = key.slice(processIoConfig.processIoInstancePlaceholder.length);
                    }
                    if (key.startsWith("_")) {
                        key = key.slice(1);
                    }
                    result.set.push({ key: key, instanceBound: instanceBound, definitionBound: definitionBound, value: inputValue });
                }
            }
        }
        return result;
    }

    group.entries.push({
        id: "process-io-button",
        html: "<button class='process-io-button' data-action='openProcessIoDialog'>Process-IO</button>",
        openProcessIoDialog: function (element, node) {
            bpmnjs.designerCallbacks.getProcessIoConfigs(function (processIoConfig) {
                bpmnjs.designerCallbacks.openProcessIoDialog(getProcessIoBulkRequestFromElement(processIoConfig, element), function (processIoDesignerInfos) {
                    toExternalServiceTask(bpmnFactory, replace, selection, element, function (serviceTask, element) {
                        serviceTask.topic = processIoConfig.processIoWorkerTopic;

                        var inputs = [];
                        var outputs = [];

                        var createProcessIoKey = function (info) {
                            var result = info.key;
                            if (info.instanceBound) {
                                result = processIoConfig.processIoInstancePlaceholder + "_" + result;
                            }
                            if (info.definitionBound) {
                                result = processIoConfig.processIoDefinitionPlaceholder + "_" + result;
                            }
                            return result;
                        };

                        processIoDesignerInfos.set.forEach(function (setInfo) {
                            inputs.push(createTextInputParameter(bpmnjs, processIoConfig.processIoWritePrefix + createProcessIoKey(setInfo), setInfo.value));
                        });

                        processIoDesignerInfos.get.forEach(function (getInfo) {
                            inputs.push(createTextInputParameter(bpmnjs, processIoConfig.processIoReadPrefix + getInfo.outputVariableName + "_local", createProcessIoKey(getInfo)));
                            inputs.push(createTextInputParameter(bpmnjs, processIoConfig.processIoReadDefaultPrefix + createProcessIoKey(getInfo), getInfo.defaultValue));
                            outputs.push(createOutputParameter(bpmnjs, getInfo.outputVariableName, "${" + getInfo.outputVariableName + "_local}"));
                        });

                        var inputOutput = createInputOutput(bpmnjs, inputs, outputs);
                        setExtentionsElement(bpmnjs, serviceTask, inputOutput);

                        refresh();
                    });
                });
            });
            return true;
        }
    });


}
export function external(group, element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var refresh = function () {
        eventBus.fire('elements.changed', { elements: [element] });
    };

    group.entries.push({
        id: "iot-extern-device-type-select-button",
        html: "<button class='bpmn-iot-button' data-action='selectIotDeviceTypeForExtern'>Select Function</button>",
        selectIotDeviceTypeForExtern: function (element, node) {
            bpmnjs.designerCallbacks.findIotDeviceType(getDeviceTypeServiceFromServiceElement(element), function (connectorInfo) {
                toExternalServiceTask(bpmnFactory, replace, selection, element, function (serviceTask, element) {
                    serviceTask.topic = connectorInfo.completionStrategy;
                    if (connectorInfo.device_class !== null) {
                        serviceTask.name = connectorInfo.device_class.name;
                    } else {
                        if (connectorInfo.aspect !== null) {
                            serviceTask.name = connectorInfo.aspect.name;
                        }
                    }
                    serviceTask.name = serviceTask.name + " " + connectorInfo.function.name;

                    var script;
                    var inputs;
                    var outputs;

                    if (connectorInfo.function.rdf_type === "https://senergy.infai.org/ontology/ControllingFunction") {
                        script = createTextInputParameter(bpmnjs, "payload", getPayload(connectorInfo, true));
                        inputs = [script].concat(createTaskParameter(bpmnjs, generateStructure(connectorInfo.characteristic, true, ''), 'inputs', 'input'));
                        outputs = [];
                    }
                    if (connectorInfo.function.rdf_type === "https://senergy.infai.org/ontology/MeasuringFunction") {
                        script = createTextInputParameter(bpmnjs, "payload", getPayload(connectorInfo, false));
                        inputs = [script];
                        outputs = createTaskParameter(bpmnjs, generateStructure(connectorInfo.characteristic, false, ''), 'outputs', 'output');
                    }

                    var inputOutput = createInputOutput(bpmnjs, inputs, outputs);
                    setExtentionsElement(bpmnjs, serviceTask, inputOutput);

                    refresh();

                    element.iot = {
                        connectorInfo: connectorInfo,
                        inputScript: script
                    };
                });
            });
            return true;
        }
    });

    function inputsExist(element) {
        if (element.businessObject.extensionElements
            && element.businessObject.extensionElements.values
            && element.businessObject.extensionElements.values[0]
            && element.businessObject.extensionElements.values[0].inputParameters
            && element.businessObject.extensionElements.values[0].inputParameters.length > 1) {
            return true;
        }
        return false;
    }

    function outputsExist(element) {
        if (element.businessObject.extensionElements
            && element.businessObject.extensionElements.values
            && element.businessObject.extensionElements.values[0]
            && element.businessObject.extensionElements.values[0].outputParameters
            && element.businessObject.extensionElements.values[0].outputParameters.length > 0
            && element.businessObject.topic == "pessimistic") {
            return true;
        }
        return false;
    }

    if (inputsExist(element)) {
        group.entries.push({
            id: "iot-extern-device-input-edit-button",
            html: "<button class='bpmn-iot-button' data-action='editInput'>Edit Input</button>",
            editInput: function (element, node) {
                bpmnjs.designerCallbacks.editInput(element, function () {
                    refresh();
                });
                return true;
            }
        });
    }

    if (outputsExist(element)) {
        group.entries.push({
            id: "iot-extern-device-output-edit-button",
            html: "<button class='bpmn-iot-button' data-action='editOutput'>Select Output-Variables</button>",
            editOutput: function (element, node) {
                var outputs = element.businessObject.extensionElements.values[0].outputParameters;
                bpmnjs.designerCallbacks.editOutput(outputs, function () {
                    refresh();
                });
                return true;
            }
        });
    }
}
export function msgevent(group, element, bpmnjs, eventBus, modeling) {
    var refresh = function () {
        eventBus.fire('elements.changed', { elements: [element] });
    };

    var aspect = textBox({
        id: 'aspect-field',
        label: 'Aspect',
        modelProperty: 'senergy:aspect'
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
        editConditionalEvent: function (element, node) {
            var f = bpmnjs.designerCallbacks.editConditionalEvent;
            if (!f) {
                console.log("missing bpmnjs.designerCallbacks.editConditionalEvent()\nexample for function");
                return;
            }
            f(
                {
                    aspect: aspect.get(element)["senergy:aspect"],
                    iotfunction: iotfunction.get(element)["senergy:function"],
                    characteristic: characteristic.get(element)["senergy:characteristic"],
                    script: script.get(element)["senergy:script"],
                    valueVariableName: valueVariableName.get(element)["senergy:value_variable_name"],
                    variables: variables.get(element)["senergy:variables"],
                    qos: qos.get(element)["senergy:qos"],
                },
                function (response) {
                    var update = {
                        "senergy:aspect": response.aspect,
                        "senergy:function": response.iotfunction,
                        "senergy:characteristic": response.characteristic,
                        "senergy:script": response.script,
                        "senergy:value_variable_name": response.valueVariableName,
                        "senergy:variables": response.variables,
                        "senergy:qos": response.qos,
                    };
                    if (response.label) {
                        update["name"] = response.label;
                    }
                    modeling.updateProperties(element, update);
                    eventBus.fire('elements.changed', { elements: [element] });
                    refresh();
                }
            );
            return true;
        }
    });

    group.entries.push(aspect);
    group.entries.push(iotfunction);
    group.entries.push(characteristic);
    group.entries.push(script);
    group.entries.push(valueVariableName);
    group.entries.push(variables);
    group.entries.push(qos);
}
export function influx(group, element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var refresh = function () {
        eventBus.fire('elements.changed', { elements: [element] });
    };

    group.entries.push({
        id: "iot-influx-device-type-select-button",
        html: "<button class='bpmn-iot-button' data-action='influxButton'>Add data analysis</button>",
        influxButton: function (element, node) {
            bpmnjs.designerCallbacks.editHistoricDataConfig(getAggregationConfigFromServiceElement(element), function (config) {
                toExternalServiceTask(bpmnFactory, replace, selection, element, function (serviceTask, element) {
                    // Set topic and name in designer 
                    serviceTask.topic = "export";
                    serviceTask.name = config.analysisAction;

                    // Set input and output variables for the process
                    var inputs = [createTextInputParameter(bpmnjs, "config", JSON.stringify(config))];
                    var outputs = [createOutputParameter(bpmnjs, "export_result", "${global_export_result}", null)];
                    var inputOutput = createInputOutput(bpmnjs, inputs, outputs);
                    setExtentionsElement(bpmnjs, serviceTask, inputOutput);

                    refresh();
                });
            });
            return true;
        }
    });

    function getAggregationConfigFromServiceElement(element) {
        var extentionElements = getBusinessObject(element).extensionElements;
        if (extentionElements && extentionElements.values && extentionElements.values[0]) {
            var inputs = extentionElements.values[0].inputParameters;
            var config = JSON.parse(inputs[0].value);
            return config;
        }
    }

    function outputsExist(element) {
        if (element.businessObject.extensionElements
            && element.businessObject.extensionElements.values
            && element.businessObject.extensionElements.values[0]
            && element.businessObject.extensionElements.values[0].outputParameters
            && element.businessObject.extensionElements.values[0].outputParameters.length > 0
            && element.businessObject.topic == "export") {
            return true;
        }
        return false;
    }

    if (outputsExist(element)) {
        group.entries.push({
            id: "iot-extern-device-output-edit-button",
            html: "<button class='bpmn-iot-button' data-action='editOutput'>Select Output-Variables</button>",
            editOutput: function (element, node) {
                var outputs = element.businessObject.extensionElements.values[0].outputParameters;
                bpmnjs.designerCallbacks.editOutput(outputs, function () {
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
    var options = [];
    for (var i = 0; i <= 100; i++) {
        options.push({ name: '' + i, value: '' + i });
    }
    group.entries.push(selectBox({
        id: 'order-field',
        label: 'Order',
        modelProperty: 'senergy:order',
        selectOptions: options
    }));
}
export function timeHelper(group, element, bpmnjs, eventBus, modeling) {
    group.entries.push({
        id: "set-duration",
        html: "<button class='bpmn-iot-button' data-action='setDuration'>set Duration</button>",
        setDuration: function (element, node) {
            var moddle = bpmnjs.get('moddle');
            var bo = getBusinessObject(element).eventDefinitions[0];
            bpmnjs.designerCallbacks.durationDialog(bo.timeDuration && bo.timeDuration.body).then(function (result) {
                var duration = moddle.create('bpmn:FormalExpression', {
                    body: result.iso.string
                });

                if (bo.timeCycle) {
                    delete bo.timeCycle;
                }
                if (bo.timeDate) {
                    delete bo.timeDate;
                }
                if (bo.timeDuration) {
                    delete bo.timeDuration;
                }

                bo.timeDuration = duration;
                eventBus.fire('elements.changed', { elements: [element] });
                modeling.updateProperties(element, { name: result.text });
            }, function () {
            });
            return true;
        }
    });

    group.entries.push({
        id: "set-date",
        html: "<button class='bpmn-iot-button' data-action='setDate'>set Date</button>",
        setDate: function (element, node) {
            var moddle = bpmnjs.get('moddle');
            var bo = getBusinessObject(element).eventDefinitions[0];
            bpmnjs.designerCallbacks.dateDialog(bo.timeDate && bo.timeDate.body).then(function (result) {
                var dateString = result.iso;
                var date = moddle.create('bpmn:FormalExpression', {
                    body: dateString
                });
                if (bo.timeCycle) {
                    delete bo.timeCycle;
                }
                if (bo.timeDate) {
                    delete bo.timeDate;
                }
                if (bo.timeDuration) {
                    delete bo.timeDuration;
                }

                bo.timeDate = date;
                eventBus.fire('elements.changed', { elements: [element] });
                modeling.updateProperties(element, { name: result.text });
            }, function () {
            });
            return true;
        }
    });

    group.entries.push({
        id: "set-cycle",
        html: "<button class='bpmn-iot-button' data-action='setCycle'>set Cycle</button>",
        setCycle: function (element, node) {
            var moddle = bpmnjs.get('moddle');
            var bo = getBusinessObject(element).eventDefinitions[0];
            bpmnjs.designerCallbacks.cycleDialog(bo.timeCycle && bo.timeCycle.body).then(function (result) {
                var date = moddle.create('bpmn:FormalExpression', {
                    body: result.cron
                });

                if (bo.timeCycle) {
                    delete bo.timeCycle;
                }
                if (bo.timeDate) {
                    delete bo.timeDate;
                }
                if (bo.timeDuration) {
                    delete bo.timeDuration;
                }

                bo.timeCycle = date;
                eventBus.fire('elements.changed', { elements: [element] });
                modeling.updateProperties(element, { name: result.text });
            }, function () {
            });
            return true;
        }
    });
}
