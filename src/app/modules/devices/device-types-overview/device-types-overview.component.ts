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
import {DeviceTypeContentModel, DeviceTypeModel, DeviceTypeServiceModel} from './shared/device-type.model';
import {MatSnackBar} from '@angular/material';
import {DeviceInstancesService} from '../device-instances/shared/device-instances.service';
import {DialogsService} from '../../../core/services/dialogs.service';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);


@Component({
    selector: 'senergy-device-types',
    templateUrl: './device-types-overview.component.html',
    styleUrls: ['./device-types-overview.component.css']
})
export class DeviceTypesOverviewComponent implements OnInit, OnDestroy {

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
                private snackBar: MatSnackBar,
                private deviceInstancesService: DeviceInstancesService,
                private dialogsService: DialogsService) {
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

    delete(deviceTypeInput: DeviceTypePermSearchModel) {
        this.dialogsService.openDeleteDialog('device type: ' + deviceTypeInput.name).afterClosed().subscribe((deviceTypeDelete: boolean) => {
            if (deviceTypeDelete) {
                this.deviceTypeService.deleteDeviceType(encodeURIComponent(deviceTypeInput.id)).subscribe((deleted: boolean) => {
                    if (deleted) {
                        const index = this.deviceTypes.indexOf(deviceTypeInput);
                        this.deviceTypes.splice(index, 1);
                        this.snackBar.open('Device type deleted successfully.', '', {duration: 2000});

                    } else {
                        this.snackBar.open('Error while deleting device type!', '', {duration: 2000});
                    }
                });
            }
        });
    }

    private resetIds(deviceType: DeviceTypeModel): DeviceTypeModel {
        deviceType.id = '';
        deviceType.services.forEach((service: DeviceTypeServiceModel) => {
            service.id = '';
            if (service.inputs) {
                service.inputs.forEach((serviceInput: DeviceTypeContentModel) => {
                    serviceInput.id = '';
                });
            }
            if (service.outputs) {
                service.outputs.forEach((serviceOutput: DeviceTypeContentModel) => {
                    serviceOutput.id = '';
                });
            }
        });
        return deviceType;
    }

    newInstance(deviceType: DeviceTypePermSearchModel): void {
        this.deviceInstancesService.openDeviceCreateDialog(deviceType);
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

    private convertDeviceTypes(deviceTypeIn: DeviceTypeModel): DeviceTypePermSearchModel {
        return {
            id: deviceTypeIn.id,
            name: deviceTypeIn.name || '',
            services: [],
            image: deviceTypeIn.image,
            device_class: deviceTypeIn.device_class.name,
            description: deviceTypeIn.description,
            creator: 'unknown',
            permissions: {
                a: false,
                x: false,
                r: false,
                w: false,
            }
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
