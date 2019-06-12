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
import {FormControl} from '@angular/forms';
import {DeviceTypeService} from '../../shared/device-type.service';
import {
    DeviceTypeFeatureOfInterestModel,
    DeviceTypePropertiesModel, DeviceTypesSensorActuatorModel, SystemType
} from '../../shared/device-type.model';
import {DeviceTypeResponseModel} from '../../shared/device-type-response.model';

@Component({
    templateUrl: './device-types-new-sensor-actuator-dialog.component.html',
    styleUrls: ['./device-types-new-sensor-actuator-dialog.component.css']
})
export class DeviceTypesNewSensorActuatorDialogComponent implements OnInit {

    labelCtrl = new FormControl('');
    optionsCtrl = new FormControl('sensor');
    propertyCtrl = new FormControl('');
    propertyInputCtrl = new FormControl('');
    featureOfInterestCtrl = new FormControl('');
    featureOfInterestInputCtrl = new FormControl('');

    properties: DeviceTypePropertiesModel[] = [];
    featureOfInterests: DeviceTypeFeatureOfInterestModel[] = [];

    hideAddProperty = false;
    hideAddFeatureOfInterest = false;

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

    save(): void {
        this.dialogRef.close({
            type: this.optionsCtrl.value,
            label: this.labelCtrl.value,
            property: this.propertyCtrl.value,
            featureOfInterest: this.featureOfInterestCtrl.value
        } as DeviceTypesSensorActuatorModel);
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

    showFeatureOfInterestInput(show: boolean): void {
        if (show) {
            this.featureOfInterestInputCtrl.setValue('');
        }
        this.hideAddFeatureOfInterest = show;
    }

    addProperty(): void {
        if (this.optionsCtrl.value === SystemType.Sensor) {
            this.deviceTypeService.createObservableProperty(this.propertyInputCtrl.value).subscribe((resp: DeviceTypeResponseModel | null) => {
                this.addPropertyToList(resp);
            });
        } else {
            this.deviceTypeService.createActuatableProperty(this.propertyInputCtrl.value).subscribe((resp: DeviceTypeResponseModel | null) => {
                this.addPropertyToList(resp);
            });
        }
    }

    addFeatureOfInterest(): void {
        this.deviceTypeService.createFeatureOfInterest(this.featureOfInterestInputCtrl.value).subscribe((resp: DeviceTypeResponseModel | null) => {
            this.addFeatureOfInterestToList(resp);
        });
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

    private addFeatureOfInterestToList(resp: DeviceTypeResponseModel | null) {
        if (resp != null) {
            const newFoI: DeviceTypeFeatureOfInterestModel = {uri: resp.uri, label: this.featureOfInterestInputCtrl.value};
            this.featureOfInterestCtrl.setValue(newFoI);
            this.featureOfInterests.push(newFoI);
        }
        this.showFeatureOfInterestInput(false);
    }


    private loadData() {
        if (this.optionsCtrl.value === SystemType.Sensor) {
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

        this.deviceTypeService.getFeatureOfInterests(9999, 0).subscribe(
            (featureOfInterests: DeviceTypeFeatureOfInterestModel[]) => {
                this.featureOfInterests = featureOfInterests;
            }
        );
    }

}