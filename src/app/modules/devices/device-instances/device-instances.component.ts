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

import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';

import {DeviceInstancesService} from './shared/device-instances.service';
import {
    DeviceInstanceModel,
    DeviceInstancesRouterStateTabEnum,
    DeviceInstancesTotalModel,
    FilterSelection} from './shared/device-instances.model';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {Navigation, Router} from '@angular/router';
import {DeviceTypeModel} from '../../metadata/device-types-overview/shared/device-type.model';
import {LocationModel} from '../locations/shared/locations.model';
import {MatTableDataSource} from '@angular/material/table';
import {DeviceInstancesDialogService} from './shared/device-instances-dialog.service';
import {DeviceTypeService} from '../../metadata/device-types-overview/shared/device-type.service';
import {Sort, SortDirection} from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { forkJoin, Observable, map, Subscription, of } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { DeviceInstancesFilterDialogComponent } from './dialogs/device-instances-filter-dialog/device-instances-filter-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import {concatMap} from 'rxjs/operators';
import {PermissionsService} from '../../permissions/shared/permissions.service';
import { HubModel } from '../networks/shared/networks.model';

export interface DeviceInstancesRouterState {
    type: DeviceInstancesRouterStateTypesEnum | undefined | null;
    value: any;
}

// eslint-disable-next-line no-shadow
export enum DeviceInstancesRouterStateTypesEnum {
    NETWORK,
    DEVICE_TYPE,
    LOCATION,
    DEVICE_GROUP,
    CONNECTION_STATE
}

@Component({
    selector: 'senergy-device-instances',
    templateUrl: './device-instances.component.html',
    styleUrls: ['./device-instances.component.css'],
})
export class DeviceInstancesComponent implements OnInit, AfterViewInit, OnDestroy {

    constructor(
        private deviceInstancesService: DeviceInstancesService,
        private router: Router, private deviceInstancesDialogService: DeviceInstancesDialogService,
        private snackBar: MatSnackBar,
        private permissionsDialogService: PermissionsDialogService,
        private dialogsService: DialogsService,
        private deviceTypesService: DeviceTypeService,
        private searchbarService: SearchbarService,
        private dialog: MatDialog,
        private exportDataService: ExportDataService,
        private permissionsService: PermissionsService,
    ) {
        this.getRouterParams();
    }
    displayedColumns = ['select', 'log_state', 'shared', 'display_name', 'info', 'share'];
    pageSize = 20;
    dataSource = new MatTableDataSource<DeviceInstanceModel>();
    selection = new SelectionModel<DeviceInstanceModel>(true, []);
    totalCount = 200;
    offset = 0;
    ready = false;
    searchText = '';
    usage: {
        deviceId: string;
        updateAt: Date;
        bytes: number;
        bytesPerDay: number;
    }[] = [];

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    routerNetwork: string | undefined = undefined;
    routerDeviceType: string[] | undefined = undefined;
    routerLocation: string | undefined = undefined;
    routerDeviceIds: string[] | undefined = undefined;
    routerConnectionState: DeviceInstancesRouterStateTabEnum | undefined = undefined;

    private searchSub: Subscription = new Subscription();
    sortBy = 'display_name';
    sortDirection: SortDirection = 'asc';

    userHasDeleteAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasReadDeviceUsageAuthorization = false;
    userHasUpdateDisplayNameAuthorization = false;
    userHasUpdateAttributesAuthorization = false;
    userHasCreateAuthoriation = false;

    userIdToName: {[key: string]: string} = {};

    ngOnInit(): void {
        this.initSearch(); // does automatically load data on first page load
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(() => {
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.load().subscribe();
        });
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    checkAuthorization() {
        this.userHasReadDeviceUsageAuthorization = this.exportDataService.userHasUsageAuthroization();
        if (this.userHasReadDeviceUsageAuthorization) {
            this.displayedColumns.splice(4, 0, 'usage');
        }

        this.userHasDeleteAuthorization = this.deviceInstancesService.userHasDeleteAuthorization();
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }

        if (this.deviceTypesService.userHasReadAuthorization()) {
            this.displayedColumns.splice(4, 0, 'device_type');
        }

        this.userHasCreateAuthoriation = this.deviceInstancesService.userHasCreateAuthorization();
        if (this.userHasCreateAuthoriation) {
            this.displayedColumns.push('replace');
            this.displayedColumns.push('duplicate');
        }

        this.userHasUpdateDisplayNameAuthorization = this.deviceInstancesService.userHasUpdateDisplayNameAuthorization();
        this.userHasUpdateAttributesAuthorization = this.deviceInstancesService.userHasUpdateAttributesAuthorization();
        this.userHasUpdateAuthorization = this.deviceInstancesService.userHasUpdateAuthorization();

        if (this.userHasUpdateDisplayNameAuthorization || this.userHasUpdateAttributesAuthorization) {
            this.displayedColumns.push('edit');
        }
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;

        if (this.sortBy === 'log_state') {
            this.sortBy = 'annotations.connected';
        }
        this.sortDirection = $event.direction;
        this.reload();
    }

