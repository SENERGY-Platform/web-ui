/* eslint-env es2020 */

var ImplementationTypeHelper = require('bpmn-js-properties-panel/lib/helper/ImplementationTypeHelper');
var is = require('bpmn-js/lib/util/ModelUtil').is;
var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;
var inherits = require('inherits');
var PropertiesActivator = require('bpmn-js-properties-panel/lib/PropertiesActivator');
var assign = require('lodash.assign');
var pick = require('lodash.pick');
var isEventSubProcess = require('bpmn-js/lib/util/DiUtil').isEventSubProcess;

var CamundaProvider = require('bpmn-js-properties-panel/lib/provider/camunda').propertiesProvider[1];

var entryFactory = require('bpmn-js-properties-panel/lib/factory/EntryFactory');
var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;
var extensionElementsHelper = require('bpmn-js-properties-panel/lib/helper/ExtensionElementsHelper');
var ImplementationTypeHelper = require('bpmn-js-properties-panel/lib/helper/ImplementationTypeHelper');
var panelUtils =  require('bpmn-js-properties-panel/lib/Utils');
const {property} = require("lodash");
const typeString = "https://schema.org/Text";
const typeInteger = "https://schema.org/Integer";
const typeFloat = "https://schema.org/Float";
const typeBoolean = "https://schema.org/Boolean";
const typeList = "https://schema.org/ItemList";
const typeStructure = "https://schema.org/StructuredValue";

function SmartServicePropertiesProvider(eventBus, canvas, bpmnFactory, elementFactory, autoPlace, elementRegistry, elementTemplates, bpmnjs, replace, selection, modeling, translate) {
    this.getTabs = function(element) {
        var camunda = new CamundaProvider(eventBus, canvas, bpmnFactory, elementRegistry, elementTemplates, translate);
        var camundaTabs = camunda.getTabs(element);
        camundaTabs[0].groups.unshift(createDescriptionGroup(element));
        camundaTabs[0].groups.unshift(createTaskGroup(element, bpmnjs, eventBus, bpmnFactory, elementFactory, autoPlace, replace, selection));
        camundaTabs[0].groups.unshift(createSmartServiceInputsGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection));
        return camundaTabs;
    };
}

var isTask = function(element){
    return is(element, "bpmn:Task") && !is(element, "bpmn:ReceiveTask")
};

var isEvent = function(element) {
    return element.type == "bpmn:StartEvent"  || element.type == "bpmn:IntermediateCatchEvent";
};

var isStartEvent = function(element) {
    return is(element, "bpmn:StartEvent");
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

function createDescriptionGroup(){
    var descGroup = {
        id: 'description',
        label: 'Smart-Service Description',
        entries: [
            entryFactory.textBox({
                id : 'desc-field',
                label : 'Description',
                modelProperty : 'senergy:description'
            })
        ],
        enabled: isCollaborationOrProcess
    };
    return descGroup;
}

function createTaskGroup(element, bpmnjs, eventBus, bpmnFactory, elementFactory, autoPlace, replace, selection){
    var group = {
        id: 'task',
        label: 'Smart-Service Task',
        entries: [],
        enabled: isTask
    };
    createTaskEntries(group, element, bpmnjs, eventBus, bpmnFactory, elementFactory, autoPlace, replace, selection);
    return group;
}

function createSmartServiceInputsGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection){
    var group = {
        id: 'smart_service_inputs_group',
        label: 'Smart-Service Inputs',
        entries: [],
        enabled: isStartEvent
    };
    createSmartServiceInputEntries(group, element, bpmnjs, eventBus, bpmnFactory, replace, selection);
    return group;
}

function createSmartServiceInputEntries(group, element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var refresh = function () {
        eventBus.fire('elements.changed', {elements: [element]});
    };

    group.entries.push({
        id: "smart-service-inputs-button",
        html: "<button class='bpmn-iot-button' data-action='editSmartServiceInputs'>Edit Smart-Service Inputs</button>",
        editSmartServiceInputs: function (element, node) {
            bpmnjs.designerCallbacks.openSmartServiceInputsEditDialog(getSmartServiceInputsForElement(element), element, function (info) {
                var fields = info.inputs.map(fieldDesc => {
                    return createField(bpmnjs, fieldDesc.id, fieldDesc.label, fieldDesc.type, fieldDesc.default_value, createProperties(bpmnjs, fieldDesc.properties.map(property => {
                        return createProperty(bpmnjs, property.id, property.value);
                    })));
                })

                var formData = createFormData(bpmnjs, fields);
                setExtentionsElement(bpmnjs, element.businessObject, formData);

                refresh();
            });
            return true;
        }
    });
}

