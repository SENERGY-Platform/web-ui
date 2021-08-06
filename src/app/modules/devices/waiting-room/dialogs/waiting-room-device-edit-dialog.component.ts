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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {WaitingDeviceModel} from '../shared/waiting-room.model';
import {DeviceTypeModel} from '../../../metadata/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../metadata/device-types-overview/shared/device-type.service';

@Component({
    templateUrl: './waiting-room-device-edit-dialog.component.html',
    styleUrls: ['./waiting-room-device-edit-dialog.component.css'],
})
export class WaitingRoomDeviceEditDialogComponent implements OnInit {
    device: WaitingDeviceModel;
    deviceType: DeviceTypeModel = {} as DeviceTypeModel;
    disabled: boolean;

    constructor(private dialogRef: MatDialogRef<WaitingRoomDeviceEditDialogComponent>,
                private deviceTypeService: DeviceTypeService,
                @Inject(MAT_DIALOG_DATA) private data: { device: WaitingDeviceModel, disabled: boolean }) {
        this.device = data.device;
        this.disabled = data.disabled;
        deviceTypeService.getDeviceType(data.device.device_type_id).subscribe(dt => {
            if (dt) {
               this.deviceType = dt;
            }
        });
    }

    ngOnInit() {
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.device);
    }

    removeAttr(i: number) {
        if (!this.device.attributes) {
            this.device.attributes = [];
        }
        this.device.attributes.splice(i, 1);
    }

    addAttr() {
        if (!this.device.attributes) {
            this.device.attributes = [];
        }
        this.device.attributes.push({key: '', value: ''});
    }
}
