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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SortModel } from '../../../core/components/sort/shared/sort.model';
import { debounceTime, forkJoin, Observable, Subscription, map } from 'rxjs';
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
import { MatSort, Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { UntypedFormControl } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';

@Component({
    selector: 'senergy-device-classes',
    templateUrl: './device-classes.component.html',
    styleUrls: ['./device-classes.component.css'],
})
export class DeviceClassesComponent implements OnInit, OnDestroy {
    displayedColumns = ['select', 'name']
    pageSize = 20;
    ready = false;
    dataSource = new MatTableDataSource<DeviceClassesPermSearchModel>();
    selection = new SelectionModel<DeviceClassesPermSearchModel>(true, []);
    totalCount = 200
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    userIsAdmin = false;
    searchText: string = ""
    offset = 0;
    private searchSub: Subscription = new Subscription();
    sortBy: string = "name"
    sortDirection: SortDirection = "asc"
    userHasUpdateAuthorization: boolean = false
    userHasDeleteAuthorization: boolean = false
    userHasCreateAuthorization: boolean = false 
    
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
        this.userIsAdmin = this.authService.userIsAdmin();
        this.initSearch();
        this.checkAuthorization();
    }

    getTotalCounts() {
        return this.deviceClassesService.getTotalCountOfDevicesClasses(this.searchText).pipe(
            map((totalCount: number) => {
                this.totalCount = totalCount
                return totalCount
            })
        )
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(()=>{
            this.pageSize = this.paginator.pageSize
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getDeviceClasses()
        });
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    checkAuthorization() {
        this.userHasUpdateAuthorization = this.deviceClassesService.userHasUpdateAuthorization()
        if( this.userHasUpdateAuthorization) {
             this.displayedColumns.push("edit")
        }
        
        this.userHasDeleteAuthorization = this.deviceClassesService.userHasDeleteAuthorization()
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push("delete")
        }
    
        this.userHasCreateAuthorization = this.deviceClassesService.userHasDeleteAuthorization()
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
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
                this.deviceClassesService
                    .updateDeviceClasses(newDeviceClass)
                    .subscribe((deviceClass: DeviceTypeDeviceClassModel | null) => {
                        this.reloadAndShowSnackbar(deviceClass, 'update');
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
                    this.ready = false;
                    this.deviceClassesService.deleteDeviceClasses(deviceClass.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.snackBar.open('Device class deleted successfully.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting the device class!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        this.reload()
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

    private getDeviceClasses(): Observable<DeviceClassesPermSearchModel[]> {
        return this.deviceClassesService
            .getDeviceClasses(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection)
            .pipe(
                map((deviceClasses: DeviceClassesPermSearchModel[]) => {
                    this.dataSource = new MatTableDataSource(deviceClasses);
                    return deviceClasses
                })
            )
    }

    reload() {
        this.offset = 0;
        this.pageSize = 20;
        this.ready = false;
        this.selectionClear();
        
        forkJoin([this.getDeviceClasses(), this.getTotalCounts()]).subscribe(_ => {this.ready = true;})       
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active 
        this.sortDirection = $event.direction;
        this.reload();
    }

    private reloadAndShowSnackbar(deviceClass: DeviceTypeDeviceClassModel | null, text: string) {
        if (deviceClass === null) {
            this.snackBar.open('Error while ' + text + 'ing the device class!', 'close', { panelClass: 'snack-bar-error' });
        } else {
            this.snackBar.open('Device class ' + text + 'ed successfully.', undefined, { duration: 2000 });
        }
        this.reload()
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
                    this.selection.selected.forEach((deviceClass: DeviceClassesPermSearchModel) => {
                        deletionJobs.push(this.deviceClassesService.deleteDeviceClasses(deviceClass.id))
                    })
                }
                
                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open('Device classes deleted successfully.', undefined, {duration: 2000});            
                    } else {
                        this.snackBar.open('Error while deleting device classes!', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.reload()
                })
            });
    }
}
