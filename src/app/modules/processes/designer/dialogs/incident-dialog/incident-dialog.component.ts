/*
 * Copyright 2025 InfAI (CC SES)
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
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProcessIncidentsConfig } from '../../../incidents/shared/process-incidents.model';

@Component({
    selector: 'app-incident-dialog',
    templateUrl: './incident-dialog.component.html',
    styleUrls: ['./incident-dialog.component.css']
})
export class IncidentDialogComponent {
    form = new FormGroup({
        message: new FormControl('')
    });
    constructor(
      private dialogRef: MatDialogRef<IncidentDialogComponent>,
      @Inject(MAT_DIALOG_DATA) private dialogParams: { config: ProcessIncidentsConfig},
    ) {
        this.form.controls.message.patchValue(dialogParams.config.message);
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.getConfig());
    }

    getConfig(): ProcessIncidentsConfig {
        const config: ProcessIncidentsConfig = {message: ''};
        Object.assign(config, this.form.value);
        return config;
    }

    formValid() {
        return this.form.valid;
    }
}
