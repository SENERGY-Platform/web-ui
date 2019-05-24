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
import {DeviceTypeClassModel, DeviceTypePropertiesModel} from '../../shared/device-type.model';
import {DeviceTypeResponseModel} from '../../shared/device-type-response.model';

const buttonChangeTime = 500;

@Component({
    templateUrl: './device-types-new-sensor-actuator-dialog.component.html',
    styleUrls: ['./device-types-new-sensor-actuator-dialog.component.css']
})
export class DeviceTypesNewSensorActuatorDialogComponent implements OnInit {

    optionsCtrl = new FormControl('sensor');
    propertyCtrl = new FormControl('');
    propertyInputCtrl = new FormControl('');

    properties: DeviceTypePropertiesModel[] = [];

    selection = '';
    hideAddProperty = false;

    constructor(private dialogRef: MatDialogRef<DeviceTypesNewSensorActuatorDialogComponent>,
                private deviceTypeService: DeviceTypeService) {
    }

    ngOnInit(): void {
        this.loadData();
        this.initCtrlChanges();
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

    showPropertyInput(show: boolean): void {
        if (show) {
            this.propertyInputCtrl.setValue('');
        }
        this.hideAddProperty = show;
    }

    addProperty(): void {
        if (this.optionsCtrl.value === 'sensor') {
            this.deviceTypeService.createObservableProperty(this.propertyInputCtrl.value).subscribe((resp: DeviceTypeResponseModel | null) => {
                this.addPropertyToList(resp);
            });
        } else {
            this.deviceTypeService.createActuatableProperty(this.propertyInputCtrl.value).subscribe((resp: DeviceTypeResponseModel | null) => {
                this.addPropertyToList(resp);
            });
        }
    }

    private initCtrlChanges() {
        this.optionsCtrl.valueChanges.subscribe(() => {
            this.propertyCtrl.setValue('');
            this.loadData();
        });
    }

    private addPropertyToList(resp: DeviceTypeResponseModel | null) {
        if (resp != null) {
            const newProperty: DeviceTypePropertiesModel = {uri: resp.uri, label: this.propertyInputCtrl.value};
            this.propertyCtrl.setValue(newProperty);
            this.properties.push(newProperty);
        }
        this.showPropertyInput(false);
    }

    private loadData() {
        if (this.optionsCtrl.value === 'sensor') {
            this.deviceTypeService.getProperties('observableproperties', 9999, 0).subscribe(
                (properties: DeviceTypePropertiesModel[]) => {
                    this.properties = properties;
                }
            );
        } else {
            this.deviceTypeService.getProperties('actuatableproperties', 9999, 0).subscribe(
                (properties: DeviceTypePropertiesModel[]) => {
                    this.properties = properties;
                }
            );
        }
    }

}