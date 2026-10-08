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

import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { ProcessIncidentsConfig } from '../../../incidents/shared/process-incidents.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-incident-dialog',
    templateUrl: './incident-dialog.component.html',
    styleUrls: ['./incident-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MatDialogActions, MatButton]
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
