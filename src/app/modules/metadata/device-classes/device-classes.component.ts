/*
 * Copyright 2021 InfAI (CC SES)
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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { SortModel } from '../../../core/components/sort/shared/sort.model';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DeviceClassesPermSearchModel } from './shared/device-classes-perm-search.model';
import { DeviceClassesService } from './shared/device-classes.service';
import { DeviceClassesEditDialogComponent } from './dialog/device-classes-edit-dialog.component';
import { DeviceTypeDeviceClassModel } from '../device-types-overview/shared/device-type.model';
import uuid = util.uuid;
import { util } from 'jointjs';
import {AuthorizationService} from '../../../core/services/authorization.service';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-device-classes',
    templateUrl: './device-classes.component.html',
    styleUrls: ['./device-classes.component.css'],
})
export class DeviceClassesComponent implements OnInit, OnDestroy {
    readonly limitInit = 54;

    deviceClasses: DeviceClassesPermSearchModel[] = [];
    gridCols = 0;
    ready = false;
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'));
    userIsAdmin = false;

    private searchText = '';
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(
        private dialog: MatDialog,
        private responsiveService: ResponsiveService,
        private deviceClassesService: DeviceClassesService,
        private searchbarService: SearchbarService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
        private authService: AuthorizationService,
    ) {}

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetDeviceClasses();
        this.userIsAdmin = this.authService.userIsAdmin();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getDeviceClasses(true);
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getDeviceClasses(false);
        }
    }

    editDeviceClass(inputDeviceClass: DeviceClassesPermSearchModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            deviceClass: JSON.parse(JSON.stringify(inputDeviceClass)), // create copy of object
        };

        const editDialogRef = this.dialog.open(DeviceClassesEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newDeviceClass: DeviceTypeDeviceClassModel) => {
            if (newDeviceClass !== undefined) {
                this.reset();
                this.deviceClassesService
                    .updateDeviceClasses(newDeviceClass)
                    .subscribe((deviceClass: DeviceTypeDeviceClassModel | null) => {
                        this.reloadAndShowSnackbar(deviceClass, 'updat');
                    });
            }
        });
    }

    deleteDeviceClass(deviceClass: DeviceClassesPermSearchModel): void {
        this.dialogsService
            .openDeleteDialog('device class ' + deviceClass.name)
            .afterClosed()
            .subscribe((deleteDeviceClass: boolean) => {
                if (deleteDeviceClass) {
                    this.deviceClassesService.deleteDeviceClasses(deviceClass.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.deviceClasses.splice(this.deviceClasses.indexOf(deviceClass), 1);
                            this.snackBar.open('Device class deleted successfully.', undefined, { duration: 2000 });
                            this.setLimitOffset(1);
                            this.reloadDeviceClasses(false);
                        } else {
                            this.snackBar.open('Error while deleting the device class!', "close", { panelClass: "snack-bar-error" });
                        }
                    });
                }
            });
    }

    newDeviceClass(): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            deviceClass: {
                id: 'urn:infai:ses:device-class:' + uuid(),
                image: '',
                name: '',
            } as DeviceTypeDeviceClassModel,
        };

        const editDialogRef = this.dialog.open(DeviceClassesEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newDeviceClass: DeviceTypeDeviceClassModel) => {
            if (newDeviceClass !== undefined) {
                this.reset();
                this.deviceClassesService.createDeviceClass(newDeviceClass).subscribe((deviceClass: DeviceTypeDeviceClassModel | null) => {
                    this.reloadAndShowSnackbar(deviceClass, 'sav');
                });
            }
        });
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetDeviceClasses() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getDeviceClasses(true);
        });
    }

    private getDeviceClasses(reset: boolean) {
        if (reset) {
            this.reset();
        }

        this.deviceClassesService
            .getDeviceClasses(this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order)
            .subscribe((deviceClasses: DeviceClassesPermSearchModel[]) => {
                if (deviceClasses.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.deviceClasses = this.deviceClasses.concat(deviceClasses);
                this.ready = true;
            });
    }

    private reset() {
        this.deviceClasses = [];
        this.limit = this.limitInit;
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }

    private reloadDeviceClasses(reset: boolean) {
        setTimeout(() => {
            this.getDeviceClasses(reset);
        }, 2500);
    }

    private setLimitOffset(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.deviceClasses.length;
    }

    private reloadAndShowSnackbar(deviceClass: DeviceTypeDeviceClassModel | null, text: string) {
        if (deviceClass === null) {
            this.snackBar.open('Error while ' + text + 'ing the device class!', "close", { panelClass: "snack-bar-error" });
            this.getDeviceClasses(true);
        } else {
            this.snackBar.open('Device class ' + text + 'ed successfully.', undefined, { duration: 2000 });
            this.reloadDeviceClasses(true);
        }
    }
}
