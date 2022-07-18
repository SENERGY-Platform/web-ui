
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
const {isEventSubProcess} = require("bpmn-js/lib/util/DiUtil");
const typeString = "https://schema.org/Text";
const typeInteger = "https://schema.org/Integer";
const typeFloat = "https://schema.org/Float";
const typeBoolean = "https://schema.org/Boolean";
const typeList = "https://schema.org/ItemList";
const typeStructure = "https://schema.org/StructuredValue";

function SmartServicePropertiesProvider(eventBus, canvas, bpmnFactory, elementRegistry, elementTemplates, bpmnjs, replace, selection, modeling, translate) {
    this.getTabs = function(element) {
        var camunda = new CamundaProvider(eventBus, canvas, bpmnFactory, elementRegistry, elementTemplates, translate);
        var camundaTabs = camunda.getTabs(element);
        camundaTabs[0].groups.unshift(createDescriptionGroup(element));
        camundaTabs[0].groups.unshift(createTaskGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection));
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

function createTaskGroup(element, bpmnjs, eventBus, bpmnFactory, replace, selection){
    var group = {
        id: 'task',
        label: 'Smart-Service Task',
        entries: [],
        enabled: isTask
    };
    createTaskEntries(group, element, bpmnjs, eventBus, bpmnFactory, replace, selection);
    return group;
}

function createTaskEntries(group, element, bpmnjs, eventBus, bpmnFactory, replace, selection) {
    var refresh = function () {
        eventBus.fire('elements.changed', {elements: [element]});
    };

    group.entries.push({
        id: "smart-service-task-button",
        html: "<button class='bpmn-iot-button' data-action='editSmartServiceTask'>Edit Smart-Service Task</button>",
        editSmartServiceTask: function (element, node) {
            bpmnjs.designerCallbacks.openTaskEditDialog(getTaskInfoFromElement(element), function (taskInfo) {
                toExternalServiceTask(bpmnFactory, replace, selection, element, function (serviceTask, element) {
                    serviceTask.topic = taskInfo.topic;
                    serviceTask.name = taskInfo.name

                    var inputs = [];

                    taskInfo.inputs.forEach(input => {
                        switch(input.type) {
                            case "script":
                                inputs.push(createScriptInputParameter(bpmnjs, input.name, input.value))
                                break;
                            case "text":
                                inputs.push(createTextInputParameter(bpmnjs, input.name, input.value))
                                break;
                        }
                    })

                    var inputOutput = createInputOutput(bpmnjs, inputs, []);
                    setExtentionsElement(bpmnjs, serviceTask, inputOutput);

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
    return {
        topic: topic,
        name: name,
        inputs: inputs
    };
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

SmartServicePropertiesProvider.$inject = [
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

inherits(SmartServicePropertiesProvider, PropertiesActivator);

module.exports = {
    __init__: [ 'propertiesProvider' ],
    propertiesProvider: [ 'type', SmartServicePropertiesProvider ]
};