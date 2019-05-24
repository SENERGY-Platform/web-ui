/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Component, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material';
import {FormControl, FormGroup} from '@angular/forms';
import {DeviceTypeService} from '../../shared/device-type.service';

const buttonChangeTime = 500;

@Component({
    templateUrl: './device-types-new-sensor-actuator-dialog.component.html',
    styleUrls: ['./device-types-new-sensor-actuator-dialog.component.css']
})
export class DeviceTypesNewSensorActuatorDialogComponent {

    optionsCtrl = new FormControl('sensor');
    propertyCtrl = new FormControl('');
    propertyInputCtrl = new FormControl('');

    selection = '';
    hideAddProperty = false;
    propertyInputFocus = false;

    constructor(private dialogRef: MatDialogRef<DeviceTypesNewSensorActuatorDialogComponent>,
                private deviceTypeService: DeviceTypeService) {
    }

    close(): void {
        this.dialogRef.close();
    }

    save(label: string): void {
        this.dialogRef.close(label);
    }

    compareUri(a: any, b: any): boolean {
        if (b === null) {
            return false;
        }
        return a.uri === b.uri;
    }

    hideProperty(input: boolean): void {
        if (input) {
            this.propertyInputCtrl.setValue('');
        }
        this.hideAddProperty = input;
    }

    addProperty(input: boolean): void {
        if (this.optionsCtrl.value === 'sensor') {
            this.deviceTypeService.createObservableProperty(this.propertyInputCtrl.value).subscribe();
        } else {
            this.deviceTypeService.createActuatableProperty(this.propertyInputCtrl.value).subscribe();
        }
        this.hideProperty(input);
    }

}