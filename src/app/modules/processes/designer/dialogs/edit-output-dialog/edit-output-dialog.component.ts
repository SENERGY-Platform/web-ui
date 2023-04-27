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
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { BpmnParameter } from '../../shared/designer.model';

@Component({
    templateUrl: './edit-output-dialog.component.html',
    styleUrls: ['./edit-output-dialog.component.css'],
})
export class EditOutputDialogComponent implements OnInit {
    outputs: BpmnParameter[];

    constructor(
        private dialogRef: MatDialogRef<EditOutputDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { outputs: BpmnParameter[] },
    ) {
        this.outputs = dialogParams.outputs;
    }

    ngOnInit() {}

    close(): void {
        this.dialogRef.close();
    }
}
