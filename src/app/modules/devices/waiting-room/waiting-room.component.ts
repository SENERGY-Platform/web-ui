/*
 * Copyright 2021 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {merge, Subscription} from 'rxjs';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {SelectionModel} from '@angular/cdk/collections';
import {MatTableDataSource} from '@angular/material/table';
import {WaitingDeviceListModel, WaitingDeviceModel} from './shared/waiting-room.model';
import {startWith, switchMap} from 'rxjs/internal/operators';
import {WaitingRoomService} from './shared/waiting-room.service';
import {DeviceInstancesModel} from '../device-instances/shared/device-instances.model';
import {DeviceInstancesEditDialogComponent} from '../device-instances/dialogs/device-instances-edit-dialog.component';
import {DeviceInstancesUpdateModel} from '../device-instances/shared/device-instances-update.model';
import {WaitingRoomDeviceEditDialogComponent} from './dialogs/waiting-room-device-edit-dialog.component';
import {ExportModel} from '../../exports/shared/export.model';
import {DialogsService} from '../../../core/services/dialogs.service';


@Component({
    selector: 'senergy-waiting-room',
    templateUrl: './waiting-room.component.html',
    styleUrls: ['./waiting-room.component.css']
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
    @ViewChild('paginator', {static: false}) paginator!: MatPaginator;
    @ViewChild('sort', {static: false}) sort!: MatSort;

    selection = new SelectionModel<WaitingDeviceModel>(true, []);
    displayedColumns: string[] = ['select', 'name', 'created_at', 'updated_at', 'info', 'edit', 'use', 'toggle_hide', 'delete'];
    totalCount = 0;

    devices: WaitingDeviceModel[] = [] as WaitingDeviceModel[];
    devicesDataSource = new MatTableDataSource<WaitingDeviceModel>();
    showHidden = localStorage.getItem('devices.waiting-room.showHidden') === 'true';
    ready = false;


    private searchSub: Subscription = new Subscription();
    public searchText = '';
    private devicesSub: Subscription = new Subscription();

    constructor(private dialog: MatDialog,
                private searchbarService: SearchbarService,
                private waitingRoomService: WaitingRoomService,
                private snackBar: MatSnackBar,
                private dialogsService: DialogsService,
    ) {
    }

    ngOnInit() {
        this.initSearchAndGetDevices();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    showHiddenChanged() {
        this.showHidden = !this.showHidden;
        localStorage.setItem('devices.waiting-room.showHidden', String(this.showHidden));
        this.getDevices(true);
    }

    private reset() {
        this.devices = [];
        this.ready = false;
    }

    selectionClear(): void {
        this.selection.clear();
    }

    private getDevices(reset: boolean) {
        if (reset) {
            this.reset();
        }
        this.devicesDataSource.sort = this.sort;
        this.sort.sortChange.subscribe(() => {
                this.paginator.pageIndex = 0;
                this.selectionClear();
            }
        );
        this.devicesSub = merge(this.sort.sortChange, this.paginator.page).pipe(startWith({}), switchMap(() => {
            this.ready = false;
            return this.waitingRoomService.searchDevices(
                this.searchText,
                this.paginator.pageSize, this.paginator.pageSize * this.paginator.pageIndex,
                this.sort.active,
                this.sort.direction,
                this.showHidden
            );
        })).subscribe(
            (resp: WaitingDeviceListModel | null) => {
                if (resp !== null) {
                    this.devices = resp.result;
                    if (this.devices === undefined) {
                        this.devices = [];
                    }
                    this.totalCount = resp.total;
                    this.devicesDataSource.data = this.devices;
                }
                this.ready = true;
            });
    }

    private initSearchAndGetDevices() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getDevices(true);
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.devicesDataSource.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.devicesDataSource.connect().value.forEach(row => this.selection.select(row));
        }
    }

    openDetailsDialog(device: WaitingDeviceModel) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            device: JSON.parse(JSON.stringify(device)),      // create copy of object
            disabled: true
        };

        const editDialogRef = this.dialog.open(WaitingRoomDeviceEditDialogComponent, dialogConfig);
    }

    openEditDialog(device: DeviceInstancesModel): void {

        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            device: JSON.parse(JSON.stringify(device)),      // create copy of object
            disabled: false
        };

        const editDialogRef = this.dialog.open(WaitingRoomDeviceEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((deviceOut: WaitingDeviceModel) => {
            if (deviceOut !== undefined) {
                this.waitingRoomService.updateDevice(deviceOut).subscribe(
                    (deviceResp: WaitingDeviceModel | null) => {
                        if (deviceResp === null) {
                            this.snackBar.open('Error while updating the device!', undefined, {duration: 2000});
                        } else {
                            Object.assign(device, deviceOut);
                            this.snackBar.open('Device updated successfully.', undefined, {duration: 2000});
                        }
                    });
            }
        });
    }

    deleteDevice(local_id: string) {
        this.dialogsService.openDeleteDialog('device').afterClosed().subscribe((deleteDevice: boolean) => {
            if (deleteDevice) {
                this.ready = false;
                this.waitingRoomService.deleteDevice(local_id).subscribe((response) => {
                    if (response.status < 300) {
                        this.snackBar.open('Device deleted', undefined, {
                            duration: 2000,
                        });
                        this.getDevices(true);
                    } else {
                        this.snackBar.open('Device could not be deleted', undefined, {
                            duration: 2000,
                        });
                    }
                    this.ready = true;
                });
            }
        });
    }

    useDevice(local_id: string) {
        this.dialogsService.openConfirmDialog('Use Device', 'Do you really want to transfer this device to Device-Instances?').afterClosed().subscribe((useDevice: boolean) => {
            if (useDevice) {
                this.ready = false;
                this.waitingRoomService.useDevice(local_id).subscribe((response) => {
                    if (response.status < 300) {
                        this.snackBar.open('Device used', undefined, {
                            duration: 2000,
                        });
                        this.getDevices(true);
                    } else {
                        this.snackBar.open('Device could not be used', undefined, {
                            duration: 2000,
                        });
                    }
                    this.ready = true;
                });
            }
        });
    }

    deleteMultipleDevices(): void {
        this.dialogsService.openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' devices' : ' device')).afterClosed().subscribe(
            (deleteDevice: boolean) => {

                if (deleteDevice) {
                    this.ready = false;

                    const deviceIds: string[] = [];

                    this.selection.selected.forEach((exp: WaitingDeviceModel) => {
                            if (exp.local_id !== undefined) {
                                deviceIds.push(exp.local_id);
                            }
                        }
                    );
                    this.waitingRoomService.deleteMultipleDevices(deviceIds).subscribe(() => {
                        this.paginator.pageIndex = 0;
                        this.getDevices(true);
                        this.selectionClear();

                        this.ready = true;
                    });
                }
            });
    }

    useMultipleDevices(): void {
        const text = 'Do you really want to transfer ' + this.selection.selected.length + (this.selection.selected.length > 1 ? ' devices' : 'this device') + ' to Device-Instances?';
        this.dialogsService.openConfirmDialog('Use Devices', text).afterClosed().subscribe(
            (useDevice: boolean) => {

                if (useDevice) {
                    this.ready = false;

                    const deviceIds: string[] = [];

                    this.selection.selected.forEach((exp: WaitingDeviceModel) => {
                            if (exp.local_id !== undefined) {
                                deviceIds.push(exp.local_id);
                            }
                        }
                    );
                    this.waitingRoomService.useMultipleDevices(deviceIds).subscribe(() => {
                        this.paginator.pageIndex = 0;
                        this.getDevices(true);
                        this.selectionClear();

                        this.ready = true;
                    });
                }
            });
    }

    hideDevice(local_id: string) {
        this.dialogsService.openConfirmDialog('Hide Device', 'Do you really want to hide this device?').afterClosed().subscribe((hideDevice: boolean) => {
            if (hideDevice) {
                this.ready = false;
                this.waitingRoomService.hideDevice(local_id).subscribe((response) => {
                    if (response.status < 300) {
                        this.snackBar.open('Device hidden', undefined, {
                            duration: 2000,
                        });
                        this.getDevices(true);
                    } else {
                        this.snackBar.open('Device could not be hidden', undefined, {
                            duration: 2000,
                        });
                    }
                    this.ready = true;
                });
            }
        });
    }

    hideMultipleDevices(): void {
        const text = 'Do you really want to hide ' + this.selection.selected.length + (this.selection.selected.length > 1 ? ' devices' : 'this device') + '?';
        this.dialogsService.openConfirmDialog('Hide Devices', text).afterClosed().subscribe(
            (ok: boolean) => {

                if (ok) {
                    this.ready = false;

                    const deviceIds: string[] = [];

                    this.selection.selected.forEach((exp: WaitingDeviceModel) => {
                            if (exp.local_id !== undefined) {
                                deviceIds.push(exp.local_id);
                            }
                        }
                    );
                    this.waitingRoomService.hideMultipleDevices(deviceIds).subscribe(() => {
                        this.paginator.pageIndex = 0;
                        this.getDevices(true);
                        this.selectionClear();

                        this.ready = true;
                    });
                }
            });
    }

    showDevice(local_id: string) {
        this.dialogsService.openConfirmDialog('Hide Device', 'Do you really want to show this device?').afterClosed().subscribe((hideDevice: boolean) => {
            if (hideDevice) {
                this.ready = false;
                this.waitingRoomService.showDevice(local_id).subscribe((response) => {
                    if (response.status < 300) {
                        this.snackBar.open('Device shown', undefined, {
                            duration: 2000,
                        });
                        this.getDevices(true);
                    } else {
                        this.snackBar.open('Device could not be shown', undefined, {
                            duration: 2000,
                        });
                    }
                    this.ready = true;
                });
            }
        });
    }

    showMultipleDevices(): void {
        const text = 'Do you really want to show ' + this.selection.selected.length + (this.selection.selected.length > 1 ? ' devices' : 'this device') + '?';
        this.dialogsService.openConfirmDialog('Show Devices', text).afterClosed().subscribe(
            (ok: boolean) => {

                if (ok) {
                    this.ready = false;

                    const deviceIds: string[] = [];

                    this.selection.selected.forEach((exp: WaitingDeviceModel) => {
                            if (exp.local_id !== undefined) {
                                deviceIds.push(exp.local_id);
                            }
                        }
                    );
                    this.waitingRoomService.showMultipleDevices(deviceIds).subscribe(() => {
                        this.paginator.pageIndex = 0;
                        this.getDevices(true);
                        this.selectionClear();

                        this.ready = true;
                    });
                }
            });
    }

    get selectedContainsShown(): boolean {
        let result = false;
        this.selection.selected.forEach((device: WaitingDeviceModel) => {
                if (!device.hidden) {
                    result = true;
                }
            }
        );
        return result;
    }

    get selectedContainsHidden(): boolean {
        let result = false;
        this.selection.selected.forEach((device: WaitingDeviceModel) => {
                if (device.hidden) {
                    result = true;
                }
            }
        );
        return result;
    }
}
