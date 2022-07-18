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
import {SmartServiceTaskDescription} from '../../shared/designer.model';

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

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.result);
    }
}