function createTaskEntries(group, element, bpmnjs, eventBus, bpmnFactory, elementFactory, autoPlace, replace, selection) {
    var refresh = function () {
        eventBus.fire('elements.changed', {elements: [element]});
    };

    group.entries.push({
        id: "smart-service-task-button",
        html: "<button class='bpmn-iot-button' data-action='editSmartServiceTask'>Edit Smart-Service Task</button>",
        editSmartServiceTask: function (element, node) {
            const taskId = element.id;

            bpmnjs.designerCallbacks.openTaskEditDialog(getTaskInfoFromElement(element), element, function (taskInfo) {
                //set smart-service inputs
                var startElement = findStartElement(element);
                if(startElement){
                    var fields = taskInfo.smartServiceInputs.inputs.map(fieldDesc => {
                        return createField(bpmnjs, fieldDesc.id, fieldDesc.label, fieldDesc.type, fieldDesc.default_value, createProperties(bpmnjs, fieldDesc.properties.map(property => {
                            return createProperty(bpmnjs, property.id, property.value);
                        })));
                    })

                    var formData = createFormData(bpmnjs, fields);
                    setExtentionsElement(bpmnjs, startElement.businessObject, formData);
                }

                let doneEventName = taskId+"_done_event";
                let doneEventNameRef = "${"+doneEventName+"}";
                let doneEvent = findMessageEventElement(element, doneEventNameRef);
                if (taskInfo.topic === "process_deployment" && !doneEvent){
                    createIntermediateCatchMessageEvent(bpmnFactory, elementFactory, autoPlace, replace, element, doneEventNameRef)
                }
                if (taskInfo.topic === "device_repository" && !doneEvent){
                    createIntermediateCatchMessageEvent(bpmnFactory, elementFactory, autoPlace, replace, element, doneEventNameRef)
                }

                toExternalServiceTask(bpmnFactory, replace, selection, element, function (serviceTask, element) {
                    serviceTask.topic = taskInfo.topic;
                    serviceTask.name = taskInfo.name;

                    var inputs = [];
                    taskInfo.inputs?.forEach(input => {
                        switch(input.type) {
                            case "script":
                                inputs.push(createScriptInputParameter(bpmnjs, input.name, input.value))
                                break;
                            case "text":
                                inputs.push(createTextInputParameter(bpmnjs, input.name, input.value))
                                break;
                        }
                    });

                    var outputs = [];
                    taskInfo.outputs?.forEach(input => {
                        switch(input.type) {
                            case "script":
                                outputs.push(createScriptOutputParameter(bpmnjs, input.name, input.value))
                                break;
                            case "text":
                                outputs.push(createTextOutputParameter(bpmnjs, input.name, input.value))
                                break;
                        }
                    })

                    switch (serviceTask.topic){
                        case "process_deployment":
                            outputs.push(createTextOutputParameter(bpmnjs, taskId+"_process_deployment_id", "${process_deployment_id}"));
                            outputs.push(createTextOutputParameter(bpmnjs, doneEventName, "${done_event}"));
                            let fogInput = inputs.find(value => value.name === "process_deployment.prefer_fog_deployment");
                            if(fogInput && fogInput.value === "true") {
                                outputs.push(createTextOutputParameter(bpmnjs, taskId+"_is_fog_deployment", "${is_fog_deployment}"));
                                outputs.push(createTextOutputParameter(bpmnjs, taskId+"_fog_hub", "${fog_hub}"));
                            }
                            break;
                        case "analytics":
                            outputs.push(createTextOutputParameter(bpmnjs, taskId+"_pipeline_id", "${pipeline_id}"));
                            break;
                        case "export":
                            outputs.push(createTextOutputParameter(bpmnjs, taskId+"_export_id", "${export_id}"));
                            break;
                        case "import":
                            outputs.push(createTextOutputParameter(bpmnjs, taskId+"_import_id", "${import_id}"));
                            break;
                        case "device_repository":
                            outputs.push(createTextOutputParameter(bpmnjs, taskId+"_device_group_id", "${device_group_id}"));
                            outputs.push(createTextOutputParameter(bpmnjs, taskId+"_device_group_selection", "${device_group_iot_option}"));
                            outputs.push(createTextOutputParameter(bpmnjs, doneEventName, "${done_event}"));
                            break;
                    }

                    var inputOutput = createInputOutput(bpmnjs, inputs, outputs);
                    setExtentionsElement(bpmnjs, serviceTask, inputOutput);

                    refresh();
                });
            });
            return true;
        }
    });

    group.entries.push({
        id: "smart-service-extract-button",
        html: "<button class='bpmn-iot-button' data-action='extractJsonFields'>Extract Field from JSON</button>",
        extractJsonFields: function (element, node) {
            const taskId = element.id;
            bpmnjs.designerCallbacks.openExtractJsonFieldsDialog(getTaskInputOutputInfoFromElement(element), element, function (taskInfo) {
                toTask(bpmnFactory, replace, selection, element, function (task, element) {
                    task.name = taskInfo.name

                    var inputs = [];
                    taskInfo.inputs?.forEach(input => {
                        switch(input.type) {
                            case "script":
                                inputs.push(createScriptInputParameter(bpmnjs, input.name, input.value))
                                break;
                            case "text":
                                inputs.push(createTextInputParameter(bpmnjs, input.name, input.value))
                                break;
                        }
                    });

                    var outputs = [];
                    taskInfo.outputs?.forEach(input => {
                        switch(input.type) {
                            case "script":
                                outputs.push(createScriptOutputParameter(bpmnjs, input.name, input.value))
                                break;
                            case "text":
                                outputs.push(createTextOutputParameter(bpmnjs, input.name, input.value))
                                break;
                        }
                    })

                    var inputOutput = createInputOutput(bpmnjs, inputs, outputs);
                    setExtentionsElement(bpmnjs, task, inputOutput);

                    refresh();
                });
            });
            return true;
        }
    });
}


