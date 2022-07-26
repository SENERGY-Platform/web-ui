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
import {SmartServiceTaskInputDescription, SmartServiceTaskDescription} from '../../shared/designer.model';
import {ProcessRepoService} from '../../../../processes/process-repo/shared/process-repo.service';
import {DeploymentsService} from '../../../../processes/deployments/shared/deployments.service';
import {ProcessModel} from '../../../../processes/process-repo/shared/process.model';
import {V2DeploymentsPreparedModel} from '../../../../processes/deployments/shared/deployments-prepared-v2.model';
import {FlowRepoService} from '../../../../data/flow-repo/shared/flow-repo.service';
import {FlowModel} from '../../../../data/flow-repo/shared/flow.model';
import {ParserService} from '../../../../data/flow-repo/shared/parser.service';
import {ParseModel} from '../../../../data/flow-repo/shared/parse.model';
import {BpmnElement, BpmnParameter, BpmnParameterWithLabel} from '../../../../processes/designer/shared/designer.model';
import {ExportModel} from '../../../../exports/shared/export.model';

@Component({
    templateUrl: './edit-smart-service-task-dialog.component.html',
    styleUrls: ['./edit-smart-service-task-dialog.component.css'],
})
export class EditSmartServiceTaskDialogComponent implements OnInit {
    init: SmartServiceTaskDescription;
    result: SmartServiceTaskDescription;
    tabs: string[] = ["process_deployment", "analytics", "export", "import"]

    flows: FlowModel[] | null = null
    processModels: ProcessModel[] | null = null
    selectedProcessModelPreparation: V2DeploymentsPreparedModel | null = null
    knownInputValues = new Map<string, SmartServiceTaskInputDescription>();

    parsedFlows: Map<string, ParseModel[]> = new Map<string, ParseModel[]>();
    currentParsedFlows: ParseModel[] = []

    availableProcessVariables: Map<string,BpmnParameterWithLabel[]> = new Map();

    exportRequest: ExportModel;

    constructor(
        private dialogRef: MatDialogRef<EditSmartServiceTaskDialogComponent>,
        private processRepo: ProcessRepoService,
        private processDeployment: DeploymentsService,
        private flowService: FlowRepoService,
        private flowParser: ParserService,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { info: SmartServiceTaskDescription, element: BpmnElement},
    ) {
        if(!dialogParams.info.topic) {
            dialogParams.info.topic = this.tabs[0];
        }
        this.result = dialogParams.info;
        this.init = dialogParams.info;
        this.ensureResultFields();
        this.availableProcessVariables = this.getIncomingOutputs(dialogParams.element);
        this.exportRequest = this.parseExport(this.result.inputs.find(value => value.name == "export.request")?.value || "{}");
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

    private ensureAnalyticsFlowParameter(flowId: string) {
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
                input.inPorts.forEach(port => {
                    const selectionKey = "analytics.selection."+input.id+"."+port;
                    this.result.inputs.push(this.knownInputValues.get(selectionKey) || {name:selectionKey, value: "{}", type: "text"});
                    const criteriaKey = "analytics.criteria."+input.id+"."+port;
                    this.result.inputs.push(this.knownInputValues.get(criteriaKey) || {name:criteriaKey, value: "[]", type: "text"});
                })
                input.config.forEach(config => {
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

    analyticsInputMatchesIotSelection(input: SmartServiceTaskInputDescription, flowInputId: string, port: string): boolean {
        return input.name == "analytics.selection."+flowInputId+"."+port
    }

    analyticsInputMatchesIotCriteria(input: SmartServiceTaskInputDescription, flowInputId: string, port: string): boolean {
        return input.name == "analytics.criteria."+flowInputId+"."+port
    }

    analyticsInputMatchesIotConfig(input: SmartServiceTaskInputDescription, flowInputId: string, configName: string): boolean {
        return input.name == "analytics.conf."+flowInputId+"."+configName
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
        this.exportRequest?.Values.push({Name: "", Path: "", Type: "string", Tag: false, LastValue: null, InstanceID: ""})
    }

    parseExport(str: string): ExportModel {
        return JSON.parse(str)
    }

    stringifyExport(exp: ExportModel | undefined | null) {
        if(!exp) {
            exp = this.parseExport("{}");
        }
        let unsetEmptyString = function (value: string | undefined): string | undefined {
            if(value && value == "") {
                return undefined;
            }
            return value
        }
        exp.ID = unsetEmptyString(exp.ID);
        exp.FilterType = unsetEmptyString(exp.FilterType);
        exp.Name = unsetEmptyString(exp.Name);
        exp.Description = unsetEmptyString(exp.Description);
        exp.EntityName = unsetEmptyString(exp.EntityName);
        exp.Topic = unsetEmptyString(exp.Topic);
        exp.Measurement = unsetEmptyString(exp.Measurement);
        exp.Database = unsetEmptyString(exp.Database);
        exp.TimePath = unsetEmptyString(exp.TimePath);
        exp.TimePrecision = unsetEmptyString(exp.TimePrecision);
        exp.DbId = unsetEmptyString(exp.DbId);
        exp.DatabaseType = unsetEmptyString(exp.DatabaseType);

        return JSON.stringify(exp);
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

        let add = (key: string, value: BpmnParameterWithLabel[]) => {
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
                incoming.businessObject.extensionElements.values[0].outputParameters &&
                incoming.businessObject.topic
            ) {
                const topic = incoming.businessObject.topic;
                add(topic, incoming.businessObject.extensionElements.values[0].outputParameters)
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

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.result.inputs.push({name: "export.request", type: "text", value: this.stringifyExport(this.exportRequest)})

        let result = JSON.parse(JSON.stringify(this.result)) as SmartServiceTaskDescription; //prevent changes to the result after filtering
        const temp = result.inputs.filter(e => e.name.startsWith(result.topic+".")); //filter unused inputs
        result.inputs = temp;
        this.dialogRef.close(result);
    }
}