    private loadDevicesByIds(): Observable<DeviceInstanceModel[]> {
        // Only called when beeing redirected from device group page
        if (this.routerDeviceIds) {
            return this.deviceInstancesService.getDeviceInstances({deviceIds: this.routerDeviceIds, limit: this.pageSize, offset: this.offset}).pipe(
                map(result => {
                    this.setDevicesAndTotal(result);
                    return result.result;
                })
            );
        }
        return of([]);

    }

    openFilterDialog() {
        const filterSelection: FilterSelection = {
            connectionState: this.routerConnectionState,
            network: this.routerNetwork,
            deviceTypes: this.routerDeviceType,
            location: this.routerLocation
        };

        const editDialogRef = this.dialog.open(DeviceInstancesFilterDialogComponent, {
            data: filterSelection
        });
        editDialogRef.afterClosed().subscribe({
            next: (filterSelectionInner: FilterSelection) => {
                if (filterSelectionInner != null) {
                    this.routerConnectionState = filterSelectionInner.connectionState;
                    this.routerDeviceType = filterSelectionInner.deviceTypes;
                    this.routerNetwork = filterSelectionInner.network;
                    this.routerLocation = filterSelectionInner.location;
                }
                this.reload();
            }
        });
    }

    private load(): Observable<any> {
        if (this.routerDeviceIds !== undefined) {
            return this.loadDevicesByIds();
        } else {
            return this.deviceInstancesService
                .getDeviceInstances({
                    limit:           this.pageSize,
                    offset:  this.offset,
                    sortBy: this.sortBy,
                    sortDesc: this.sortDirection === 'desc',
                    searchText: this.searchText,
                    locationId:     this.routerLocation,
                    hubId: this.routerNetwork,
                    deviceTypeIds: this.routerDeviceType,
                    connectionState:  this.routerConnectionState
                })
                .pipe(
                    //if no result is found: try to interpret the search as shortDeviceId, convert it to a deviceId and load it
                    concatMap((deviceInstanceWithTotal: DeviceInstancesTotalModel): Observable<DeviceInstancesTotalModel> => {
                        if (deviceInstanceWithTotal.result.length > 0) {
                            return of(deviceInstanceWithTotal);
                        }
                        //we may also search for normal ids
                        if (this.searchText.trim().startsWith('urn:infai:ses:device:')){
                            return this.deviceInstancesService.getDeviceInstances({deviceIds: [this.searchText.trim()], limit: 1, offset: 0});
                        }
                        //short ids are expected to be 22 chars long
                        if (this.searchText.trim().length !== 22) {
                            return of(deviceInstanceWithTotal);
                        }
                        return this.deviceInstancesService.shortIdToUUID(this.searchText).pipe(
                            concatMap((id: string): Observable<DeviceInstancesTotalModel> => {
                                if (id === '' || this.searchText === id) {
                                    return of(deviceInstanceWithTotal);
                                }
                                return this.deviceInstancesService.getDeviceInstances({deviceIds: [id], limit: 1, offset: 0});
                            })
                        );
                    }),
                    //handle results
                    map((deviceInstancesWithTotal: DeviceInstancesTotalModel) => {
                        this.loadUserNames(deviceInstancesWithTotal.result);
                        this.setDevicesAndTotal(deviceInstancesWithTotal);
                        return deviceInstancesWithTotal;
                    }),
                    map(deviceInstancesWithTotal => {
                        if(this.userHasReadDeviceUsageAuthorization && deviceInstancesWithTotal.result.length > 0) {
                            this.exportDataService.getTimescaleDeviceUsage(deviceInstancesWithTotal.result.map(di => di.id)).subscribe(r => this.usage.push(...r));
                        }
                    })
                );
        }
    }

    private loadUserNames(elements: {owner_id: string; shared: boolean}[]) {
        const missingCreators: string[] = [];
        elements?.forEach(element => {
            if(element.shared && element.owner_id && !this.userIdToName[element.owner_id] && !missingCreators.includes(element.owner_id)) {
                missingCreators.push(element.owner_id);
            }
        });
        missingCreators.forEach(creator => {
            this.permissionsService.getUserById(creator).subscribe(value => {
                if(value) {
                    this.userIdToName[value.id] = value.username;
                }
            });
        });
    }

