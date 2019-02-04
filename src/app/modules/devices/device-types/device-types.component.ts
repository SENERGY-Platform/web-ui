/*
 * Copyright 2018 InfAI (CC SES)
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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {DeviceTypeService} from './shared/device-type.service';
import {DeviceTypePermSearchModel} from './shared/device-type-perm-search.model';
import {DeviceTypeDialogService} from './shared/device-type-dialog.service';
import {DeviceTypeModel} from './shared/device-type.model';
import {MatSnackBar} from '@angular/material';

const grids = new Map([
    ['xs', 1],
    ['sm', 2],
    ['md', 2],
    ['lg', 4],
    ['xl', 6],
]);


@Component({
    selector: 'senergy-device-types',
    templateUrl: './device-types.component.html',
    styleUrls: ['./device-types.component.css']
})
export class DeviceTypesComponent implements OnInit, OnDestroy {

    deviceTypes: DeviceTypePermSearchModel[] = [];
    gridCols = 0;
    ready = false;
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'));

    private searchText = '';
    private limit = 54;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private searchbarService: SearchbarService,
                private responsiveService: ResponsiveService,
                private deviceTypeService: DeviceTypeService,
                private deviceTypeDialogService: DeviceTypeDialogService,
                private snackBar: MatSnackBar) {
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetDeviceTypes();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.reset();
        this.sortAttribute = sortAttribute;
        this.getDeviceTypes();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getDeviceTypes();
        }
    }

    newDeviceType() {
        const newDeviceType: DeviceTypeModel = {} as DeviceTypeModel;
        this.deviceTypeDialogService.openDeviceTypeDialog(newDeviceType).afterClosed().subscribe((deviceTypeResp: DeviceTypeModel) => {
            if (deviceTypeResp !== undefined) {
                this.saveDeviceType(deviceTypeResp);
            }
        });
    }

    edit(deviceTypeInput: DeviceTypePermSearchModel) {
        this.deviceTypeService.getDeviceType(deviceTypeInput.id).subscribe((deviceType: (DeviceTypeModel | null)) => {
            if (deviceType !== null) {
                this.deviceTypeDialogService.openDeviceTypeDialog(deviceType).afterClosed().subscribe((deviceTypeResp: DeviceTypeModel) => {
                    if (deviceTypeResp !== undefined) {
                        this.updateDeviceType(deviceTypeResp, deviceTypeInput);
                    }
                });
            }
        });
    }

    copy(deviceTypeInput: DeviceTypePermSearchModel) {
        this.deviceTypeService.getDeviceType(deviceTypeInput.id).subscribe((deviceType: (DeviceTypeModel | null)) => {
            if (deviceType !== null) {
                deviceType.id = '';
                this.deviceTypeDialogService.openDeviceTypeDialog(deviceType).afterClosed().subscribe((deviceTypeResp: DeviceTypeModel) => {
                    if (deviceTypeResp !== undefined) {
                        this.saveDeviceType(deviceTypeResp);
                    }
                });
            }
        });
    }

    private updateDeviceType(deviceTypeResp: DeviceTypeModel, deviceTypeInput: DeviceTypePermSearchModel) {
        this.deviceTypeService.updateDeviceType(deviceTypeResp).subscribe((deviceTypeUpdated: DeviceTypeModel | null) => {
            if (deviceTypeUpdated) {
                const index = this.deviceTypes.indexOf(deviceTypeInput);
                this.deviceTypes[index] = this.convertDeviceTypes(deviceTypeUpdated);
                this.snackBar.open('Device type updated successfully.', undefined, {duration: 2000});
            } else {
                this.snackBar.open('Error while updating the device type!', undefined, {duration: 2000});
            }
        });
    }

    private saveDeviceType(deviceTypeResp: DeviceTypeModel) {
        this.deviceTypeService.createDeviceType(deviceTypeResp).subscribe((deviceTypeSaved: DeviceTypeModel | null) => {
            if (deviceTypeSaved) {
                this.deviceTypes.push(this.convertDeviceTypes(deviceTypeSaved));
                this.snackBar.open('Device type saved successfully.', undefined, {duration: 2000});
            } else {
                this.snackBar.open('Error while saving the device type!', undefined, {duration: 2000});
            }
        });
    }

    private convertDeviceTypes(deviceTypeIn: DeviceTypeModel): DeviceTypePermSearchModel {
        return {
            services: [],
            vendor: deviceTypeIn.vendor.name,
            img: deviceTypeIn.img,
            device_class: deviceTypeIn.device_class.name,
            description: deviceTypeIn.description,
            creator: 'unknown',
            id: deviceTypeIn.id,
            name: deviceTypeIn.name || '',
        };
    }

    private initSearchAndGetDeviceTypes() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.reset();
            this.searchText = searchText;
            this.getDeviceTypes();
        });
    }

    private getDeviceTypes() {
        this.deviceTypeService.getDeviceTypes(this.searchText, this.limit, this.offset, this.sortAttribute.value,
            this.sortAttribute.order).subscribe(
            (deviceTypes: DeviceTypePermSearchModel[]) => {
                if (deviceTypes.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.deviceTypes = this.deviceTypes.concat(deviceTypes);
                this.ready = true;
            });
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private reset() {
        this.deviceTypes = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }

}
