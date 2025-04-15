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

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ProcessIoVariable } from '../shared/process-io.model';

@Component({
    templateUrl: './process-io-variable-edit-dialog.component.html',
    styleUrls: ['./process-io-variable-edit-dialog.component.css'],
})
export class ProcessIoVariableEditDialogComponent {
    variable: ProcessIoVariable;
    valueJson: string;
    enableKey?: boolean;
    enableDefinitionId?: boolean;
    enableInstanceId?: boolean;

    constructor(
        private dialogRef: MatDialogRef<ProcessIoVariableEditDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private data: { variable: ProcessIoVariable; enableDefinitionId?: boolean; enableInstanceId?: boolean; enableKey?: boolean },
    ) {
        this.variable = data.variable;
        this.enableDefinitionId =data.enableDefinitionId;
        this.enableInstanceId =data.enableInstanceId;
        this.enableKey = data.enableKey;
        this.valueJson = JSON.stringify(this.variable.value, null, 2);
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.variable.value = JSON.parse(this.valueJson);
        this.dialogRef.close(this.variable);
    }

    countRows(text: string): number{
        return text.split(/\r?\n|\r/).length;
    }

    isValid(): boolean {
        if(this.valueJson.trim() === '') {
            return false;
        }
        try {
            JSON.parse(this.valueJson);
        } catch (_) {
            return false;
        }
        return this.variable.key !== '';
    }

}
