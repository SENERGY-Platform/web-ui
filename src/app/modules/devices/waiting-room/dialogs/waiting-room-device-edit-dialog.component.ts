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
import {Attribute, WaitingDeviceModel} from '../shared/waiting-room.model';
import {DeviceTypeService} from '../../../metadata/device-types-overview/shared/device-type.service';
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {DeviceTypeModel} from '../../../metadata/device-types-overview/shared/device-type.model';

@Component({
    templateUrl: './waiting-room-device-edit-dialog.component.html',
    styleUrls: ['./waiting-room-device-edit-dialog.component.css'],
})
export class WaitingRoomDeviceEditDialogComponent implements OnInit {
    device: WaitingDeviceModel;
    deviceType: DeviceTypeModel = {} as DeviceTypeModel;
    useDialog: boolean;
    attrFormGroup: FormGroup = new FormGroup({attributes: new FormArray([])});

    constructor(private _formBuilder: FormBuilder,
                private dialogRef: MatDialogRef<WaitingRoomDeviceEditDialogComponent>,
                private deviceTypeService: DeviceTypeService,
                @Inject(MAT_DIALOG_DATA) private data: { device: WaitingDeviceModel, useDialog: boolean,  }) {
        this.device = data.device;
        this.useDialog = data.useDialog;
        this.initAttrFormGroup();
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
        this.device.attributes = this.attrFormGroup.getRawValue().attributes;
        this.dialogRef.close(this.device);
    }

    private initAttrFormGroup() {
        this.attrFormGroup = this._formBuilder.group({
            attributes: this._formBuilder.array(this.device.attributes ?
                this.device.attributes.map((elem: Attribute) => this.createAttrGroup(elem)) : [])
        });
    }

    private createAttrGroup(attribute: Attribute): FormGroup {
        let result: FormGroup;
        if (this.useDialog) {
            result = this._formBuilder.group({
                key: [{disabled: false, value: attribute.key}, Validators.required],
                value: [{disabled: false, value: attribute.value}, Validators.required],
            });
        } else {
            result = this._formBuilder.group({
                key: [{disabled: false, value: attribute.key}, Validators.required],
                value: [attribute.value],
            });
        }
        result.markAllAsTouched();
        return result;
    }

    get attributes(): FormArray {
        return this.attrFormGroup.get('attributes') as FormArray;
    }

    removeAttr(i: number) {
        const formArray = <FormArray>this.attrFormGroup.controls['attributes'];
        formArray.removeAt(i);
    }

    addAttr() {
        const formArray = <FormArray>this.attrFormGroup.controls['attributes'];
        formArray.push(this.createAttrGroup({key: '', value: ''} as Attribute));
    }
}
