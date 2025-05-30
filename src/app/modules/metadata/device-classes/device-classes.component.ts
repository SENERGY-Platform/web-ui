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

import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { forkJoin, Observable, Subscription, map } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DeviceClassesService } from './shared/device-classes.service';
import { DeviceClassesEditDialogComponent } from './dialog/device-classes-edit-dialog.component';
import { DeviceTypeDeviceClassModel } from '../device-types-overview/shared/device-type.model';
import {AuthorizationService} from '../../../core/services/authorization.service';
import { Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import {
    UsedInDeviceTypeQuery,
    UsedInDeviceTypeResponseElement
} from '../device-types-overview/shared/used-in-device-type.model';
import {DeviceTypeService} from '../device-types-overview/shared/device-type.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';

@Component({
    selector: 'senergy-device-classes',
    templateUrl: './device-classes.component.html',
    styleUrls: ['./device-classes.component.css'],
})
export class DeviceClassesComponent implements OnInit, OnDestroy, AfterViewInit {
    displayedColumns = ['select', 'name'];
    pageSize = this.preferencesService.pageSize;
    ready = false;
    dataSource = new MatTableDataSource<DeviceTypeDeviceClassModel>();
    selection = new SelectionModel<DeviceTypeDeviceClassModel>(true, []);
    totalCount = 200;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    userIsAdmin = false;
    searchText = '';
    offset = 0;
    private searchSub: Subscription = new Subscription();
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    userHasUsedInAuthorization = false;
    usedIn: Map<string,UsedInDeviceTypeResponseElement> = new Map<string, UsedInDeviceTypeResponseElement>();

    constructor(
        private dialog: MatDialog,
        private deviceClassesService: DeviceClassesService,
        private searchbarService: SearchbarService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private authService: AuthorizationService,
        private deviceTypeService: DeviceTypeService,
        private preferencesService: PreferencesService,
    ) {}

    ngOnInit() {
        this.userIsAdmin = this.authService.userIsAdmin();
        this.initSearch();
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((e)=>{
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getDeviceClasses().subscribe();
        });
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    checkAuthorization() {
        this.userHasUsedInAuthorization = this.deviceTypeService.userHasUsedInAuthorization();
        if(this.userHasUsedInAuthorization) {
            this.displayedColumns.push('useCount');
        }

        this.userHasUpdateAuthorization = this.deviceClassesService.userHasUpdateAuthorization();
        if( this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.deviceClassesService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }

        this.userHasCreateAuthorization = this.deviceClassesService.userHasDeleteAuthorization();
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    editDeviceClass(inputDeviceClass: DeviceTypeDeviceClassModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            deviceClass: JSON.parse(JSON.stringify(inputDeviceClass)), // create copy of object
        };

        const editDialogRef = this.dialog.open(DeviceClassesEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newDeviceClass: DeviceTypeDeviceClassModel) => {
            if (newDeviceClass !== undefined) {
                this.deviceClassesService
                    .updateDeviceClasses(newDeviceClass)
                    .subscribe((deviceClass: DeviceTypeDeviceClassModel | null) => {
                        this.reloadAndShowSnackbar(deviceClass, 'update');
                    });
            }
        });
    }

    deleteDeviceClass(deviceClass: DeviceTypeDeviceClassModel): void {
        this.dialogsService
            .openDeleteDialog('device class ' + deviceClass.name)
            .afterClosed()
            .subscribe((deleteDeviceClass: boolean) => {
                if (deleteDeviceClass) {
                    this.ready = false;
                    this.deviceClassesService.deleteDeviceClasses(deviceClass.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.snackBar.open('Device class deleted successfully.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting the device class!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        this.reload();
                    });
                }
            });
    }

    newDeviceClass(): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            deviceClass: {
                id: '',
                image: '',
                name: '',
            } as DeviceTypeDeviceClassModel,
        };

        const editDialogRef = this.dialog.open(DeviceClassesEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newDeviceClass: DeviceTypeDeviceClassModel) => {
            if (newDeviceClass !== undefined) {
                this.deviceClassesService.createDeviceClass(newDeviceClass).subscribe((deviceClass: DeviceTypeDeviceClassModel | null) => {
                    this.reloadAndShowSnackbar(deviceClass, 'sav');
                });
            }
        });
    }

    private getDeviceClasses(): Observable<DeviceTypeDeviceClassModel[]> {
        return this.deviceClassesService
            .getDeviceClasses(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection)
            .pipe(
                map((deviceClasses) => {
                    this.totalCount = deviceClasses.total;
                    this.dataSource = new MatTableDataSource(deviceClasses.result);
                    this.updateDeviceClassInDeviceTypes(deviceClasses.result);
                    return deviceClasses.result;
                })
            );
    }

    reload() {
        this.offset = 0;
        this.ready = false;
        this.selectionClear();

        this.getDeviceClasses().subscribe(_ => {
            this.ready = true;
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.reload();
    }

    private reloadAndShowSnackbar(deviceClass: DeviceTypeDeviceClassModel | null, text: string) {
        if (deviceClass === null) {
            this.snackBar.open('Error while ' + text + 'ing the device class!', 'close', { panelClass: 'snack-bar-error' });
        } else {
            this.snackBar.open('Device class ' + text + 'ed successfully.', undefined, { duration: 2000 });
        }
        this.reload();
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
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' device classes' : ' device class'))
            .afterClosed()
            .subscribe((deleteDeviceClass: boolean) => {
                if (deleteDeviceClass) {
                    this.ready = false;
                    this.selection.selected.forEach((deviceClass: DeviceTypeDeviceClassModel) => {
                        deletionJobs.push(this.deviceClassesService.deleteDeviceClasses(deviceClass.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open('Device classes deleted successfully.', undefined, {duration: 2000});
                    } else {
                        this.snackBar.open('Error while deleting device classes!', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.reload();
                });
            });
    }

    private updateDeviceClassInDeviceTypes(list: DeviceTypeDeviceClassModel[]) {
        if (!this.userHasUsedInAuthorization) {
            return;
        }
        const query: UsedInDeviceTypeQuery = {
            resource: 'device-classes',
            ids: list.map(f => f.id)
        };
        this.deviceTypeService.getUsedInDeviceType(query).subscribe(result => {
            result?.forEach((value, key) => {
                this.usedIn.set(key, value);
            });
        });
    }

    public showUsedInDialog(usedIn: UsedInDeviceTypeResponseElement | undefined) {
        if (usedIn) {
            this.deviceTypeService.openUsedInDeviceTypeDialog(usedIn);
        }
    }
}
