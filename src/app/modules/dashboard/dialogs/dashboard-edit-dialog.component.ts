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

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { UntypedFormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DashboardModel } from '../shared/dashboard.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../core/directives/matError.directive';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './dashboard-edit-dialog.component.html',
    styleUrls: ['./dashboard-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, MatFormField, MatLabel, MatInput, ReactiveFormsModule, MatError, MatErrorMessagesDirective, MatDialogActions, MatButton]
})
export class DashboardEditDialogComponent {
    private dialogRef = inject<MatDialogRef<DashboardEditDialogComponent>>(MatDialogRef);

    dashboard: DashboardModel;
    formControl = new UntypedFormControl('', [Validators.required, Validators.minLength(1)]);

    constructor() {
        const data = inject<{
            dashboard: DashboardModel;
        }>(MAT_DIALOG_DATA);

        this.dashboard = data.dashboard;
        this.formControl.setValue(this.dashboard.name);
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dashboard.name = this.formControl.value;
        this.dialogRef.close(this.dashboard);
    }
}
