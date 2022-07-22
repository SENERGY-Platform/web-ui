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
import {
    SmartServiceTaskInputDescription,
    SmartServiceTaskDescription,
    SmartServiceInputsDescription,
    SmartServiceInput, SmartServiceInputProperty
} from '../../shared/designer.model';
import {ProcessRepoService} from '../../../../processes/process-repo/shared/process-repo.service';
import {DeploymentsService} from '../../../../processes/deployments/shared/deployments.service';
import {ProcessModel} from '../../../../processes/process-repo/shared/process.model';
import {V2DeploymentsPreparedModel} from '../../../../processes/deployments/shared/deployments-prepared-v2.model';
import {FlowRepoService} from '../../../../data/flow-repo/shared/flow-repo.service';
import {FlowModel} from '../../../../data/flow-repo/shared/flow.model';
import {FlowEngineService} from '../../../../data/flow-repo/shared/flow-engine.service';
import {ParserService} from '../../../../data/flow-repo/shared/parser.service';
import {ParseModel} from '../../../../data/flow-repo/shared/parse.model';
import {BpmnElement, BpmnParameter, BpmnParameterWithLabel} from '../../../../processes/designer/shared/designer.model';

@Component({
    templateUrl: './edit-smart-service-input-dialog.component.html',
    styleUrls: ['./edit-smart-service-input-dialog.component.css'],
})
export class EditSmartServiceInputDialogComponent implements OnInit {
    abstract: AbstractInput[] = [];

    constructor(
        private dialogRef: MatDialogRef<EditSmartServiceInputDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { info: SmartServiceInputsDescription, element: BpmnElement},
    ) {
        this.setAbstractByDescription(dialogParams.info);
    }

    ngOnInit() {}

    readAbstractAsDescription(): SmartServiceInputsDescription{
        let inputs: SmartServiceInput[] = this.abstract.map(input => {
            let properties: SmartServiceInputProperty[] = [];
            if(input.description) {
                properties.push({id: "description", value: input.description});
            }
            if(input.iot_selectors) {
                properties.push({id: "iot", value: input.iot_selectors.join(",")});
            }
            if(input.criteria_list) {
                properties.push({id: "criteria_list", value: JSON.stringify(input.criteria_list)});
            }
            if(input.entity_only) {
                properties.push({id: "entity_only", value: JSON.stringify(input.criteria_list)});
            }
            if(input.same_entity) {
                properties.push({id: "same_entity", value: input.same_entity});
            }
            if(input.order) {
                properties.push({id: "order", value: input.order.toString()});
            }
            if(input.multiple) {
                properties.push({id: "multiple", value: JSON.stringify(input.multiple)});
            }
            if(input.options) {
                let obj: any = {};
                input.options.forEach(element => {
                    obj[element.key] = element.value;
                })
                properties.push({id: "options", value: JSON.stringify(obj)});
            }
            return {
                id: input.id,
                label: input.label,
                type: input.type,
                default_value: input.default_value,
                properties: properties
            }
        });

        return {
            inputs: inputs
        }
    }

    setAbstractByDescription(value: SmartServiceInputsDescription){
        this.abstract = value.inputs.map(input => {
            let result = {
                id: input.id,
                label: input.label,
                type: input.type,
                default_value: input.default_value,

                order: 0,
                multiple: false
            } as AbstractInput;
            input.properties.forEach(property => {
                try {
                    if(property.id == "description" && property.value != "") {
                        result.description = property.value;
                    }
                    if(property.id == "iot" && property.value != "") {
                        result.iot_selectors = property.value.split(",").map(value => value.trim());
                    }
                    if(property.id == "criteria" && property.value != "") {
                        result.criteria_list = [JSON.parse(property.value)];
                    }
                    if(property.id == "criteria_list" && property.value != "") {
                        result.criteria_list = JSON.parse(property.value);
                    }
                    if(property.id == "entity_only" && property.value != "") {
                        result.entity_only = JSON.parse(property.value);
                    }
                    if(property.id == "same_entity" && property.value != "") {
                        result.same_entity = property.value;
                    }
                    if(property.id == "order" && property.value != "") {
                        result.order = parseInt(property.value);
                    }
                    if(property.id == "multiple" && property.value != "") {
                        result.multiple = JSON.parse(property.value);
                    }
                    if(property.id == "options" && property.value != "") {
                        let obj = JSON.parse(property.value);
                        result.options = Object.entries(obj).map(([k,v]) =>{ return {key: k, value: v}});
                    }
                } catch (e){
                    console.error(e);
                }
            })
            return result
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.readAbstractAsDescription());
    }
}

interface AbstractInput {
    id: string,
    label: string;
    type: string;
    default_value?: any;

    description?: string;

    iot_selectors?: string[];
    criteria_list?: {
        interaction?: string;
        function_id?: string;
        device_class_id?: string;
        aspect_id?: string;
    }[];
    entity_only?: boolean;
    same_entity?: string;
    options?:{key: string, value: any}[];
    order: number;
    multiple: boolean;
}