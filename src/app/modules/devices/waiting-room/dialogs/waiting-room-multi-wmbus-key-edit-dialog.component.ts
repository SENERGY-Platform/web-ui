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

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { WaitingDeviceModel } from '../shared/waiting-room.model';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { FormBuilder, FormsModule } from '@angular/forms';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './waiting-room-multi-wmbus-key-edit-dialog.component.html',
    styleUrls: ['./waiting-room-multi-wmbus-key-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MatDialogActions, MatButton]
})
export class WaitingRoomMultiWmbusKeyEditDialogComponent {
    private _formBuilder = inject(FormBuilder);
    private dialogRef = inject<MatDialogRef<WaitingRoomMultiWmbusKeyEditDialogComponent>>(MatDialogRef);
    private deviceTypeService = inject(DeviceTypeService);
    private data = inject<{
        devices: WaitingDeviceModel[];
    }>(MAT_DIALOG_DATA);

    static wmbusKeyAttributeKey = 'wmbus/key';
    public wmbusKeyAttributeKey = WaitingRoomMultiWmbusKeyEditDialogComponent.wmbusKeyAttributeKey;

    devices: WaitingDeviceModel[];

    constructor() {
        const data = this.data;

        if (data.devices) {
            this.devices = JSON.parse(JSON.stringify(data.devices));
        } else {
            this.devices = [];
        }
    }

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
