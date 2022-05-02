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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SortModel } from '../../../core/components/sort/shared/sort.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { merge, Subscription } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import {WaitingDeviceListModel, WaitingDeviceModel, WaitingRoomEventTypeAuthOk, WaitingRoomEventTypeSet} from './shared/waiting-room.model';
import {debounceTime, startWith, switchMap} from 'rxjs/internal/operators';
import { WaitingRoomService } from './shared/waiting-room.service';
import { DeviceInstancesModel } from '../device-instances/shared/device-instances.model';
import { WaitingRoomDeviceEditDialogComponent } from './dialogs/waiting-room-device-edit-dialog.component';
import { DialogsService } from '../../../core/services/dialogs.service';
import { ConfirmDialogComponent } from '../../../core/dialogs/confirm-dialog.component';
import { WaitingRoomMultiWmbusKeyEditDialogComponent } from './dialogs/waiting-room-multi-wmbus-key-edit-dialog.component';
import {ClosableSnackBarComponent} from '../../../core/components/closable-snack-bar/closable-snack-bar.component';
import {$_} from '@angular/compiler/src/chars';

@Component({
    selector: 'senergy-waiting-room',
    templateUrl: './waiting-room.component.html',
    styleUrls: ['./waiting-room.component.css'],
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
    static wmbusKeyAttributeKey = 'wmbus/key';
    public wmbusKeyAttributeKey = WaitingRoomComponent.wmbusKeyAttributeKey;

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('sort', { static: false }) sort!: MatSort;

    selection = new SelectionModel<WaitingDeviceModel>(true, []);
    displayedColumns: string[] = ['select', 'name', 'created_at', 'updated_at', 'edit', 'use', 'toggle_hide', 'delete'];
    totalCount = 0;

    devices: WaitingDeviceModel[] = [] as WaitingDeviceModel[];
    devicesDataSource = new MatTableDataSource<WaitingDeviceModel>();
    showHidden = localStorage.getItem('devices.waiting-room.showHidden') === 'true';
    ready = false;

    private searchSub: Subscription = new Subscription();
    public searchText = '';
    private devicesSub: Subscription = new Subscription();
    private eventsCloser?: () => void;
    private idSet = new Set();
    private snackBarInstance?: MatSnackBarRef<ClosableSnackBarComponent>;

    constructor(
        private dialog: MatDialog,
        private searchbarService: SearchbarService,
        private waitingRoomService: WaitingRoomService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
    ) {}

    ngOnInit() {
        this.initSearchAndGetDevices();
        this.initEventNotification()
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
        if (this.eventsCloser) {
            this.eventsCloser();
        }
        if (this.snackBarInstance) {
            this.snackBarInstance.dismiss();
        }
    }

    showHiddenChanged() {
        this.showHidden = !this.showHidden;
        localStorage.setItem('devices.waiting-room.showHidden', String(this.showHidden));
        this.getDevices(true);
    }

    private reset() {
        this.paginator.pageIndex = 0;
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
        });
        this.devicesSub = merge(this.sort.sortChange, this.paginator.page)
            .pipe(
                startWith({}),
                switchMap(() => {
                    this.ready = false;
                    return this.waitingRoomService.searchDevices(
                        this.searchText,
                        this.paginator.pageSize,
                        this.paginator.pageSize * this.paginator.pageIndex,
                        this.sort.active,
                        this.sort.direction,
                        this.showHidden,
                    );
                }),
            )
            .subscribe((resp: WaitingDeviceListModel | null) => {
                if (resp !== null) {
                    this.devices = resp.result;
                    if (this.devices === undefined) {
                        this.devices = [];
                    }
                    this.idSet.clear();
                    this.devices.map(value => value.local_id).forEach(value => this.idSet.add(value));
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
            this.devicesDataSource.connect().value.forEach((row) => this.selection.select(row));
        }
    }

    openEditDialog(device: DeviceInstancesModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            device: JSON.parse(JSON.stringify(device)), // create copy of object
            useDialog: false,
        };

        const editDialogRef = this.dialog.open(WaitingRoomDeviceEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((deviceOut: WaitingDeviceModel) => {
            if (deviceOut !== undefined) {
                this.waitingRoomService.updateDevice(deviceOut).subscribe((deviceResp: WaitingDeviceModel | null) => {
                    if (deviceResp === null) {
                        this.snackBar.open('Error while updating the device!', "close", { panelClass: "snack-bar-error" });
                    } else {
                        Object.assign(device, deviceOut);
                        this.snackBar.open('Device updated successfully.', undefined, { duration: 2000 });
                    }
                });
            }
        });
    }

    deleteDevice(localId: string) {
        this.dialogsService
            .openDeleteDialog('device')
            .afterClosed()
            .subscribe((deleteDevice: boolean) => {
                if (deleteDevice) {
                    this.ready = false;
                    this.waitingRoomService.deleteDevice(localId).subscribe((response) => {
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

    useDevice(device: WaitingDeviceModel) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            device: JSON.parse(JSON.stringify(device)), // create copy of object
            useDialog: true,
        };

        const editDialogRef = this.dialog.open(WaitingRoomDeviceEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((deviceOut: WaitingDeviceModel) => {
            if (deviceOut !== undefined) {
                this.ready = false;
                this.waitingRoomService.updateDevice(deviceOut).subscribe((deviceResp: WaitingDeviceModel | null) => {
                    if (deviceResp === null) {
                        this.ready = true;
                        this.snackBar.open('Error while updating the device!', "close", { panelClass: "snack-bar-error" });
                    } else {
                        Object.assign(device, deviceOut);
                        this.waitingRoomService.useDevice(device.local_id).subscribe((response) => {
                            this.ready = true;
                            if (response.status < 300) {
                                this.snackBar.open('Device used', undefined, {
                                    duration: 2000,
                                });
                                this.getDevices(true);
                            } else {
                                this.snackBar.open('Device could not be used', "close", { panelClass: "snack-bar-error" });
                            }
                        });
                    }
                });
            }
        });
    }

    deleteMultipleDevices(): void {
        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' devices' : ' device'))
            .afterClosed()
            .subscribe((deleteDevice: boolean) => {
                if (deleteDevice) {
                    this.ready = false;

                    const deviceIds: string[] = [];

                    this.selection.selected.forEach((exp: WaitingDeviceModel) => {
                        if (exp.local_id !== undefined) {
                            deviceIds.push(exp.local_id);
                        }
                    });
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
        if (this.selectionContainsMissingWmbusKey()) {
            this.useMultipleDevicesWithWmbusKeyEditDialog();
        } else {
            this.useMultipleDevicesWithConfirmDialog();
        }
    }

    useMultipleDevicesWithWmbusKeyEditDialog(): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            devices: this.selection.selected.filter(this.hasMissingAttribute),
        };

        const dialog = this.dialog.open(WaitingRoomMultiWmbusKeyEditDialogComponent, dialogConfig);
        dialog.afterClosed().subscribe((devices: WaitingDeviceModel[]) => {
            if (devices) {
                this.ready = false;

                this.waitingRoomService.updateMultipleDevices(devices).subscribe((devicesResp: WaitingDeviceModel[] | null) => {
                    if (devicesResp === null) {
                        this.ready = true;
                        this.snackBar.open('Error while updating and using the devices!', "close", { panelClass: "snack-bar-error" });
                    } else {
                        const deviceIds: string[] = [];
                        this.selection.selected.forEach((device: WaitingDeviceModel) => {
                            if (device.local_id !== undefined) {
                                deviceIds.push(device.local_id);
                            }
                        });
                        this.waitingRoomService.useMultipleDevices(deviceIds).subscribe(() => {
                            this.paginator.pageIndex = 0;
                            this.getDevices(true);
                            this.selectionClear();
                            this.ready = true;
                        });
                    }
                });
            }
        });
    }

    useMultipleDevicesWithConfirmDialog(): void {
        const text =
            'Do you really want to transfer ' +
            this.selection.selected.length +
            (this.selection.selected.length > 1 ? ' devices' : 'this device') +
            ' to Device-Instances?';
        this.dialogsService
            .openConfirmDialog('Use Devices', text)
            .afterClosed()
            .subscribe((useDevice: boolean) => {
                if (useDevice) {
                    this.ready = false;

                    const deviceIds: string[] = [];

                    this.selection.selected.forEach((exp: WaitingDeviceModel) => {
                        if (exp.local_id !== undefined) {
                            deviceIds.push(exp.local_id);
                        }
                    });
                    this.waitingRoomService.useMultipleDevices(deviceIds).subscribe(() => {
                        this.paginator.pageIndex = 0;
                        this.getDevices(true);
                        this.selectionClear();

                        this.ready = true;
                    });
                }
            });
    }

    hideDevice(localId: string) {
        this.dialogsService
            .openConfirmDialog('Hide Device', 'Do you really want to hide this device?')
            .afterClosed()
            .subscribe((hideDevice: boolean) => {
                if (hideDevice) {
                    this.ready = false;
                    this.waitingRoomService.hideDevice(localId).subscribe((response) => {
                        if (response.status < 300) {
                            this.snackBar.open('Device hidden', undefined, {
                                duration: 2000,
                            });
                            this.getDevices(true);
                        } else {
                            this.snackBar.open('Device could not be hidden', "close", { panelClass: "snack-bar-error" });
                        }
                        this.ready = true;
                    });
                }
            });
    }

    hideMultipleDevices(): void {
        const text =
            'Do you really want to hide ' +
            this.selection.selected.length +
            (this.selection.selected.length > 1 ? ' devices' : 'this device') +
            '?';
        this.dialogsService
            .openConfirmDialog('Hide Devices', text)
            .afterClosed()
            .subscribe((ok: boolean) => {
                if (ok) {
                    this.ready = false;

                    const deviceIds: string[] = [];

                    this.selection.selected.forEach((exp: WaitingDeviceModel) => {
                        if (exp.local_id !== undefined) {
                            deviceIds.push(exp.local_id);
                        }
                    });
                    this.waitingRoomService.hideMultipleDevices(deviceIds).subscribe(() => {
                        this.paginator.pageIndex = 0;
                        this.getDevices(true);
                        this.selectionClear();

                        this.ready = true;
                    });
                }
            });
    }

    showDevice(localId: string) {
        this.dialogsService
            .openConfirmDialog('Show Device', 'Do you really want to show this device?')
            .afterClosed()
            .subscribe((showDevice: boolean) => {
                if (showDevice) {
                    this.ready = false;
                    this.waitingRoomService.showDevice(localId).subscribe((response) => {
                        if (response.status < 300) {
                            this.snackBar.open('Device shown', undefined, {
                                duration: 2000,
                            });
                            this.getDevices(true);
                        } else {
                            this.snackBar.open('Device could not be shown', "close", { panelClass: "snack-bar-error" });
                        }
                        this.ready = true;
                    });
                }
            });
    }

    showMultipleDevices(): void {
        const text =
            'Do you really want to show ' +
            this.selection.selected.length +
            (this.selection.selected.length > 1 ? ' devices' : 'this device') +
            '?';
        this.dialogsService
            .openConfirmDialog('Show Devices', text)
            .afterClosed()
            .subscribe((ok: boolean) => {
                if (ok) {
                    this.ready = false;

                    const deviceIds: string[] = [];

                    this.selection.selected.forEach((exp: WaitingDeviceModel) => {
                        if (exp.local_id !== undefined) {
                            deviceIds.push(exp.local_id);
                        }
                    });
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
        });
        return result;
    }

    get selectedContainsHidden(): boolean {
        let result = false;
        this.selection.selected.forEach((device: WaitingDeviceModel) => {
            if (device.hidden) {
                result = true;
            }
        });
        return result;
    }

    selectionContainsMissingWmbusKey(): boolean {
        return this.selection.selected.some((value) => this.hasMissingAttribute(value));
    }

    // ctx: any = this to keep 'this' in closures
    hasMissingAttribute(element: WaitingDeviceModel): boolean {
        if (element.attributes) {
            return element.attributes.some((value) => value.key === WaitingRoomComponent.wmbusKeyAttributeKey && !value.value);
        }
        return false;
    }

    private initEventNotification() {
        this.waitingRoomService.events(closer => {
            this.eventsCloser = closer;
        })
        .pipe(debounceTime(1000))
        .subscribe((msg) => {
            if (msg.type === WaitingRoomEventTypeSet && !this.idSet.has(msg.payload) && !this.snackBarInstance) {
                let temp = this.snackBar.openFromComponent(ClosableSnackBarComponent, {
                    data: {
                        message: 'New devices found.',
                        action: 'Reload'
                    },
                });
                temp.onAction().subscribe(_ => {
                    this.getDevices(false);
                });
                temp.afterDismissed().subscribe(_ => {
                    if (this && this.snackBarInstance) {
                        this.snackBarInstance = undefined;
                    }
                });
                this.snackBarInstance = temp;
            }
        });
    }
}
