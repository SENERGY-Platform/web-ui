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

@Component({
    templateUrl: './edit-smart-service-task-dialog.component.html',
    styleUrls: ['./edit-smart-service-task-dialog.component.css'],
})
export class EditSmartServiceTaskDialogComponent implements OnInit {
    init: SmartServiceTaskDescription;
    result: SmartServiceTaskDescription;
    tabs: string[] = ["process_deployment", "analytics", "export", "import"]

    constructor(
        private dialogRef: MatDialogRef<EditSmartServiceTaskDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { info: SmartServiceTaskDescription },
    ) {
        this.result = dialogParams.info;
        this.init = dialogParams.info;
        this.ensureResultFields();
    }

    ngOnInit() {}

    ensureResultFields() {

    }

    get activeIndex(): number {
        return this.tabs.indexOf(this.result.topic)
    }

    set activeIndex(index: number) {
        this.result.topic = this.tabs[index]
        this.ensureResultFields();
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
        this.dialogRef.close(this.result);
    }
}
