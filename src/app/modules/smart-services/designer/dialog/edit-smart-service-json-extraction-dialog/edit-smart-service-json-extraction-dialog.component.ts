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
    ServingRequest,
    SmartServiceTaskInputOutputDescription
} from '../../shared/designer.model';
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
import {AbstractControl, FormGroup, ValidationErrors, ValidatorFn} from '@angular/forms';
import {subtract} from 'lodash';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Component({
    templateUrl: './edit-smart-service-json-extraction-dialog.component.html',
    styleUrls: ['./edit-smart-service-json-extraction-dialog.component.css'],
})
export class EditSmartServiceJsonExtractionDialogComponent implements OnInit {
    exports: JsonExtract[] = [];
    prefix = 'JSON.parse(';
    seperator = ')';

    taskName = '';
    opened: boolean[] = [];

    availableProcessVariables: Map<string,BpmnParameterWithLabel[]> = new Map();

    constructor(
        private dialogRef: MatDialogRef<EditSmartServiceJsonExtractionDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { info: SmartServiceTaskInputOutputDescription; element: BpmnElement},
    ) {
        this.taskName = dialogParams.info.name;
        this.exports = dialogParams.info.outputs.map(value => this.outputToJsonExtract(value)).filter(value => value !== null) as JsonExtract[];
        this.exports.forEach(_ => this.opened.push(false));
        if(this.exports.length === 0) {
            this.opened.push(true);
            this.exports.push({
                JsonSource: '',
                OutputName: '',
                FieldPath: '',
            });
        }
        this.availableProcessVariables = this.getIncomingOutputs(dialogParams.element);
    }

    outputToJsonExtract(outputToJsonExport: SmartServiceTaskInputDescription): JsonExtract | null {
        try{
            if(outputToJsonExport.type !== 'script') {
                return null;
            }
            if(!outputToJsonExport.value.startsWith(this.prefix)) {
                return null;
            }
            const temp = outputToJsonExport.value.substring(this.prefix.length).split(this.seperator);
            if(temp.length !== 2) {
                return null;
            }
            return {
                FieldPath: temp[1],
                JsonSource: temp[0],
                OutputName: outputToJsonExport.name
            };
        }catch (e) {
            console.error(e);
            return null;
        }
    }

    jsonExtractToOutput(extract: JsonExtract): SmartServiceTaskInputDescription {
        let path = extract.FieldPath;
        if(!path.startsWith('.') && !path.startsWith('[')) {
            path = '.'+path;
        }
        return {
            name: extract.OutputName,
            type: 'script',
            value: this.prefix+extract.JsonSource+this.seperator+path
        };
    }

    getIncomingOutputs(element: BpmnElement, done: BpmnElement[] = []): Map<string,BpmnParameterWithLabel[]> {
        const result: Map<string,BpmnParameter[]> = new Map<string, BpmnParameterWithLabel[]>();
        if (done.indexOf(element) !== -1) {
            return result;
        }

        const add = (key: string, value: BpmnParameterWithLabel[], element2?: any) => {
            if(element2 && element2.name) {
                value = value.map(e => {
                    if(!e.label) {
                        e.label = element2.name + ': ' + e.name;
                    }
                    return e;
                });
            }
            let temp = result.get(key) || [];
            temp = temp.concat(value);
            result.set(key, temp);
        };

        done.push(element);
        if(element.incoming) {
            for (let index = 0; index < element.incoming.length; index++) {
                const incoming = element.incoming[index].source;
                if (
                    incoming.businessObject.extensionElements &&
                    incoming.businessObject.extensionElements.values &&
                    incoming.businessObject.extensionElements.values[0] &&
                    incoming.businessObject.extensionElements.values[0].outputParameters
                ) {
                    add('all', incoming.businessObject.extensionElements.values[0].outputParameters, incoming.businessObject);
                    if(incoming.businessObject.topic) {
                        const topic = incoming.businessObject.topic;
                        add(topic, incoming.businessObject.extensionElements.values[0].outputParameters, incoming.businessObject);
                    } else {
                        add('uncategorized', incoming.businessObject.extensionElements.values[0].outputParameters, incoming.businessObject);
                    }
                }
                if (
                    incoming.businessObject.$type === 'bpmn:StartEvent' &&
                    incoming.businessObject.extensionElements?.values &&
                    incoming.businessObject.extensionElements.values[0] &&
                    incoming.businessObject.extensionElements.values[0].$type === 'camunda:FormData'
                ) {
                    const formFields = incoming.businessObject.extensionElements.values[0].fields;
                    formFields?.forEach(field => {
                        add('all', [{name: field.id, label: field.label, value: ''}]);
                        add('form_fields', [{name: field.id, label: field.label, value: ''}]);
                        const iotProperty = field.properties.values.find(property => property.id === 'iot') ;
                        if(iotProperty){
                            add('iot_form_fields', [{name: field.id, label: field.label, value: ''}]);
                            iotProperty.value.split(',').forEach(iotKind => {
                                add(iotKind.trim()+'_iot_form_fields', [{name: field.id, label: field.label, value: ''}]);
                            });
                        }else {
                            add('value_form_fields', [{name: field.id, label: field.label, value: ''}]);
                        }
                    });
                }
                const sub = this.getIncomingOutputs(incoming, done);
                sub.forEach((value, topic) => {
                    add(topic, value);
                });
            }
        }
        return result;
    }

    removeExtraction(index: number){
        this.exports?.splice(index, 1);
        this.opened?.splice(index, 1);
    }

    addExtraction(){
        const tempOpended = [];
        this.exports.forEach(_ => tempOpended.push(false));
        tempOpended.push(true);
        this.opened = tempOpended;
        this.exports?.push({JsonSource: '', FieldPath: '', OutputName: ''});
    }

    ngOnInit() {}

    isInvalid(){
        return false;
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close({
            name: this.taskName,
            inputs: [],
            outputs: this.exports.map(value => this.jsonExtractToOutput(value))
        });
    }
}

interface JsonExtract {
    JsonSource: string;
    FieldPath: string;
    OutputName: string;
}
