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
import {SmartServiceInputsDescription, SmartServiceTaskDescription} from '../../shared/designer.model';
import {ProcessRepoService} from '../../../../processes/process-repo/shared/process-repo.service';
import {DeploymentsService} from '../../../../processes/deployments/shared/deployments.service';
import {ProcessModel} from '../../../../processes/process-repo/shared/process.model';
import {V2DeploymentsPreparedModel} from '../../../../processes/deployments/shared/deployments-prepared-v2.model';
import {FlowRepoService} from '../../../../data/flow-repo/shared/flow-repo.service';
import {FlowModel} from '../../../../data/flow-repo/shared/flow.model';

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
    knownInputValues = new Map<string, SmartServiceInputsDescription>();

    constructor(
        private dialogRef: MatDialogRef<EditSmartServiceTaskDialogComponent>,
        private processRepo: ProcessRepoService,
        private processDeployment: DeploymentsService,
        private flowService: FlowRepoService,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { info: SmartServiceTaskDescription },
    ) {
        if(!dialogParams.info.topic) {
            dialogParams.info.topic = this.tabs[0];
        }
        this.result = dialogParams.info;
        this.init = dialogParams.info;
        this.ensureResultFields();
    }

    ngOnInit() {}

    ensureResultFields() {
        let processDeploymentTopic = this.tabs[0];
        if(!this.processModels && this.result.topic == processDeploymentTopic) {
            this.processRepo.getProcessModels("", 9999, 0, "date", "asc", null).subscribe(value => this.processModels = value);
        }
        let analyticsTopic = this.tabs[1];
        if(this.result.topic == analyticsTopic) {
            this.ensureFlowList();
        }
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

    processTaskMatches(input: SmartServiceInputsDescription, taskId: string, suffix: string) {
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
        if(flow){
            this.ensureAnalyticsFlowParameter(flow)
        }
    }

    private ensureAnalyticsFlowParameter(flow: FlowModel) {
        console.log("TODO:", flow) //TODO
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

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        let result = JSON.parse(JSON.stringify(this.result)) as SmartServiceTaskDescription; //prevent changes to the result after filtering
        const temp = result.inputs.filter(e => e.name.startsWith(result.topic+".")); //filter unused inputs
        result.inputs = temp;
        this.dialogRef.close(result);
    }
}
