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

import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';

import {DeviceInstancesService} from './shared/device-instances.service';
import {DeviceConnectionState, DeviceInstancesModel, DeviceInstancesTotalModel, FilterSelection, SelectedTag} from './shared/device-instances.model';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {Navigation, Router} from '@angular/router';
import {NetworksModel} from '../networks/shared/networks.model';
import {DeviceTypeBaseModel, DeviceTypeModel} from '../../metadata/device-types-overview/shared/device-type.model';
import {LocationModel} from '../locations/shared/locations.model';
import {MatTableDataSource} from '@angular/material/table';
import {DeviceInstancesDialogService} from './shared/device-instances-dialog.service';
import {DeviceTypeService} from '../../metadata/device-types-overview/shared/device-type.service';
import {DeviceInstancesUpdateModel} from './shared/device-instances-update.model';
import {LocationsService} from '../locations/shared/locations.service';
import {NetworksService} from '../networks/shared/networks.service';
import {MatSort, Sort, SortDirection} from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { forkJoin, Observable, map, Subscription, of } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { DeviceInstancesFilterDialogComponent } from './dialogs/device-instances-filter-dialog/device-instances-filter-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
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
        private deviceTypesService: DeviceTypeService,
        private searchbarService: SearchbarService,
        private dialog: MatDialog,
        private exportDataService: ExportDataService,
    ) {
        this.getRouterParams();
    }
    displayedColumns = ['select', 'log_state', 'shared', 'display_name', 'info', 'share']
    pageSize = 20;
    dataSource = new MatTableDataSource<DeviceInstancesModel>();
    selection = new SelectionModel<DeviceInstancesModel>(true, []);
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
    routerConnectionState: boolean | undefined = undefined;

    private searchSub: Subscription = new Subscription();
    sortBy: string = "display_name"
    sortDirection: SortDirection = "asc"

    userHasUpdateAuthorization: boolean = false
    userHasDeleteAuthorization: boolean = false

    ngOnInit(): void {
        this.initSearch(); // does automatically load data on first page load
        this.checkAuthorization()
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(() => {
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.load().subscribe();
        });
    }

    checkAuthorization() {
        if (this.exportDataService.userHasUsageAuthroization()) {
            this.displayedColumns.splice(4, 0, 'usage')
        }

        this.userHasUpdateAuthorization = this.deviceInstancesService.userHasUpdateAuthorization()
        if (this.userHasUpdateAuthorization) {
            this.displayedColumns.push("edit")
        }

        this.userHasDeleteAuthorization = this.deviceInstancesService.userHasDeleteAuthorization()
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push("delete")
        }

        if (this.deviceTypesService.userHasReadAuthorization()) {
            this.displayedColumns.splice(4, 0, 'device_type')
        }

        if (this.deviceInstancesService.userHasCreateAuthorization()) {
            this.displayedColumns.push("duplicate")
        }
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active

        if (this.sortBy == 'log_state') {
            this.sortBy = "annotations.connected"
        }
        this.sortDirection = $event.direction;
        this.reload();
    }

    private loadDevicesByIds(): Observable<DeviceInstancesModel[]> {
        // Only called when beeing redirected from device group page
        if (this.routerDeviceIds) {
            return this.deviceInstancesService.getDeviceInstancesByIds(this.routerDeviceIds, this.pageSize, this.offset).pipe(
                map(result => {
                    this.setDevicesAndTotal(result);
                    return result.result
                })
            )
        }
        return of([])

    }

    openFilterDialog() {
        var filterSelection: FilterSelection = {
            connectionState: this.routerConnectionState,
            network: this.routerNetwork,
            deviceTypes: this.routerDeviceType,
            location: this.routerLocation
        }

        const editDialogRef = this.dialog.open(DeviceInstancesFilterDialogComponent, {
            data: filterSelection
        });
        editDialogRef.afterClosed().subscribe({
            next: (filterSelection: FilterSelection) => {
                if (filterSelection != null) {
                    this.routerConnectionState = filterSelection.connectionState
                    this.routerDeviceType = filterSelection.deviceTypes
                    this.routerNetwork = filterSelection.network
                    this.routerLocation = filterSelection.location
                }
                this.reload()
            }
        })
    }

    private load(): Observable<any> {
        if (this.routerDeviceIds !== undefined) {
            return this.loadDevicesByIds()
        } else {
            return this.deviceInstancesService
                .getDeviceInstancesWithTotal(
                    this.pageSize,
                    this.offset,
                    this.sortBy,
                    this.sortDirection == "desc",
                    this.searchText,
                    this.routerLocation,
                    this.routerNetwork,
                    this.routerDeviceType,
                    this.routerConnectionState
                )
                .pipe(
                    map((deviceInstancesWithTotal: DeviceInstancesTotalModel) => {
                        this.setDevicesAndTotal(deviceInstancesWithTotal);
                        return deviceInstancesWithTotal
                    }),
                    map(deviceInstancesWithTotal => {
                        this.exportDataService.getTimescaleDeviceUsage(deviceInstancesWithTotal.result.map(di => di.id)).subscribe(r => this.usage.push(...r))
                    })
                );
        }
    }

    private setDevicesAndTotal(result: DeviceInstancesTotalModel) {
        this.dataSource.data = result.result
        this.totalCount = result.total
    }

    reload() {
        this.offset = 0;
        this.ready = false;
        this.pageSize = 20;
        this.selectionClear();
        this.usage = [];

        forkJoin(this.load()).subscribe({
            next: (_) => this.ready = true,
            error: (err) => {
                console.log(err)
            }
        })
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
                        this.routerDeviceType = [(state.value as DeviceTypeBaseModel).id];
                        break;
                    case DeviceInstancesRouterStateTypesEnum.NETWORK:
                        this.routerNetwork = (state.value as NetworksModel).id;
                        break;
                    case DeviceInstancesRouterStateTypesEnum.LOCATION:
                        this.routerLocation = (state.value as LocationModel).id;
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
                        this.snackBar.open('Devices deleted successfully.', undefined, { duration: 2000 });
                    } else {
                        this.snackBar.open('Error while deleting devices!', 'close', { panelClass: 'snack-bar-error' });
                    }
                    this.reload();
                });
            });
    }

    getUsage(d: DeviceInstancesModel) {
        return this.usage.find(u => u.deviceId === d.id);
    }

    formatBytes(bytes: number, decimals = 2) {
        if (!+bytes) return '0 Bytes'

        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

        const i = Math.floor(Math.log(bytes) / Math.log(k))

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    getUsageTooltip(d: DeviceInstancesModel): string {
        const usage = this.getUsage(d);
        if (d === undefined) { 
            return ""; 
        }
        return this.formatBytes(usage?.bytesPerDay || 0) + '/day, ' + this.formatBytes((usage?.bytesPerDay || 0) * 30) + '/month'
    }
}