    private setDevicesAndTotal(result: DeviceInstancesTotalModel) {
        this.dataSource.data = result.result;
        this.totalCount = result.total;
    }

    reload() {
        this.offset = 0;
        this.ready = false;
        this.selectionClear();
        this.usage = [];

        this.load().subscribe({
            error: (err) => {
                console.log(err);
                this.ready = true;
            },
            next: () => {
                this.ready = true;
            }
        });
    }

    showInfoOfDevice(device: DeviceInstanceModel): void {
        this.deviceInstancesDialogService.openDeviceServiceDialog(device);
    }

    editDevice(device: DeviceInstanceModel): void {
        this.deviceInstancesDialogService.openDeviceEditDialog(
            device,
            this.userHasUpdateAuthorization,
            this.userHasUpdateDisplayNameAuthorization,
            this.userHasUpdateAttributesAuthorization,
            (spinnerState: boolean) => {
                this.ready = !spinnerState;
            }).subscribe({
            next: (newDevice) => {
                if(newDevice != null) {
                    const index = this.dataSource.data.findIndex(element => element.id === device.id);
                    this.dataSource.data[index] = newDevice;
                    this.dataSource.data = this.dataSource.data;
                }
            }
        });
    }

    duplicateDevice(device: DeviceInstanceModel): void {
        this.deviceInstancesDialogService.openDeviceCreateDialog(undefined, device);
    }

    replaceDevice(device: DeviceInstanceModel): void {
        this.deviceInstancesDialogService.openDeviceReplaceDialog(device);
    }

    deleteDevice(device: DeviceInstanceModel): void {
        this.dialogsService
            .openDeleteDialog('device')
            .afterClosed()
            .subscribe((deviceDelete: boolean) => {
                if (deviceDelete) {
                    this.ready = false;
                    this.deviceInstancesService.deleteDeviceInstance(device.id).subscribe((resp: DeviceInstanceModel | null) => {
                        this.ready = true;
                        if (resp !== null) {
                            this.snackBar.open('Device deleted successfully.', '', { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting device!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        // do deletion on the client instead of reloading, because of caching/slow deletion
                        const index = this.dataSource.data.findIndex(element => element.id === device.id);
                        this.dataSource.data.splice(index, 1);
                        this.dataSource.data = this.dataSource.data;
                    });
                }
            });
    }

    shareDevice(device: DeviceInstanceModel): void {
        this.permissionsDialogService.openPermissionV2Dialog('devices', device.id, device.display_name || device.name);
    }

    private getRouterParams(): void {
        const navigation: Navigation | null = this.router.getCurrentNavigation();
        if (navigation !== null) {
            if (navigation.extras.state !== undefined) {
                const state = navigation.extras.state as DeviceInstancesRouterState;
                switch (state.type) {
                case DeviceInstancesRouterStateTypesEnum.DEVICE_TYPE:
                    this.routerDeviceType = [(state.value as DeviceTypeModel).id];
                    break;
                case DeviceInstancesRouterStateTypesEnum.NETWORK:
                    this.routerNetwork = (state.value as HubModel).id;
                    break;
                case DeviceInstancesRouterStateTypesEnum.LOCATION:
                    this.routerLocation = (state.value as LocationModel).id;
                    break;
                case DeviceInstancesRouterStateTypesEnum.DEVICE_GROUP:
                    this.routerDeviceIds = state.value as string[];
                    break;
                case DeviceInstancesRouterStateTypesEnum.CONNECTION_STATE:
                    this.routerConnectionState = state.value;
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
                    this.selection.selected.forEach((device: DeviceInstanceModel) => {
                        deletionJobs.push(this.deviceInstancesService.deleteDeviceInstance(device.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open('Devices deleted successfully.', undefined, { duration: 2000 });
                    } else {
                        this.snackBar.open('Error while deleting devices!', 'close', { panelClass: 'snack-bar-error' });
                    }
                    this.reload();
                });
            });
    }

    getUsage(d: DeviceInstanceModel) {
        return this.usage.find(u => u.deviceId === d.id);
    }

    formatBytes(bytes: number, decimals = 2) {
        if (bytes === -1) {
            return '';
        }
        if (!+bytes) {
            return '0 Bytes';
        }

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    getUsageTooltip(d: DeviceInstanceModel): string {
        const usage = this.getUsage(d);
        if (usage === undefined) {
            return '';
        }
        return this.formatBytes(usage?.bytesPerDay || 0) + '/day, ' + this.formatBytes((usage?.bytesPerDay || 0) * 30) + '/month';
    }


    isActive(device: DeviceInstanceModel): boolean {
        return device.attributes?.find(a => a.key === 'inactive' && a.value === 'true') === undefined;
    }
}
