/*
 * Copyright 2020 InfAI (CC SES)
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

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {SmartServiceTaskInputDescription, SmartServiceTaskDescription, ServingRequest} from '../../shared/designer.model';
import {ProcessRepoService} from '../../../../processes/process-repo/shared/process-repo.service';
import {DeploymentsService} from '../../../../processes/deployments/shared/deployments.service';
import {ProcessModel} from '../../../../processes/process-repo/shared/process.model';
import {V2DeploymentsPreparedModel} from '../../../../processes/deployments/shared/deployments-prepared-v2.model';
import {FlowRepoService} from '../../../../data/flow-repo/shared/flow-repo.service';
import {FlowModel} from '../../../../data/flow-repo/shared/flow.model';
import {ParserService} from '../../../../data/flow-repo/shared/parser.service';
import {ParseModel} from '../../../../data/flow-repo/shared/parse.model';
import {BpmnElement, BpmnParameter, BpmnParameterWithLabel} from '../../../../processes/designer/shared/designer.model';
import {ImportInstanceConfigModel, ImportInstancesModel} from '../../../../imports/import-instances/shared/import-instances.model';
import {
    ImportTypeContentVariableModel,
    ImportTypeModel,
    ImportTypePermissionSearchModel
} from '../../../../imports/import-types/shared/import-types.model';
import {ImportTypesService} from '../../../../imports/import-types/shared/import-types.service';
import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';
import {subtract} from 'lodash';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Component({
    templateUrl: './edit-smart-service-task-dialog.component.html',
    styleUrls: ['./edit-smart-service-task-dialog.component.css'],
})
export class EditSmartServiceTaskDialogComponent implements OnInit {
    init: SmartServiceTaskDescription;
    result: SmartServiceTaskDescription;
    tabs: string[] = ["process_deployment", "analytics", "export", "import", "info"]

    flows: FlowModel[] | null = null
    processModels: ProcessModel[] | null = null
    selectedProcessModelPreparation: V2DeploymentsPreparedModel | null = null
    knownInputValues = new Map<string, SmartServiceTaskInputDescription>();

    parsedFlows: Map<string, ParseModel[]> = new Map<string, ParseModel[]>();
    currentParsedFlows: ParseModel[] = []
    flowSvg: string | SafeHtml = ""

    availableProcessVariables: Map<string,BpmnParameterWithLabel[]> = new Map();

    exportRequest: ServingRequest;
    importRequest: ImportInstancesModel;
    importRequestConfigValueType: Map<string,string> = new Map();
    importTypes: ImportTypePermissionSearchModel[] = [];
    knownImportTypes: Map<string, ImportTypeModel> = new Map();
    importOverwrites: {config_name: string, json_value: string}[] = [];

    infoModuleType: string = "widget"
    infoModuleData: string = "{\n\n}"

    constructor(
        private dialogRef: MatDialogRef<EditSmartServiceTaskDialogComponent>,
        private processRepo: ProcessRepoService,
        private processDeployment: DeploymentsService,
        private flowService: FlowRepoService,
        private flowParser: ParserService,
        private importTypeService: ImportTypesService,
        private sanitizer: DomSanitizer,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { info: SmartServiceTaskDescription, element: BpmnElement},
    ) {
        if(!dialogParams.info.topic) {
            dialogParams.info.topic = this.tabs[0];
        }
        this.result = dialogParams.info;
        this.init = dialogParams.info;
        this.ensureResultFields();
        this.availableProcessVariables = this.getIncomingOutputs(dialogParams.element);
        this.addPipelineWithOperatorIdOptionsToAvailableVariables();
        this.addImportIotEntityWithPathToAvailableVariables();
        this.exportRequest = this.parseExport(this.result.inputs.find(value => value.name == "export.request")?.value || "{}");
        this.importRequest = this.parseImport(this.result.inputs.find(value => value.name == "import.request")?.value || "{}");
        this.importTypeService.listImportTypes("", 9999, 0, "name.asc").subscribe(value => this.importTypes = value);
        if(this.importRequest.import_type_id) {
            this.loadImportType(false);
        }

        this.infoModuleType = this.result.inputs.find(value => value.name == "info.module_type")?.value || "widget";
        this.infoModuleData = this.result.inputs.find(value => value.name == "info.module_data")?.value || "{\n\n}";
    }

    ngOnInit() {}

    ensureResultFields() {
        let processDeploymentTopic = this.tabs[0];
        if(!this.processModels && this.result.topic == processDeploymentTopic) {
            this.processRepo.getProcessModels("", 9999, 0, "date", "asc", null).subscribe(value => this.processModels = value);
        }

        this.ensureFlowList();
    }

    get activeIndex(): number {
        return this.tabs.indexOf(this.result.topic)
    }

    set activeIndex(index: number) {
        this.result.topic = this.tabs[index]
        this.ensureResultFields();
    }

    /******************************
     *      Processes
     ******************************/

    private ensureProcessTaskParameter(id: string) {
        this.result.inputs.forEach(e => this.knownInputValues.set(e.name, e));
        if(!this.selectedProcessModelPreparation || this.selectedProcessModelPreparation.id != id) {
            this.processDeployment.getPreparedDeployments(id).subscribe(value => {
                if(value) {
                    this.selectedProcessModelPreparation = value
                    this.result.inputs = [
                        this.knownInputValues.get("process_deployment.process_model_id") || {name:"process_deployment.process_model_id", value: id, type: "text"},
                        {name:"process_deployment.name", value: this.selectedProcessModelPreparation.name, type: "text"},
                        this.knownInputValues.get("process_deployment.module_data") || {name:"process_deployment.module_data", value: "{}", type: "text"}
                    ];
                    this.selectedProcessModelPreparation.elements.forEach(element => {
                        if(element.task){
                            const selectionKey = "process_deployment."+element.bpmn_id+".selection";
                            this.result.inputs.push(this.knownInputValues.get(selectionKey) || {name:selectionKey, value: "{}", type: "text"});
                            for (let key in element.task.parameter) {
                                let value = element.task.parameter[key];
                                const paramKey = "process_deployment."+element.bpmn_id+".parameter."+key;
                                this.result.inputs.push(this.knownInputValues.get(paramKey) || {name:paramKey, value: value, type: "text"});
                            }
                        }
                        if(element.message_event){
                            this.ensureFlowList();
                            const selectionKey = "process_deployment."+element.bpmn_id+".selection";
                            this.result.inputs.push(this.knownInputValues.get(selectionKey) || {name:selectionKey, value: "{}", type: "text"});
                            const eventFlowKey = "process_deployment."+element.bpmn_id+".event.flow_id";
                            this.result.inputs.push(this.knownInputValues.get(eventFlowKey) || {name:eventFlowKey, value: "", type: "text"});
                            const eventValueKey = "process_deployment."+element.bpmn_id+".event.value";
                            this.result.inputs.push(this.knownInputValues.get(eventValueKey) || {name:eventValueKey, value: "", type: "text"});
                        }
                        if(element.time_event){
                            const eventTimeKey = "process_deployment."+element.bpmn_id+".time";
                            this.result.inputs.push(this.knownInputValues.get(eventTimeKey) || {name:eventTimeKey, value: element.time_event.time, type: "text"});
                        }
                    })
                }
            })
        }
    }

    ensureFlowList(){
        if(!this.flows) {
            this.flowService.getFlows("", 9999, 0, "name", "asc").subscribe(flows => {
                this.flows = flows.flows;
                const currentFlowId = this.analyticsFlowId;
                if(currentFlowId){
                    this.ensureAnalyticsFlowParameter(currentFlowId)
                }
            })
        }
    }

    get processTaskIds(): string[]{
        let resultSet = new Map<string, string>();
        this.result.inputs.forEach(input => {
            if (input.name.startsWith("process_deployment.")) {
                const parts = input.name.split(".")
                if (parts.length > 2) {
                    resultSet.set(parts[1], parts[1])
                }
            }
        })
        return Array.from( resultSet.keys() );
    }

    getProcessTaskParameter(taskId: string): string[]{
        let result: string[] = [];
        const prefix = "process_deployment."+taskId+".parameter.";
        this.result.inputs.forEach(input => {
            if (input.name.startsWith(prefix)) {
                result.push(input.name.slice(prefix.length))
            }
        })
        return result;
    }

    processProcessModelIdFieldName = "process_deployment.process_model_id"
    get processProcessModelId(): string {
        return this.getFieldValue(this.processProcessModelIdFieldName, "text", "")
    }

    set processProcessModelId(value: string) {
        this.setFieldValue(this.processProcessModelIdFieldName, "text", value)
        this.ensureProcessTaskParameter(value)
    }

    processProcessNameFieldName = "process_deployment.name"
    get processProcessName(): string {
        return this.getFieldValue(this.processProcessNameFieldName, "text", "")
    }

    set processProcessName(value: string) {
        this.setFieldValue(this.processProcessNameFieldName, "text", value)
    }

    processTaskMatches(input: SmartServiceTaskInputDescription, taskId: string, suffix: string): boolean  {
        return input.name == "process_deployment."+taskId+"."+suffix
    }

    /******************************
     *      Analytics
     ******************************/

    analyticsFlowIdFieldName = "analytics.flow_id"
    get analyticsFlowId(): string {
        return this.getFieldValue(this.analyticsFlowIdFieldName, "text", "")
    }

    set analyticsFlowId(value: string) {
        this.setFieldValue(this.analyticsFlowIdFieldName, "text", value)
        const flow = this.flows?.find(e => e._id == value);
        const flowName = flow?.name;
        if (flowName) {
            this.analyticsPipelineName = flowName;
        }
        this.ensureAnalyticsFlowParameter(value);
    }

    analyticsPipelineNameFieldName = "analytics.name"
    get analyticsPipelineName(): string {
        return this.getFieldValue(this.analyticsPipelineNameFieldName, "text", "")
    }

    set analyticsPipelineName(value: string) {
        this.setFieldValue(this.analyticsPipelineNameFieldName, "text", value)
    }

    analyticsPipelineDescFieldName = "analytics.desc"
    get analyticsPipelineDesc(): string {
        return this.getFieldValue(this.analyticsPipelineDescFieldName, "text", "")
    }

    set analyticsPipelineDesc(value: string) {
        this.setFieldValue(this.analyticsPipelineDescFieldName, "text", value)
    }

    analyticsWindowTimeFieldName = "analytics.window_time"
    get analyticsWindowTime(): number {
        const temp = parseInt(this.getFieldValue(this.analyticsWindowTimeFieldName, "text", "30"));
        if (Number.isNaN(temp)) {
            return 30;
        }
        if(Number.isInteger(temp)) {
            return temp;
        }
        console.error("WARNING: unexpected state in analyticsWindowTime()")
        console.trace()
        return 30;
    }

    set analyticsWindowTime(value: number) {
        this.setFieldValue(this.analyticsWindowTimeFieldName, "text", value.toString())
    }

    getAnalyticsFlowImage(svgIn: string | SafeHtml, input: ParseModel): SafeHtml {
        if(!svgIn) {
            return "";
        }
        if (typeof svgIn !== 'string') {
            return "";
        }
        const parser = new DOMParser();
        const svg = parser.parseFromString(svgIn, 'image/svg+xml').getElementsByTagName('svg')[0];

        const elements = svg.getElementsByClassName('joint-cell');
        // @ts-ignore
        for (const element of elements) {
            if (element.attributes['model-id'].value === input.id) {
                for (const node of element.childNodes) {
                    if (node.attributes['stroke'] !== undefined && node.attributes['stroke'].value === 'black') {
                        node.attributes['stroke'].value = 'red';
                    }
                }
            }
        }
        return this.sanitizer.bypassSecurityTrustHtml(new XMLSerializer().serializeToString(svg));
    }

    private ensureAnalyticsFlowParameter(flowId: string) {
        this.flowService.getFlow(flowId).subscribe(flow => {
            this.flowSvg = flow?.image || "";
        })
        let f = (inputs: ParseModel[]) => {
            this.currentParsedFlows = inputs;
            this.result.inputs.forEach(e => this.knownInputValues.set(e.name, e));
            this.result.inputs = [
                this.knownInputValues.get(this.analyticsFlowIdFieldName) || {name:this.analyticsFlowIdFieldName, value: flowId, type: "text"},
                this.knownInputValues.get(this.analyticsPipelineNameFieldName) || {name:this.analyticsPipelineNameFieldName, value: "", type: "text"},
                this.knownInputValues.get(this.analyticsPipelineDescFieldName) || {name:this.analyticsPipelineDescFieldName, value: "", type: "text"},
                this.knownInputValues.get(this.analyticsWindowTimeFieldName) || {name:this.analyticsWindowTimeFieldName, value: "30", type: "text"},
            ];
            inputs.forEach(input => {
                var persistDataKey = "analytics.persistData."+input.id
                this.result.inputs.push(this.knownInputValues.get(persistDataKey) || {name:persistDataKey, value: "false", type: "text"});
                input.inPorts?.forEach(port => {
                    const selectionKey = "analytics.selection."+input.id+"."+port;
                    this.result.inputs.push(this.knownInputValues.get(selectionKey) || {name:selectionKey, value: "{}", type: "text"});
                    const criteriaKey = "analytics.criteria."+input.id+"."+port;
                    this.result.inputs.push(this.knownInputValues.get(criteriaKey) || {name:criteriaKey, value: "[]", type: "text"});
                })
                input.config?.forEach(config => {
                    const configKey = "analytics.conf."+input.id+"."+config.name;
                    this.result.inputs.push(this.knownInputValues.get(configKey) || {name:configKey, value: "", type: "text"});
                })
            })
        }
        if(this.parsedFlows.has(flowId)){
            const parsed = this.parsedFlows.get(flowId);
            if(parsed){
                f(parsed);
            }
        } else {
            this.flowParser.getInputs(flowId).subscribe(value =>{
                this.parsedFlows.set(flowId, value);
                f(value);
            })
        }
    }

    analyticsGetImportIotEntityTemplate(variable: BpmnParameterWithLabel){
        return "{\"import_selection\": {\"id\":\"${"+variable.name+"}\", \"path\": \"\"}}"
    }

    analyticsInputMatchesIotSelection(input: SmartServiceTaskInputDescription, flowInputId: string, port: string): boolean {
        return input.name == "analytics.selection."+flowInputId+"."+port
    }

    analyticsInputMatchesIotCriteria(input: SmartServiceTaskInputDescription, flowInputId: string, port: string): boolean {
        return input.name == "analytics.criteria."+flowInputId+"."+port
    }

    analyticsInputMatchesIotConfig(input: SmartServiceTaskInputDescription, flowInputId: string, configName: string): boolean {
        return input.name == "analytics.conf."+flowInputId+"."+configName
    }

    analyticsInputMatchesPersistDataField(input: SmartServiceTaskInputDescription, flowInputId: string): boolean {
        return input.name == "analytics.persistData."+flowInputId
    }

    /******************************
     *      Export
     ******************************/

    removeExportValue(index: number){
        this.exportRequest?.Values?.splice(index, 1);
    }

    addExportValue(){
        if(!this.exportRequest){
            this.exportRequest = this.parseExport("{}");
        }
        if(!this.exportRequest.Values){
            this.exportRequest.Values = [];
        }
        this.exportRequest?.Values.push({Name: "", Path: "", Type: "string", Tag: false})
    }

    parseExport(str: string): ServingRequest {
        return JSON.parse(str)
    }

    stringifyExport(exp: ServingRequest | undefined | null) {
        if(!exp) {
            exp = this.parseExport("{}");
        }
        return JSON.stringify(exp);
    }

    /******************************
     *      Import
     ******************************/

    parseImport(str: string): ImportInstancesModel {
        return JSON.parse(str)
    }

    stringifyImport(value: ImportInstancesModel | undefined | null) {
        if(!value) {
            value = this.parseImport("{}");
        }
        return JSON.stringify(value);
    }

    setImportRequestConfigValueTypes(importType: ImportTypeModel){
        importType.configs.forEach(value => {
            this.importRequestConfigValueType.set(value.name, value.type);
        })
    }

    handleUnknownImportConfigAsJsonString(){
        this.importRequest.configs = this.importRequest.configs?.map(value => {
            if (this.isUnknownImportConfig(value)) {
                return {name: value.name, value: JSON.stringify(value.value)} as ImportInstanceConfigModel;
            } else {
                return {name: value.name, value: value.value} as ImportInstanceConfigModel;
            }
        })
    }

    handleUnknownImportConfigAsJsonObject(){
        this.importRequest.configs = this.importRequest.configs?.map(value => {
            if (this.isUnknownImportConfig(value) && (typeof value.value == "string")) {
                let newValue = value.value;
                try{
                    newValue = JSON.parse(newValue)
                } catch (e) {}
                return {name: value.name, value: newValue} as ImportInstanceConfigModel;
            } else {
                return {name: value.name, value: value.value} as ImportInstanceConfigModel;
            }
        })
    }

    generateImportFields(importType: ImportTypeModel){
        this.importRequest.image = importType.image;
        this.importRequest.restart = importType.default_restart;
        this.importRequest.configs = importType.configs.map(value => {
            return {name: value.name, value: value.default_value} as ImportInstanceConfigModel;
        });
    }

    loadImportType(updateConfigs: boolean){
        if(this.importRequest.import_type_id) {
            const importType: ImportTypeModel | undefined = this.knownImportTypes.get(this.importRequest.import_type_id);
            if(importType){
                this.setImportRequestConfigValueTypes(importType);
                if(updateConfigs) {
                    this.generateImportFields(importType);
                }
                this.handleUnknownImportConfigAsJsonString();
                this.loadImportConfigOverwrites(importType, !updateConfigs);
            }else{
                this.importTypeService.getImportType(this.importRequest.import_type_id).subscribe(value => {
                    this.knownImportTypes.set(this.importRequest.import_type_id, value);
                    this.setImportRequestConfigValueTypes(value);
                    if(updateConfigs){
                        this.generateImportFields(value);
                    }
                    this.handleUnknownImportConfigAsJsonString();
                    this.loadImportConfigOverwrites(value, !updateConfigs);
                })
            }
        }
    }

    private loadImportConfigOverwrites(importType: ImportTypeModel, isInit: boolean) {
        this.importOverwrites = [];
        let known: Map<string, string> = new Map();
        if(isInit) {
            this.result.inputs.filter(value => value.name.startsWith("import.config.json_overwrite.")).forEach(value => {
                known.set(value.name.replace("import.config.json_overwrite.", ""), value.value);
            })
        }
        this.importOverwrites = importType.configs.map(value => {
            return {config_name: value.name, json_value: known.get(value.name) || ""};
        })

    }

    set importTypeId(id: string){
        this.importRequest.import_type_id = id;
        this.loadImportType(true);
    }

    get importTypeId(): string {
        return this.importRequest.import_type_id;
    }

    STRING = 'https://schema.org/Text';
    INTEGER = 'https://schema.org/Integer';
    FLOAT = 'https://schema.org/Float';
    BOOLEAN = 'https://schema.org/Boolean';

    isTextImportConfigType(type: string | null | undefined): boolean {
        return type == this.STRING || type == "text"
    }

    isTextImportConfig(config: ImportInstanceConfigModel): boolean{
        const type = this.importRequestConfigValueType.get(config.name);
        return this.isTextImportConfigType(type)
    }

    isNumberImportConfigType(type: string | null | undefined): boolean {
        return type == this.INTEGER || type == this.FLOAT || type == "number"
    }

    isNumberImportConfig(config: ImportInstanceConfigModel): boolean{
        const type = this.importRequestConfigValueType.get(config.name);
        return this.isNumberImportConfigType(type)
    }

    isBooleanImportConfigType(type: string | null | undefined): boolean {
        return type == this.BOOLEAN || type == "boolean"
    }


    isBooleanImportConfig(config: ImportInstanceConfigModel): boolean{
        const type = this.importRequestConfigValueType.get(config.name);
        return this.isBooleanImportConfigType(type)
    }

    isUnknownImportConfigType(type: string | null | undefined): boolean {
        return !(
            this.isTextImportConfigType(type) ||
            this.isNumberImportConfigType(type) ||
            this.isBooleanImportConfigType(type))
    }

    isUnknownImportConfig(config: ImportInstanceConfigModel): boolean{
        const type = this.importRequestConfigValueType.get(config.name);
        return this.isUnknownImportConfigType(type)
    }


    /******************************
     *      Util
     ******************************/

    getFieldValue(name: string, type: string, defaultValue: string): string {
        if (!this.result.inputs) {
            this.result.inputs = [];
        }
        var result = this.result.inputs.find(element => element.name == name)
        if (result) {
            return result.value;
        } else {
            this.result.inputs.push({name: name, value: defaultValue, type: type})
            return ""
        }
    }

    setFieldValue(name: string, type: string, value: string) {
        let found = false
        this.result.inputs = this.result.inputs.map(element => {
            if(element.name == name) {
                found = true;
                element.value = value
            }
            return element;
        })
        if(!found) {
            this.result.inputs.push({name: name, value: value, type: type})
        }
    }

    getIncomingOutputs(element: BpmnElement, done: BpmnElement[] = []): Map<string,BpmnParameterWithLabel[]> {
        let result: Map<string,BpmnParameter[]> = new Map<string, BpmnParameterWithLabel[]>();
        if (done.indexOf(element) !== -1) {
            return result;
        }

        let add = (key: string, value: BpmnParameterWithLabel[], element?: any) => {
            if(element && element.name) {
                value = value.map(e => {
                    if(!e.label) {
                        e.label = element.name + ": " + e.name
                    }
                    return e;
                })
            }
            let temp = result.get(key) || [];
            temp = temp.concat(value);
            result.set(key, temp);
        }

        done.push(element);
        for (let index = 0; index < element.incoming.length; index++) {
            const incoming = element.incoming[index].source;
            if (
                incoming.businessObject.extensionElements &&
                incoming.businessObject.extensionElements.values &&
                incoming.businessObject.extensionElements.values[0] &&
                incoming.businessObject.extensionElements.values[0].outputParameters
            ) {
                if(incoming.businessObject.topic) {
                    const topic = incoming.businessObject.topic;
                    add(topic, incoming.businessObject.extensionElements.values[0].outputParameters, incoming.businessObject);
                    if(topic == "analytics" && incoming.businessObject.extensionElements.values[0].outputParameters?.length && incoming.businessObject.extensionElements.values[0].outputParameters?.length > 0) {
                        const flowId = incoming.businessObject.extensionElements.values[0].inputParameters?.find(value => value.name == "analytics.flow_id")?.value;
                        add("flow_selection_raw", [{
                            name: incoming.businessObject.extensionElements.values[0].outputParameters[0].name,
                            label: (incoming.businessObject as any).name,
                            value: flowId || ""
                        }]);
                    }
                    if(topic == "import" && incoming.businessObject.extensionElements.values[0].outputParameters?.length && incoming.businessObject.extensionElements.values[0].outputParameters?.length > 0) {
                        try{
                            const importRequestStr = incoming.businessObject.extensionElements.values[0].inputParameters?.find(value => value.name == "import.request")?.value;
                            if(importRequestStr) {
                                let importRequest = JSON.parse(importRequestStr);
                                if (importRequest.import_type_id) {
                                    const importType = importRequest.import_type_id;
                                    add("import_selection_raw", [{
                                        name: incoming.businessObject.extensionElements.values[0].outputParameters[0].name,
                                        label: (incoming.businessObject as any).name,
                                        value: importType || ""
                                    }]);
                                }
                            }
                        }catch (e) {
                            console.error(e);
                        }
                    }
                } else {
                    add("uncategorized", incoming.businessObject.extensionElements.values[0].outputParameters, incoming.businessObject)
                }
            }
            if (
                incoming.businessObject.$type == "bpmn:StartEvent" &&
                incoming.businessObject.extensionElements?.values &&
                incoming.businessObject.extensionElements.values[0] &&
                incoming.businessObject.extensionElements.values[0].$type == "camunda:FormData"
            ) {
                let formFields = incoming.businessObject.extensionElements.values[0].fields;
                formFields?.forEach(field => {
                    add("form_fields", [{name: field.id, label: field.label, value: ""}]);
                    let iotProperty = field.properties.values.find(property => property.id == "iot") ;
                    if(iotProperty){
                        add("iot_form_fields", [{name: field.id, label: field.label, value: ""}]);
                        iotProperty.value.split(",").forEach(iotKind => {
                            add(iotKind.trim()+"_iot_form_fields", [{name: field.id, label: field.label, value: ""}]);
                        })
                    }else {
                        add("value_form_fields", [{name: field.id, label: field.label, value: ""}]);
                    }
                })
            }
            let sub = this.getIncomingOutputs(incoming, done);
            sub.forEach((value, topic) => {
                add(topic, value)
            })
        }
        return result;
    }

    private addPipelineWithOperatorIdOptionsToAvailableVariables() {
        if(!this.availableProcessVariables.get("flow_selection")) {
            this.availableProcessVariables.set("flow_selection", []);
        }
        let flowSelectionRaw = this.availableProcessVariables.get("flow_selection_raw")?.filter(value => value.value);
        flowSelectionRaw?.forEach(flowSelection => {
            this.flowParser.getInputs(flowSelection.value).subscribe(fields => {
                fields?.forEach(value => {
                    const pipelineFlowSelection = "${"+flowSelection.name+"}:"+value.id;
                    this.availableProcessVariables.get("flow_selection")?.push({name: pipelineFlowSelection, label: flowSelection.label + ": " + value.name, value: ""})
                })

            })
        })
    }

    private addImportIotEntityWithPathToAvailableVariables() {
        if(!this.availableProcessVariables.get("import_selection")) {
            this.availableProcessVariables.set("import_selection", []);
        }
        let importSelectionRaw = this.availableProcessVariables.get("import_selection_raw")?.filter(value => value.value);
        importSelectionRaw?.forEach(importSelection => {
            this.importTypeService.getImportType(importSelection.value).subscribe(importType => {
                this.getImportTypeOutputPathsFormSubElements(importType.output.sub_content_variables).forEach(path => {
                    const selection =  "{\"import_selection\": {\"id\":\"${"+importSelection.name+"}\", \"path\": \""+path+"\"}}";
                    this.availableProcessVariables.get("import_selection")?.push({name: selection, label: importSelection.label + ": " + path, value: ""})
                })
            })
        })
    }

    private getImportTypeOutputPathsFormSubElements(importOutputs: ImportTypeContentVariableModel[] | null, current?: string[]): string[] {
        if(!current) {
            current = [];
        }
        if(!importOutputs|| importOutputs.length == 0) {
            return [current.join(".")]
        } else {
            let result: string[] = [];
            importOutputs.forEach(sub => {
                result = result.concat(this.getImportTypeOutputPaths(sub, JSON.parse(JSON.stringify(current))))
            });
            return result
        }
    }

    private getImportTypeOutputPaths(importOutputs: ImportTypeContentVariableModel, current?: string[]): string[] {
        if(!current) {
            current = [];
        }
        current.push(importOutputs.name);
        if(!importOutputs.sub_content_variables || importOutputs.sub_content_variables.length == 0) {
            return [current.join(".")]
        } else {
            return this.getImportTypeOutputPathsFormSubElements(importOutputs.sub_content_variables, current);
        }
    }

    appendParam(value: string, param: BpmnParameterWithLabel, element: HTMLInputElement): string {
        const placeholder = "${"+param.name+"}";
        let position = 0;
        if(!value) {
            return placeholder;
        }
        if (element.selectionStart) {
            position = element.selectionStart;
            return [value.slice(0, position), placeholder, value.slice(position)].join('')
        } else {
            return value + placeholder;
        }
    }

    isInvalid(): boolean {
        switch (this.result.topic){
            case "export":
                if(!this.exportRequest.Name) {
                    return true;
                }
                if(!this.exportRequest.EntityName) {
                    return true;
                }
                if(!this.exportRequest.FilterType) {
                    return true;
                }
                if(!this.exportRequest.Filter) {
                    return true;
                }
                if(!this.exportRequest.Topic) {
                    return true;
                }
                if(!this.exportRequest.ExportDatabaseID) {
                    return true;
                }
                if(!this.exportRequest.TimePath) {
                    return true;
                }
                if(!this.exportRequest.TimestampFormat) {
                    return true;
                }
                if(!this.exportRequest.ServiceName) {
                    return true;
                }
                if(!this.exportRequest.Offset) {
                    return true;
                }
                if(this.exportRequest.Values?.find(value => !value.Name || !value.Path)) {
                   return true;
                }
                return false
            case "import":
                let invalidJsonConfig = false;
                this.importRequest?.configs?.forEach(value => {
                    if (this.isUnknownImportConfig(value) && (typeof value.value == "string")) {
                        try{
                            JSON.parse(value.value)
                        } catch (e) {
                            invalidJsonConfig = true
                        }
                    }
                })
                return invalidJsonConfig;
            case "info":
                let invalidInfoModuleData = false;
                try{
                    JSON.parse(this.infoModuleData)
                } catch (e) {
                    invalidInfoModuleData = true
                }
                return invalidInfoModuleData;
            default:
                return false;
        }
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        let result = JSON.parse(JSON.stringify(this.result)) as SmartServiceTaskDescription; //prevent changes to the result after filtering
        let temp = result.inputs.filter(e => e.name.startsWith(result.topic+".") &&
                                            !e.name.startsWith("info.") &&
                                            !e.name.startsWith("import.") &&
                                            !e.name.startsWith("export.")); //filter unused inputs (remove existing info, import and export inputs)

        temp.push({name: "export.request", type: "text", value: this.stringifyExport(this.exportRequest)});

        this.handleUnknownImportConfigAsJsonObject();
        temp.push({name: "import.request", type: "text", value: this.stringifyImport(this.importRequest)});
        this.importOverwrites.forEach(value => {
            if(value.json_value) {
                temp.push({name: "import.config.json_overwrite."+value.config_name, type: "text", value: value.json_value})
            }
        })

        temp.push({name: "info.module_type", type: "text", value: this.infoModuleType});
        temp.push({name: "info.module_data", type: "text", value: this.infoModuleData});

        temp = temp.filter(e => e.name.startsWith(result.topic+".")); //filter unused inputs

        result.inputs = temp;
        this.dialogRef.close(result);
    }
}