var CUSTOM_PROPERTIES = [
    'cancelActivity',
    'instantiate',
    'eventGatewayType',
    'triggeredByEvent',
    'isInterrupting'
];

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


function toTask(bpmnFactory, replace, selection, element, additionalChanges) {
    var target = {
        type: 'bpmn:Task'
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

var getSmartServiceInputsForElement = function (element) {
    var inputs = []; //[{id:"", label:"", type:"", default_value:"", properties:[{id:"", value:""}]}]
    if (element && element.businessObject && element.businessObject.extensionElements && element.businessObject.extensionElements.values) {
        const extensionValues = element.businessObject.extensionElements.values;
        extensionValues[0]?.fields?.forEach(field => {
            var properties = [];
            field.properties?.values?.forEach(property => {
                properties.push({id: property.id, value: property.value})
            })
            inputs.push({
                id: field.id,
                label: field.label,
                type: field.type,
                default_value: field.defaultValue,
                properties: properties
            })
        })
    }
    return {
        inputs: inputs
    }
}

var getTaskInputOutputInfoFromElement = function (element) {
    var result = {
        name: element.businessObject.name || "",
        inputs: [],
        outputs: []
    }

    if (element.businessObject.extensionElements && element.businessObject.extensionElements.values) {
        const extensionValues = element.businessObject.extensionElements.values;
        extensionValues[0].inputParameters.forEach(input => {
            if (input.definition && input.definition.scriptFormat) {
                result.inputs.push({type: "script", name: input.name, value: input.definition.value})
            } else {
                result.inputs.push({type: "text", name: input.name, value: input.value})
            }
        });
        extensionValues[0].outputParameters.forEach(output => {
            if (output.definition && output.definition.scriptFormat) {
                result.outputs.push({type: "script", name: output.name, value: output.definition.value})
            } else {
                result.outputs.push({type: "text", name: output.name, value: output.value})
            }
        });
    }
    return result;
}

var getTaskInfoFromElement = function (element) {
    const topic = element.businessObject.topic || "";
    const name = element.businessObject.name || "";
    var inputs = []; // {type:"", name:"", value:""}
    if (element.businessObject.extensionElements && element.businessObject.extensionElements.values) {
        const extensionValues = element.businessObject.extensionElements.values;
        extensionValues[0].inputParameters.forEach(input => {
            if (input.definition && input.definition.scriptFormat) {
                inputs.push({type: "script", name: input.name, value: input.definition.value})
            } else {
                inputs.push({type: "text", name: input.name, value: input.value})
            }
        })
    }
    var startElement = findStartElement(element);
    return {
        topic: topic,
        name: name,
        inputs: inputs,
        smartServiceInputs: getSmartServiceInputsForElement(startElement)
    };
}

var findStartElement = function (element, done){
    if(!done) {
        done = [];
    }
    if (done.indexOf(element) !== -1) {
        return null;
    }
    done.push(element);
    if(element.incoming && element.incoming.length) {
        for (let index = 0; index < element.incoming.length; index++) {
            const incoming = element.incoming[index].source;
            if (incoming.businessObject.$type === "bpmn:StartEvent") {
                return incoming
            }

            var sub = findStartElement(incoming, done);
            if(sub) {
                return sub;
            }
        }
    }

    return null;
}

function findMessageEventElement(element, msgRefName, done) {
    if(!done) {
        done = [];
    }
    if (done.indexOf(element) !== -1) {
        return null;
    }
    done.push(element);
    if(element.outgoing && element.outgoing.length) {
        for (let index = 0; index < element.outgoing.length; index++) {
            const outgoing = element.outgoing[index].target;
            if (outgoing.businessObject.$type === "bpmn:IntermediateCatchEvent" &&
                outgoing.businessObject.eventDefinitions &&
                outgoing.businessObject.eventDefinitions[0] &&
                outgoing.businessObject.eventDefinitions[0].messageRef &&
                outgoing.businessObject.eventDefinitions[0].messageRef.name === msgRefName) {
                return outgoing
            }

            var sub = findMessageEventElement(outgoing, msgRefName, done);
            if(sub) {
                return sub;
            }
        }
    }

    return null;
}

var setExtentionsElement = function (bpmnjs, parent, child) {
    var moddle = bpmnjs.get('moddle');
    parent.extensionElements = moddle.create('bpmn:ExtensionElements', {
        values: [child]
    });
};

var createInputOutput = function (bpmnjs, inputs, outputs) {
    var moddle = bpmnjs.get('moddle');
    return moddle.create('camunda:InputOutput', {
        inputParameters: inputs,
        outputParameters: outputs
    });
};

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

var createScriptInputParameter = function (bpmnjs, name, value) {
    var moddle = bpmnjs.get('moddle');
    var script = moddle.create('camunda:Script', {
        scriptFormat: "Javascript",
        value: value
    });
    return createInputParameter(bpmnjs, name, null, script)
};

var createTextInputParameter = function (bpmnjs, name, value) {
    return createInputParameter(bpmnjs, name, value, null)
};

var createOutputParameter = function (bpmnjs, name, value, definition) {
    var moddle = bpmnjs.get('moddle');
    if (value !== null) {
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
};

var createTextOutputParameter = function (bpmnjs, name, value) {
    return createOutputParameter(bpmnjs, name, value, null)
};

var createScriptOutputParameter = function (bpmnjs, name, value) {
    var moddle = bpmnjs.get('moddle');
    var script = moddle.create('camunda:Script', {
        scriptFormat: "Javascript",
        value: value
    });
    return createOutputParameter(bpmnjs, name, null, script)
};


var createFormData = function (bpmnjs, fields) {
    var moddle = bpmnjs.get('moddle');
    return moddle.create('camunda:FormData', {
        fields: fields,
    });
};

var createField = function (bpmnjs, id, label, type, defaultValue, properties) {
    var moddle = bpmnjs.get('moddle');
    return moddle.create('camunda:FormField', {
        id: id,
        label: label,
        type: type,
        defaultValue: defaultValue,
        properties: properties,
    });
}

var createProperty = function (bpmnjs, id, value) {
    var moddle = bpmnjs.get('moddle');
    return moddle.create('camunda:Property', {
        id: id,
        value: value
    });
}

var createProperties = function (bpmnjs, properties) {
    var moddle = bpmnjs.get('moddle');
    return moddle.create('camunda:Properties', {
        values: properties
    });
}

function createIntermediateCatchMessageEvent(bpmnFactory, elementFactory, autoPlace, replace, parent, topic){
    let element = elementFactory.createShape(assign({ type: "bpmn:IntermediateCatchEvent", eventDefinitionType: 'bpmn:MessageEventDefinition'}));

    //find existing msg ref
    let msgRef = null
    parent.businessObject.$parent.$parent.rootElements.forEach(function (e) {
        if(e.name === topic) {
            msgRef = e;
        }
    })

    //create msgRef if none exist
    if (!msgRef) {
        msgRef = bpmnFactory.create("bpmn:Message")
        msgRef.name = topic;
        msgRef.id = panelUtils.nextId("Message_");
        parent.businessObject.$parent.$parent.rootElements.push(msgRef);
    }

    element.businessObject.eventDefinitions[0].messageRef = msgRef;

    autoPlace.append(parent, element);
}



SmartServicePropertiesProvider.$inject = [
    'eventBus',
    'canvas',
    'bpmnFactory',
    'elementFactory',
    'autoPlace',
    'elementRegistry',
    'elementTemplates',
    'bpmnjs',
    'replace',
    'selection',
    'modeling',
    'translate'
];

inherits(SmartServicePropertiesProvider, PropertiesActivator);

module.exports = {
    __init__: [ 'propertiesProvider' ],
    propertiesProvider: [ 'type', SmartServicePropertiesProvider ]
};
