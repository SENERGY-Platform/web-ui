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

import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';

import {DeviceInstancesService} from './shared/device-instances.service';
import {DeviceInstancesModel} from './shared/device-instances.model';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {Navigation, Router} from '@angular/router';
import {NetworksModel} from '../networks/shared/networks.model';
import {DeviceTypeBaseModel, DeviceTypeModel} from '../../metadata/device-types-overview/shared/device-type.model';
import {LocationModel} from '../locations/shared/locations.model';
import {MatTableDataSource} from '@angular/material/table';
import {DeviceInstancesDialogService} from './shared/device-instances-dialog.service';
import {ExportService} from '../../exports/shared/export.service';
import {DeviceTypeService} from '../../metadata/device-types-overview/shared/device-type.service';
import {DeviceInstancesUpdateModel} from './shared/device-instances-update.model';
import {ExportModel} from '../../exports/shared/export.model';
import {LocationsService} from '../locations/shared/locations.service';
import {NetworksService} from '../networks/shared/networks.service';
import {debounceTime} from 'rxjs/operators';
import {MatSort, Sort, SortDirection} from '@angular/material/sort';
import {UntypedFormControl} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogConfig} from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';

export interface DeviceInstancesRouterState {
    type: DeviceInstancesRouterStateTypesEnum | undefined | null;
    tab: DeviceInstancesRouterStateTabEnum | undefined | null;
    value: any;
}

// eslint-disable-next-line no-shadow
export enum DeviceInstancesRouterStateTypesEnum {
    NETWORK,
    DEVICE_TYPE,
    LOCATION,
    DEVICE_GROUP
}

// eslint-disable-next-line no-shadow
export enum DeviceInstancesRouterStateTabEnum {
    ALL,
    ONLINE,
    OFFLINE,
    UNKNOWN,
}

@Component({
    selector: 'senergy-device-instances',
    templateUrl: './device-instances.component.html',
    styleUrls: ['./device-instances.component.css'],
})
export class DeviceInstancesComponent implements OnInit, AfterViewInit {

    constructor(
        private deviceInstancesService: DeviceInstancesService,
        private router: Router, private deviceInstancesDialogService: DeviceInstancesDialogService,
        private snackBar: MatSnackBar,
        private permissionsDialogService: PermissionsDialogService,
        private dialogsService: DialogsService,
        private locationsService: LocationsService,
        private networksService: NetworksService,
        private deviceTypesService: DeviceTypeService,
        private searchbarService: SearchbarService
    ) {
        this.getRouterParams();
    }
    displayedColumns = ['select', 'log_state', 'shared', 'display_name', 'info', 'share', 'duplicate']
    pageSize = 20;
    dataSource = new MatTableDataSource<DeviceInstancesModel>();
    selection = new SelectionModel<DeviceInstancesModel>(true, []);
    totalCount = 200;
    offset = 0;
    ready = false;
    searchText = '';

    selectedTag = '';
    selectedTagTransformed = '';
    selectedTagType = '';
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    locationOptions: LocationModel[] = [];
    networkOptions: NetworksModel[] = [];
    deviceTypeOptions: DeviceTypeBaseModel[] = [];
    routerNetwork: NetworksModel | null = null;
    routerDeviceType: DeviceTypeBaseModel | null = null;
    routerLocation: LocationModel | null = null;
    routerDeviceIds: string[] | null = null;

    private searchSub: Subscription = new Subscription();
    sortBy: string = "display_name"
    sortDirection: SortDirection = "asc"  
    
    userHasUpdateAuthorization: boolean = false
    userHasDeleteAuthorization: boolean = false

    ngOnInit(): void {
        this.deviceInstancesService.getTotalCountOfDevices().subscribe(totalCount => this.totalCount = totalCount);
        this.loadFilterOptions();
        this.initSearch(); // does automatically load data on first page load
        this.checkAuthorization()
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(()=>{
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.load();
        });
    }

