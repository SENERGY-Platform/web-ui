/*
 * Copyright 2019 InfAI (CC SES)
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
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {
    BpmnSkeletonModel,
    DeviceTypeInfoModel,
    DeviceTypeSelectionRefModel,
    DeviceTypeSelectionResultModel, ServiceInfoModel
} from '../shared/device-type-selection.model';
import {FormControl} from '@angular/forms';
import {DeviceTypeService} from '../shared/device-type.service';
import {DeviceTypePermSearchModel} from '../shared/device-type-perm-search.model';
import {DeviceTypeModel, DeviceTypeServiceModel} from '../shared/device-type.model';
import {Observable, Subscriber} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
    templateUrl: './select-device-type-and-service-dialog.component.html',
    styleUrls: ['./select-device-type-and-service-dialog.component.css'],
})
export class SelectDeviceTypeAndServiceDialogComponent implements OnInit {
    devicetypeSelectionFormControl = new FormControl('');
    serviceSelectionFormControl = new FormControl('');
    serviceOptions: Observable<DeviceTypeServiceModel[]>;
    devicetypeOptions: Observable<DeviceTypePermSearchModel[]>;
    limit = 20;

    result: DeviceTypeSelectionResultModel;

    constructor(
        private dialogRef: MatDialogRef<SelectDeviceTypeAndServiceDialogComponent>,
        private dtService: DeviceTypeService,
        @Inject(MAT_DIALOG_DATA) private dialogParams: {selection: DeviceTypeSelectionRefModel}
    ) {
        this.result = {
            deviceType: {name: '', id: ''},
            service: {name: '', id: ''},
            skeleton: {}
        };

        this.devicetypeOptions = this.getDeviceTypeOptionsObservable(this.devicetypeSelectionFormControl);
        this.serviceOptions = this.createServiceOptionsObservable(this.devicetypeSelectionFormControl);
    }

    ngOnInit() {
        this.devicetypeSelectionFormControl.valueChanges.subscribe(() => {
            this.setDeviceTypeResult(<DeviceTypeInfoModel>this.devicetypeSelectionFormControl.value);
        });
        this.serviceOptions.subscribe((serviceOptions: DeviceTypeServiceModel[]) => {
            this.resetServiceSelection(this.serviceSelectionFormControl, serviceOptions);
        });
        this.serviceSelectionFormControl.valueChanges.subscribe(() => {
            this.setServiceResult(this.devicetypeSelectionFormControl, this.serviceSelectionFormControl);
        });

        this.useDialogParams();
    }

    displayFn(input?: DeviceTypePermSearchModel): string | undefined {
        return input ? input.name : undefined;
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.result);
    }

    isValid() {
        // console.log(this.result && this.result.service && this.result.service.id, this.result);
        return this.result && this.result.service && this.result.service.id;
    }

    private useDialogParams() {
        if (this.dialogParams.selection && this.dialogParams.selection.deviceTypeId && this.dialogParams.selection.serviceId) {
            this.dtService.getDeviceType(this.dialogParams.selection.deviceTypeId).subscribe((dt: DeviceTypeModel | null) => {
                if (dt) {
                    const serviceSelection = (<[DeviceTypeServiceModel]>this.serviceSelectionFormControl.value)
                        .find((service: DeviceTypeServiceModel) => service.id === this.dialogParams.selection.serviceId) || {
                        id: '',
                        name: ''
                    };
                    // order is important to prevent race between change handler
                    // service change handler terminates immediately because result.deviceType.id === ''
                    this.serviceSelectionFormControl.setValue(serviceSelection);
                    this.devicetypeSelectionFormControl.setValue(dt);
                }
            });
        }
    }

    // expects FormControl with DeviceTypeModel
    private createServiceOptionsObservable(devicetypeSelectionFormControl: FormControl) {
        return new Observable<DeviceTypeServiceModel[]>((observer: Subscriber<DeviceTypeServiceModel[]>) => {
            devicetypeSelectionFormControl.valueChanges.subscribe(() =>  {
                const dt: any = devicetypeSelectionFormControl.value;
                if (dt.id) {
                    this.dtService.getDeviceType(dt.id).subscribe((value: DeviceTypeModel | null) => {
                        if (value) {
                            observer.next(value.services);
                        }
                    });
                }
            });
        });
    }

    // expects FormControl with DeviceTypeModel (reads DeviceTypeModel.name) or string
    private getDeviceTypeOptionsObservable(devicetypeSelectionFormControl: FormControl) {
        return new Observable<DeviceTypePermSearchModel[]>((observer: Subscriber<DeviceTypePermSearchModel[]>) => {
            devicetypeSelectionFormControl.valueChanges.subscribe(() => {
                const dt: any = devicetypeSelectionFormControl.value;
                const searchText: string = (dt.name === '' || dt.name) ? dt.name : dt;
                this.dtService.getDeviceTypes(searchText, this.limit, 0, 'name', 'asc').subscribe(value => observer.next(value));
            });
        });
    }

    private setDeviceTypeResult(dtSelection: DeviceTypeInfoModel) {
        if (dtSelection && dtSelection.id) {
            this.dtService.getDeviceType(dtSelection.id).subscribe((dt: DeviceTypeModel|null) => {
                if (dt) {
                    this.result.deviceType = {name: dt.name || '', id: dt.id };
                }
            });
        } else {
            this.result.deviceType =  {name: '', id: ''};
        }
    }

    // expect serviceSelectionFormControl as FormControl with ServiceInfoModel
    private resetServiceSelection(serviceSelectionFormControl: FormControl, serviceOptions: DeviceTypeServiceModel[]) {
        const sSelection = <ServiceInfoModel>serviceSelectionFormControl.value;
        if (sSelection && sSelection.id) {
            const selectionExists = serviceOptions.some((service: DeviceTypeServiceModel) => service.id === sSelection.id);
            if (selectionExists) {
                serviceSelectionFormControl.setValue(sSelection);
            } else {
                serviceSelectionFormControl.reset();
            }
        }
    }

    // expect devicetypeSelectionFormControl as FormControl with DeviceTypeInfoModel
    // expect serviceSelectionFormControl as FormControl with ServiceInfoModel
    private setServiceResult(devicetypeSelectionFormControl: FormControl, serviceSelectionFormControl: FormControl) {
        const dtSelection = <DeviceTypeInfoModel>devicetypeSelectionFormControl.value;
        const serviceSelection = <ServiceInfoModel>serviceSelectionFormControl.value;
        if (dtSelection && dtSelection.id && serviceSelection && serviceSelection.id) {
            this.result.service = {name: serviceSelection.name || '', id: serviceSelection.id};
            this.dtService.getDeviceTypeSkeleton(dtSelection.id, serviceSelection.id).subscribe((skeleton: BpmnSkeletonModel | null) => {
                this.result.skeleton = skeleton || {};
            });
        } else {
            this.result.service = {id: '', name: ''};
            this.result.skeleton = {};
        }
    }
}
