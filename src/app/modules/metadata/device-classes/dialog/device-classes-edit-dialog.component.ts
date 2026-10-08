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
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConceptsService } from '../../concepts/shared/concepts.service';
import { DeviceTypeDeviceClassModel } from '../../device-types-overview/shared/device-type.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './device-classes-edit-dialog.component.html',
    styleUrls: ['./device-classes-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MatDialogActions, MatButton]
})
export class DeviceClassesEditDialogComponent {
    private conceptsService = inject(ConceptsService);
    private dialogRef = inject<MatDialogRef<DeviceClassesEditDialogComponent>>(MatDialogRef);
    private _formBuilder = inject(FormBuilder);

    deviceClassFormGroup!: FormGroup;

    constructor() {
        const data = inject<{
            deviceClass: DeviceTypeDeviceClassModel;
        }>(MAT_DIALOG_DATA);

        this.initDeviceClassFormGroup(data.deviceClass);
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.deviceClassFormGroup.getRawValue());
    }

    compare(a: any, b: any): boolean {
        return a.id === b.id;
    }

    private initDeviceClassFormGroup(deviceClass: DeviceTypeDeviceClassModel): void {
        this.deviceClassFormGroup = this._formBuilder.group({
            id: [{ value: deviceClass.id, disabled: true }],
            name: [deviceClass.name, Validators.required],
            image: deviceClass.image,
        });
    }
}