    checkAuthorization() {
        this.deviceInstancesService.userHasUpdateAuthorization().subscribe(hasAuth => {
            this.userHasUpdateAuthorization = hasAuth
            if(hasAuth) {
                this.displayedColumns.push("edit")
            }
        })
        this.deviceInstancesService.userHasDeleteAuthorization().subscribe(hasAuth => {
            this.userHasDeleteAuthorization = hasAuth
            if(hasAuth) {
                this.displayedColumns.push("delete")
            }
        })
        this.deviceTypesService.userHasReadAuthorization().subscribe(hasAuth => {
            if(hasAuth) {
                this.displayedColumns.splice(4, 0, 'device_type')
            }
        })
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active 

        if(this.sortBy == 'log_state') {
            this.sortBy = "annotations.connected"
        }
        this.sortDirection = $event.direction;
        this.reload();
    }

    private loadDevicesOfNetwork() {
        if(this.routerNetwork) {
            this.selectedTag = this.routerNetwork.name;
            this.selectedTagTransformed = this.routerNetwork.name;
            this.deviceInstancesService
                .getDeviceInstancesByHubId(
                    this.pageSize,
                    this.offset,
                    this.sortBy, 
                    this.sortDirection,
                    this.routerNetwork.id,
                    null,
                )
                .subscribe((deviceInstances: DeviceInstancesModel[]) => {
                    this.setDevices(deviceInstances);
                });
        }
    }

    private loadDevicesOfDeviceType() {
        if(this.routerDeviceType) {
            this.selectedTag = this.routerDeviceType.name;
            this.selectedTagTransformed = this.routerDeviceType.name;
            var sortDirection: "asc" | "desc" = this.sortDirection == "" ? "asc" : "desc"
            this.deviceInstancesService
                .getDeviceInstancesByDeviceType(this.routerDeviceType.id, this.pageSize, this.offset, this.sortBy, sortDirection, null)
                .subscribe((deviceInstances) => {
                    this.setDevices(deviceInstances);
                });
        }
    }

    private loadDevicesByIds() {
        if(this.routerDeviceIds) {
            this.deviceInstancesService.getDeviceInstancesByIds(this.routerDeviceIds, this.pageSize, this.offset).subscribe((deviceInstances) => {
                this.setDevices(deviceInstances);
            });
        }
    }

    private load() {
        this.ready = false;

        if (this.routerNetwork !== null) {
            this.loadDevicesOfNetwork()
        } else if (this.routerDeviceType !== null) {
            this.loadDevicesOfDeviceType()
        } else if (this.routerDeviceIds !== null) {
            this.loadDevicesByIds()
        } else {
            if (this.routerLocation !== null) {
                this.selectedTag = this.routerLocation.id;
                this.selectedTagTransformed = this.routerLocation.name;
                this.selectedTagType = 'location';
            }

            this.deviceInstancesService
                .getDeviceInstances(
                    this.pageSize,
                    this.offset,
                    this.sortBy,
                    this.sortDirection,
                    this.searchText,
                    this.selectedTagType,
                    this.selectedTag,
                    null,
                )
                .subscribe((deviceInstances: DeviceInstancesModel[]) => {
                    this.setDevices(deviceInstances);
                });
        }
    }

    private setDevices(instances: DeviceInstancesModel[]) {
        this.dataSource.data = instances;
        this.ready = true;
    }

    tagRemoved(): void {
        this.routerNetwork = null;
        this.routerDeviceType = null;
        this.routerLocation = null;
        this.resetTag();
        this.load();
    }

    private resetTag() {
        this.selectedTag = '';
        this.selectedTagTransformed = '';
        this.selectedTagType = '';
    }

