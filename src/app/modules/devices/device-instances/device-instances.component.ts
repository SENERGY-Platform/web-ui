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
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
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
import {DeviceInstancesExportDialogComponent} from './dialogs/device-instances-export-dialog.component';
import {LocationsService} from '../locations/shared/locations.service';
import {NetworksService} from '../networks/shared/networks.service';
import {debounceTime} from 'rxjs/operators';
import {MatSort} from '@angular/material/sort';
import {UntypedFormControl} from '@angular/forms';
import {MatLegacyDialog as MatDialog} from '@angular/material/legacy-dialog';
import {MatLegacyDialogConfig as MatDialogConfig} from '@angular/material/legacy-dialog';
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
        private deviceTypeService: DeviceTypeService,
        private exportService: ExportService,
        private locationsService: LocationsService,
        private networksService: NetworksService,
        private deviceTypesService: DeviceTypeService,
        private dialog: MatDialog,
        private searchbarService: SearchbarService
    ) {
        this.getRouterParams();
    }
    readonly pageSize = 20;

    dataSource = new MatTableDataSource<DeviceInstancesModel>();
    @ViewChild(MatSort) sort!: MatSort;
    selection = new SelectionModel<DeviceInstancesModel>(true, []);
    totalCount = 200;
    offset = 0;
    ready = false;
    searchText: string = ""

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
    private searchSub: Subscription = new Subscription();

    ngOnInit(): void {
        this.deviceInstancesService.getTotalCountOfDevices().subscribe(totalCount => this.totalCount = totalCount)
        this.loadFilterOptions();
        this.initSearch(); // does automatically load data on first page load
    }

    ngAfterViewInit(): void {
        this.dataSource.sort = this.sort
        this.dataSource.sortingDataAccessor = (row: any, sortHeaderId: string) => {
            var value = row[sortHeaderId];
            value = (typeof(value) === 'string') ? value.toUpperCase(): value;
            return value
        };
        
        this.paginator.page.subscribe(()=>{
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.load()
        });
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    private load() {
        this.ready = false;

        if (this.routerLocation !== null) {
            this.selectedTag = this.routerLocation.id;
            this.selectedTagTransformed = this.routerLocation.name;
            this.selectedTagType = 'location';
        }

        if (this.routerNetwork !== null) {
            this.selectedTag = this.routerNetwork.name;
            this.selectedTagTransformed = this.routerNetwork.name;
            this.deviceInstancesService
                .getDeviceInstancesByHubId(
                    this.pageSize,
                    this.offset,
                    'display_name',
                    'asc',
                    this.routerNetwork.id,
                    null,
                )
                .subscribe((deviceInstances: DeviceInstancesModel[]) => {
                    this.setDevices(deviceInstances);
                });
        } else if (this.routerDeviceType !== null) {
            this.selectedTag = this.routerDeviceType.name;
            this.selectedTagTransformed = this.routerDeviceType.name;
            this.deviceInstancesService
                .getDeviceInstancesByDeviceType(this.routerDeviceType.id, this.pageSize, this.offset, 'display_name', 'asc', null)
                .subscribe((deviceInstances) => {
                    this.setDevices(deviceInstances);
                });

        } else {
            this.deviceInstancesService
                .getDeviceInstances(
                    this.pageSize,
                    this.offset,
                    'display_name',
                    'asc',
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
        this.locationsService.listLocations(100, 0, 'name', 'asc').subscribe((value) => {
            this.locationOptions = value;
        });
        this.networksService.listNetworks(100, 0, 'name', 'asc').subscribe((value) => {
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
                        this.reload()
                    });
                }
            });
    }

    shareDevice(device: DeviceInstancesModel): void {
        this.permissionsDialogService.openPermissionDialog('devices', device.id, device.display_name || device.name);
    }

    exportDevice(device: DeviceInstancesModel) {
        this.deviceTypeService.getDeviceType(device.device_type.id).subscribe((deviceType: DeviceTypeModel | null) => {
            if (deviceType !== null) {
                const exports: ExportModel[] = [];
                deviceType.services.forEach((service) => {
                    const newExports = this.exportService.prepareDeviceServiceExport(device, service);
                    newExports.forEach((singleExport) => {
                        singleExport.Description = 'Created at device overview';
                        singleExport.Generated = false;
                    });
                    exports.push(...newExports);
                });
                if (exports.length > 0) {
                    const dialogConfig = new MatDialogConfig();
                    dialogConfig.minWidth = '375px';
                    dialogConfig.data = {
                        exports,
                    };
                    this.dialog.open(DeviceInstancesExportDialogComponent, dialogConfig);
                } else {
                    this.snackBar.open('Device type has no output services!', 'close', { panelClass: 'snack-bar-error' });
                }
            } else {
                this.snackBar.open('Could not read device type!', 'close', { panelClass: 'snack-bar-error' });
            }
        });
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
                this.reload()
            })
        });
    }
}
