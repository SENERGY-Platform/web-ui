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
import {Attribute, DeviceInstancesModel} from '../shared/device-instances.model';
import { DeviceInstancesService } from '../shared/device-instances.service';
import {AbstractControl, FormControl, ValidationErrors} from '@angular/forms';

@Component({
    templateUrl: './device-instances-edit-dialog.component.html',
    styleUrls: ['./device-instances-edit-dialog.component.css'],
})
export class DeviceInstancesEditDialogComponent implements OnInit {
    device: DeviceInstancesModel;
    displayname: string = "";
    nicknameAttributeKey: string = "shared/nickname";
    nicknameAttributeOrigin: string = "shared"

    constructor(
        private dialogRef: MatDialogRef<DeviceInstancesEditDialogComponent>,
        private deviceInstancesService: DeviceInstancesService,
        @Inject(MAT_DIALOG_DATA) private data: { device: DeviceInstancesModel },
    ) {
        this.device = data.device;
        this.device.attributes?.forEach(value => {
            if (value.key == this.nicknameAttributeKey) {
                this.displayname = value.value;
            }
        })
    }

    ngOnInit() {}

    getShortId(id: string): string {
        return this.deviceInstancesService.convertToShortId(id);
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.setDisplayNameAttribute()
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
        this.device.attributes.push({ key: '', value: '', origin: 'web-ui'});
    }

    editableAttribute(attr: Attribute) {
        return !attr.origin || attr.origin == '' || attr.origin == 'web-ui'
    }

    private setDisplayNameAttribute() {
        if(!this.device.attributes) {
            this.device.attributes = [];
        }
        this.device.attributes = this.device.attributes?.filter((value)=>{
            return value.key != this.nicknameAttributeKey;
        })
        if (this.displayname != "") {
            this.device.attributes?.push({
                key: this.nicknameAttributeKey,
                origin: this.nicknameAttributeOrigin,
                value: this.displayname
            } as Attribute)
        }
    }

    isValid(): boolean {
        if(!this.localIdFieldIsValid()) {
            return false;
        }
        return true;
    }

    localIdFieldIsValid(): boolean{
        return isValidLocalId(this.device.local_id);
    }

    isValidLocalIdValidator(c: AbstractControl): ValidationErrors | null {
        if (isValidLocalId(c.value)) {
            return null;
        }else{
            return {
                validateLocalId: {
                    valid: false
                }
            }
        }
    }
}

function isValidLocalId(value: string): boolean {
    if(!value) {
        return true;
    }
    return !(value.includes && (value.includes("#") || value.includes("+") || value.includes("/")))
}