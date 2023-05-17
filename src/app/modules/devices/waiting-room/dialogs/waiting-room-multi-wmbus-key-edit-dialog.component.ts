/*
 * Copyright 2021 InfAI (CC SES)
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
import { Attribute, WaitingDeviceModel } from '../shared/waiting-room.model';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DeviceTypeModel } from '../../../metadata/device-types-overview/shared/device-type.model';

@Component({
    templateUrl: './waiting-room-multi-wmbus-key-edit-dialog.component.html',
    styleUrls: ['./waiting-room-multi-wmbus-key-edit-dialog.component.css'],
})
export class WaitingRoomMultiWmbusKeyEditDialogComponent implements OnInit {
    static wmbusKeyAttributeKey = 'wmbus/key';
    public wmbusKeyAttributeKey = WaitingRoomMultiWmbusKeyEditDialogComponent.wmbusKeyAttributeKey;

    devices: WaitingDeviceModel[];

    constructor(
        private _formBuilder: FormBuilder,
        private dialogRef: MatDialogRef<WaitingRoomMultiWmbusKeyEditDialogComponent>,
        private deviceTypeService: DeviceTypeService,
        @Inject(MAT_DIALOG_DATA) private data: { devices: WaitingDeviceModel[] },
    ) {
        if (data.devices) {
            this.devices = JSON.parse(JSON.stringify(data.devices));
        } else {
            this.devices = [];
        }
    }

    ngOnInit() {}

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.devices);
    }

    isInvalid(): boolean {
        if (this.devices) {
            return this.devices.some((value) => this.hasMissingAttribute(value));
        }
        return true;
    }

    hasMissingAttribute(element: WaitingDeviceModel): boolean {
        if (element.attributes) {
            return element.attributes.some(
                (value) => value.key === WaitingRoomMultiWmbusKeyEditDialogComponent.wmbusKeyAttributeKey && !value.value,
            );
        }
        return false;
    }
}
