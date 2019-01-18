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
} from '../shared/device-type-select.model';
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

    result: DeviceTypeSelectionResultModel;

    constructor(
        private dialogRef: MatDialogRef<SelectDeviceTypeAndServiceDialogComponent>,
        private dtService: DeviceTypeService,
        @Inject(MAT_DIALOG_DATA) private data: {selection: DeviceTypeSelectionRefModel}
    ) {
        const that = this;
        this.result = {
            deviceType: {name: '', id: ''},
            service: {name: '', id: ''},
            skeleton: {}
        };

        this.devicetypeOptions = new Observable<DeviceTypePermSearchModel[]>((observer: Subscriber<DeviceTypePermSearchModel[]>) => {
            this.devicetypeSelectionFormControl.valueChanges.subscribe(() => {
                const dt: any = this.devicetypeSelectionFormControl.value;
                const searchText: string = (dt.name === '' || dt.name) ? dt.name : dt;
                this.dtService.getDeviceTypes(searchText, 20, 0, 'name', 'asc').subscribe(value => observer.next(value));
            });
        });

        this.serviceOptions = new Observable<DeviceTypeServiceModel[]>((observer: Subscriber<DeviceTypeServiceModel[]>) => {
            this.devicetypeSelectionFormControl.valueChanges.subscribe(() => {
                const dt: any = that.devicetypeSelectionFormControl.value;
                if (dt.id) {
                    that.dtService.getDeviceType(dt.id).subscribe((value: DeviceTypeModel|null) => {
                        if (value) {
                            observer.next(value.services);
                        }
                    });
                }
            });
        });

        this.devicetypeSelectionFormControl.valueChanges.subscribe(() => {
            this.setDeviceType();
        });
        this.serviceOptions.subscribe(() => {
            this.onServiceOpitionsChange();
        });
        this.serviceSelectionFormControl.valueChanges.subscribe(() => {
            this.setService();
        });

        if (data.selection && data.selection.deviceTypeId && data.selection.serviceId) {
            // order is important to prevent race between change handler
            // service change handler terminates immediately because result.deviceType.id === ''
            this.dtService.getDeviceType(data.selection.deviceTypeId).subscribe((dt: DeviceTypeModel|null) => {
                if (dt) {
                    const serviceSelection = (<[DeviceTypeServiceModel]>this.serviceSelectionFormControl.value)
                        .find((service: DeviceTypeServiceModel) => service.id === data.selection.serviceId) || {id: '', name: ''};
                    this.serviceSelectionFormControl.setValue(serviceSelection);
                    this.devicetypeSelectionFormControl.setValue(dt);
                }
            }, (err: any) => {
                console.log('ERROR: ', err);
            });
        }
    }

    ngOnInit() {

    }

    setDeviceType() {
        const dtSelection = <DeviceTypeInfoModel>this.devicetypeSelectionFormControl.value;
        if (dtSelection && dtSelection.id) {
            this.dtService.getDeviceType(dtSelection.id).subscribe((dt: DeviceTypeModel|null) => {
                if (dt) {
                    this.result.deviceType = {name: dt.name || '', id: dt.id };
                }
            }, (err: any) => {
                console.log('ERROR: ', err);
            });
        } else {
            this.result.deviceType =  {name: '', id: ''};
        }
    }

    onServiceOpitionsChange() {
        const sSelection = <ServiceInfoModel>this.serviceSelectionFormControl.value;
        if (sSelection && sSelection.id) {
            const selectionExists = (<[DeviceTypeServiceModel]>this.serviceSelectionFormControl.value)
                .some((service: DeviceTypeServiceModel) => service.id === sSelection.id);
            if (selectionExists) {
                this.serviceSelectionFormControl.setValue(sSelection);
            } else {
                this.serviceSelectionFormControl.reset();
            }
        }
    }

    setService() {
        const dtSelection = <DeviceTypeInfoModel>this.devicetypeSelectionFormControl.value;
        const serviceSelection = <ServiceInfoModel>this.serviceSelectionFormControl.value;
        if (dtSelection && dtSelection.id && serviceSelection && serviceSelection.id) {
            this.result.service = {name: serviceSelection.name || '', id: serviceSelection.id};
            this.dtService.getDeviceTypeSkeleton(dtSelection.id, serviceSelection.id).subscribe((skeleton: BpmnSkeletonModel | null) => {
                this.result.skeleton = skeleton || {};
            }, (err: any) => {
                console.log('ERROR: ', err);
            });
        } else {
            this.result.service = {id: '', name: ''};
            this.result.skeleton = {};
        }
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
        return this.result && this.result.service && this.result.service.id;
    }

}