    private loadFilterOptions() {
        this.locationsService.listLocations(100, 0, "name", this.sortDirection).subscribe((value) => {
            this.locationOptions = value;
        });
        this.networksService.listNetworks(100, 0, "name", this.sortDirection).subscribe((value) => {
            this.networkOptions = value;
        });
        this.deviceInstancesService.listUsedDeviceTypeIds().subscribe((deviceTypeIds) => {
            this.deviceTypesService.getDeviceTypeListByIds(deviceTypeIds).subscribe((deviceTypes) => {
                this.deviceTypeOptions = deviceTypes;
            });
        });
    }

    filterByDeviceType(dt: DeviceTypeBaseModel) {
        this.routerLocation = null;
        this.routerNetwork = null;
        this.routerDeviceType = null;

        this.routerDeviceType = dt;
        this.reload();
    }

    filterByLocation(location: LocationModel) {
        this.routerLocation = null;
        this.routerNetwork = null;
        this.routerDeviceType = null;

        this.routerLocation = location;
        this.reload();
    }

    filterByNetwork(network: NetworksModel) {
        this.routerLocation = null;
        this.routerNetwork = null;
        this.routerDeviceType = null;

        this.routerNetwork = network;
        this.reload();
    }

    reload() {
        this.offset = 0;
        this.ready = false;
        this.pageSize = 20;
        this.selectionClear();
        this.load();
    }

    showInfoOfDevice(device: DeviceInstancesModel): void {
        this.deviceInstancesDialogService.openDeviceServiceDialog(device.device_type.id, device.id);
    }

    editDevice(device: DeviceInstancesModel): void {
        this.deviceInstancesDialogService.openDeviceEditDialog(device);
    }

    duplicateDevice(device: DeviceInstancesModel): void {
        this.deviceInstancesDialogService.openDeviceCreateDialog(undefined, device);
    }

    deleteDevice(device: DeviceInstancesModel): void {
        this.dialogsService
            .openDeleteDialog('device')
            .afterClosed()
            .subscribe((deviceDelete: boolean) => {
                if (deviceDelete) {
                    this.ready = false;
                    this.deviceInstancesService.deleteDeviceInstance(device.id).subscribe((resp: DeviceInstancesUpdateModel | null) => {
                        if (resp !== null) {
                            this.snackBar.open('Device deleted successfully.', '', { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting device!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        this.reload();
                    });
                }
            });
    }

    shareDevice(device: DeviceInstancesModel): void {
        this.permissionsDialogService.openPermissionDialog('devices', device.id, device.display_name || device.name);
    }

    private getRouterParams(): void {
        const navigation: Navigation | null = this.router.getCurrentNavigation();
        if (navigation !== null) {
            if (navigation.extras.state !== undefined) {
                const state = navigation.extras.state as DeviceInstancesRouterState;
                switch (state.type) {
                case DeviceInstancesRouterStateTypesEnum.DEVICE_TYPE:
                    this.routerDeviceType = state.value as DeviceTypeBaseModel;
                    break;
                case DeviceInstancesRouterStateTypesEnum.NETWORK:
                    this.routerNetwork = state.value as NetworksModel;
                    break;
                case DeviceInstancesRouterStateTypesEnum.LOCATION:
                    this.routerLocation = state.value as LocationModel;
                    break;
                case DeviceInstancesRouterStateTypesEnum.DEVICE_GROUP:
                    this.routerDeviceIds = state.value as string[];
                    break;
                }
            }
        }
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.dataSource.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.dataSource.connect().value.forEach((row) => this.selection.select(row));
        }
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems() {
        const deletionJobs: Observable<any>[] = [];

        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' devices' : ' device'))
            .afterClosed()
            .subscribe((deleteConcepts: boolean) => {
                if (deleteConcepts) {
                    this.ready = false;
                    this.selection.selected.forEach((device: DeviceInstancesModel) => {
                        deletionJobs.push(this.deviceInstancesService.deleteDeviceInstance(device.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open('Devices deleted successfully.', undefined, {duration: 2000});
                    } else {
                        this.snackBar.open('Error while deleting devices!', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.reload();
                });
            });
    }
}
