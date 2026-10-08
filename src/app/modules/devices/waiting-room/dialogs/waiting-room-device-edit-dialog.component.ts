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
import { WaitingDeviceModel } from '../shared/waiting-room.model';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { FormArray, FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DeviceTypeModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { Attribute } from '../../device-instances/shared/device-instances.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDivider } from '@angular/material/divider';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
    templateUrl: './waiting-room-device-edit-dialog.component.html',
    styleUrls: ['./waiting-room-device-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MatCheckbox, ReactiveFormsModule, MatDivider, MatIconButton, MatIcon, MatButton, MatDialogActions]
})
export class WaitingRoomDeviceEditDialogComponent {
    private _formBuilder = inject(FormBuilder);
    private dialogRef = inject<MatDialogRef<WaitingRoomDeviceEditDialogComponent>>(MatDialogRef);
    private deviceTypeService = inject(DeviceTypeService);
    private data = inject<{
        device: WaitingDeviceModel;
        useDialog: boolean;
    }>(MAT_DIALOG_DATA);

    device: WaitingDeviceModel;
    deviceType: DeviceTypeModel = {} as DeviceTypeModel;
    useDialog: boolean;
    attrFormGroup: FormGroup = new FormGroup({ attributes: new FormArray([]) });

    constructor() {
        const deviceTypeService = this.deviceTypeService;
        const data = this.data;

        this.device = data.device;
        this.useDialog = data.useDialog;
        if (this.device.attributes === undefined || this.device.attributes === null) {
            this.device.attributes = [];
        }
        this.device.attributes.push({origin: 'web-ui', key: 'last_message_max_age', value: '24h' });
        this.initAttrFormGroup();
        deviceTypeService.getDeviceType(data.device.device_type_id).subscribe((dt) => {
            if (dt) {
                this.deviceType = dt;
            }
        });
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
            attributes: this._formBuilder.array(
                this.device.attributes ? this.device.attributes.map((elem: Attribute) => this.createAttrGroup(elem)) : [],
            ),
        });
    }

    private createAttrGroup(attribute: Attribute): FormGroup {
        let result: FormGroup;
        if (this.useDialog) {
            result = this._formBuilder.group({
                key: [{ disabled: false, value: attribute.key }, Validators.required],
                value: [{ disabled: false, value: attribute.value }, Validators.required],
            });
        } else {
            result = this._formBuilder.group({
                key: [{ disabled: false, value: attribute.key }, Validators.required],
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
        const formArray = this.attrFormGroup.controls['attributes'] as FormArray;
        formArray.removeAt(i);
    }

    addAttr() {
        const formArray = this.attrFormGroup.controls['attributes'] as FormArray;
        formArray.push(this.createAttrGroup({ key: '', value: '' } as Attribute));
    }
}
