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
import {MatDialogRef, MatSnackBar} from '@angular/material';
import {FormControl} from '@angular/forms';
import {DeviceTypeService} from '../../shared/device-type.service';
import {
    DeviceTypeFeatureOfInterestModel,
    DeviceTypePropertiesModel, DeviceTypeSensorActuatorModel, SystemType
} from '../../shared/device-type.model';

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
                private deviceTypeService: DeviceTypeService,
                private snackBar: MatSnackBar) {
    }

    ngOnInit(): void {
        this.loadProperties();
        this.loadFeatureOfInterests();
        this.initCtrlChanges();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close({
            type: this.optionsCtrl.value,
            label: this.labelCtrl.value,
            property: {
                uri: this.propertyCtrl.value.uri,
                label: this.propertyCtrl.value.label,
                feature_of_interest: {
                    uri: this.featureOfInterestCtrl.value.uri,
                    label: this.featureOfInterestCtrl.value.label,
                }
            }
        } as DeviceTypeSensorActuatorModel);
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

    private initCtrlChanges() {
        this.optionsCtrl.valueChanges.subscribe(() => {
            this.labelCtrl.setValue('');
            this.propertyCtrl.setValue('');
            this.featureOfInterestCtrl.setValue('');
            this.loadProperties();
            this.showPropertyInput(false);
            this.showFeatureOfInterestInput(false);
        });
        this.propertyCtrl.valueChanges.subscribe(() => {
                this.featureOfInterestCtrl.setValue(this.propertyCtrl.value.feature_of_interest);
            }
        );
    }

    private addPropertyToList() {
        const newProperty: DeviceTypePropertiesModel = {uri: null, label: this.propertyInputCtrl.value, feature_of_interest: null};
        this.propertyCtrl.setValue(newProperty);
        this.properties.push(newProperty);
        this.showPropertyInput(false);
    }

    private addFeatureOfInterestToList() {
        const newFoI: DeviceTypeFeatureOfInterestModel = {uri: null, label: this.featureOfInterestInputCtrl.value};
        this.featureOfInterestCtrl.setValue(newFoI);
        this.featureOfInterests.push(newFoI);
        this.showFeatureOfInterestInput(false);
    }


    private loadFeatureOfInterests() {
        this.deviceTypeService.getFeatureOfInterests(9999, 0).subscribe(
            (featureOfInterests: DeviceTypeFeatureOfInterestModel[]) => {
                this.featureOfInterests = featureOfInterests;
            }
        );
    }

    private loadProperties() {
        if (this.optionsCtrl.value === SystemType.Sensor) {
            this.deviceTypeService.getProperties('observableproperties', 9999, 0).subscribe(
                (properties: DeviceTypePropertiesModel[]) => {
                    this.properties = properties;
                }
            );
        }
        if (this.optionsCtrl.value === SystemType.Actuator) {
            this.deviceTypeService.getProperties('actuatableproperties', 9999, 0).subscribe(
                (properties: DeviceTypePropertiesModel[]) => {
                    this.properties = properties;
                }
            );
        }


    }

}