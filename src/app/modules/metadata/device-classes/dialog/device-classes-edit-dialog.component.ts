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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConceptsService } from '../../concepts/shared/concepts.service';
import { DeviceClassesPermSearchModel } from '../shared/device-classes-perm-search.model';

@Component({
    templateUrl: './device-classes-edit-dialog.component.html',
    styleUrls: ['./device-classes-edit-dialog.component.css'],
})
export class DeviceClassesEditDialogComponent implements OnInit {
    deviceClassFormGroup!: FormGroup;

    constructor(
        private conceptsService: ConceptsService,
        private dialogRef: MatDialogRef<DeviceClassesEditDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) data: { deviceClass: DeviceClassesPermSearchModel },
    ) {
        this.initDeviceClassFormGroup(data.deviceClass);
    }

    ngOnInit(): void {}

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.deviceClassFormGroup.getRawValue());
    }

    compare(a: any, b: any): boolean {
        return a.id === b.id;
    }

    private initDeviceClassFormGroup(deviceClass: DeviceClassesPermSearchModel): void {
        this.deviceClassFormGroup = this._formBuilder.group({
            id: [{ value: deviceClass.id, disabled: true }],
            name: [deviceClass.name, Validators.required],
            image: deviceClass.image,
        });
    }
}
