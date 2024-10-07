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
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { DeviceTypeService } from './shared/device-type.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { Router } from '@angular/router';
import { DeviceInstancesRouterState, DeviceInstancesRouterStateTypesEnum } from '../../devices/device-instances/device-instances.component';
import { DeviceInstancesDialogService } from '../../devices/device-instances/shared/device-instances-dialog.service';
import { DeviceTypeDeviceClassModel, DeviceTypeModel } from './shared/device-type.model';
import { MatTableDataSource } from '@angular/material/table';
import { Sort, SortDirection } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { UntypedFormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';

@Component({
    selector: 'senergy-device-types',
    templateUrl: './device-types-overview.component.html',
    styleUrls: ['./device-types-overview.component.css'],
})
export class DeviceTypesOverviewComponent implements OnInit, OnDestroy, AfterViewInit {
    displayedColumns = ['select', 'name', 'info', 'copy', 'new', 'show'];
    pageSize = 20;
    deviceTypes: DeviceTypeModel[] = [];
    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    dataSource = new MatTableDataSource<DeviceTypeModel>();
    selection = new SelectionModel<DeviceTypeModel>(true, []);
    totalCount = 200;
    offset = 0;
    searchControl = new UntypedFormControl('');
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    ready = false;
    private searchSub: Subscription = new Subscription();
    searchText = '';
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;

    constructor(
        private searchbarService: SearchbarService,
        private deviceTypeService: DeviceTypeService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private router: Router,
        private deviceInstancesDialogService: DeviceInstancesDialogService,
    ) {}

    ngOnInit() {
        this.initSearch();
        this.loadDeviceClasses();
        this.checkAuthorization();
    }

    getTotalCounts() {
        return this.deviceTypeService.getTotalCountOfDevicesTypes(this.searchText).pipe(
            map((totalCount: number) => {
                this.totalCount = totalCount;
                return totalCount;
            })
        );
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.reload();
    }

    checkAuthorization() {
        this.userHasUpdateAuthorization = this.deviceTypeService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }
        this.userHasDeleteAuthorization = this.deviceTypeService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
        this.userHasCreateAuthorization = this.deviceTypeService.userHasCreateAuthorization();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(()=>{
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getDeviceTypes().subscribe();
        });
    }

    delete(deviceTypeInput: DeviceTypeModel) {
        this.dialogsService
            .openDeleteDialog('device type: ' + deviceTypeInput.name)
            .afterClosed()
            .subscribe((deviceTypeDelete: boolean) => {
                if (deviceTypeDelete) {
                    this.ready = false;
                    this.deviceTypeService.deleteDeviceType(encodeURIComponent(deviceTypeInput.id)).subscribe((deleted: boolean) => {
                        if (deleted) {
                            const index = this.deviceTypes.indexOf(deviceTypeInput);
                            this.deviceTypes.splice(index, 1);
                            this.snackBar.open('Device type deleted successfully.', '', { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting device type!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        this.reload();
                    });
                }
            });
    }

    copyDeviceType(deviceTypeId: string): void {
        this.router.navigate(['metadata/devicetypesoverview/devicetypes/' + deviceTypeId], {
            queryParams: { function: 'copy' },
        });
    }

    editDeviceType(deviceTypeId: string): void {
        this.router.navigate(['metadata/devicetypesoverview/devicetypes/' + deviceTypeId], {
            queryParams: { function: 'edit' },
        });
    }

    detailsDeviceType(deviceTypeId: string): void {
        this.router.navigate(['metadata/devicetypesoverview/devicetypes/' + deviceTypeId], {
            queryParams: { function: 'details' },
        });
    }

    createDeviceType(): void {
        this.router.navigate(['metadata/devicetypesoverview/devicetypes'], {
            queryParams: { function: 'create' },
        });
    }

    newInstance(deviceType: DeviceTypeModel): void {
        this.deviceInstancesDialogService.openDeviceCreateDialog(deviceType);
    }

    showDevices(deviceType: DeviceTypeModel) {
        this.router.navigate(['devices/deviceinstances'], {
            state: { type: DeviceInstancesRouterStateTypesEnum.DEVICE_TYPE, value: deviceType } as DeviceInstancesRouterState,
        });
    }

    getImage(deviceClassId: string): string {
        let image = '';
        this.deviceClasses.forEach((deviceClass: DeviceTypeDeviceClassModel) => {
            if (deviceClass.id === deviceClassId) {
                image = deviceClass.image;
            }
        });
        return image;
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    private getDeviceTypes(): Observable<DeviceTypeModel[]> {
        return this.deviceTypeService
            .getDeviceTypes(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection)
            .pipe(
                map((deviceTypes: DeviceTypeModel[]) => {
                    this.dataSource.data = deviceTypes;
                    return deviceTypes;
                })
            );
    }


    private reload() {
        this.offset = 0;
        this.ready = false;
        this.selectionClear();

        forkJoin([this.getDeviceTypes(), this.getTotalCounts()]).subscribe(_ => {
            this.ready = true;
        });
    }

    private loadDeviceClasses(): void {
        this.deviceTypeService.getDeviceClasses().subscribe((deviceClasses: DeviceTypeDeviceClassModel[]) => {
            this.deviceClasses = deviceClasses;
        });
    }

    public deleteMultipleItems(): void {
        const deletionJobs: Observable<any>[] = [];
        const text = this.selection.selected.length + (this.selection.selected.length > 1 ? ' device types' : ' device type');

        this.dialogsService
            .openDeleteDialog(text)
            .afterClosed()
            .subscribe((deletePipelines: boolean) => {
                if (deletePipelines) {
                    this.ready = false;
                    this.selection.selected.forEach((deviceType: DeviceTypeModel) => {
                        deletionJobs.push(this.deviceTypeService.deleteDeviceType(deviceType.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open(text + ' deleted successfully.', undefined, {duration: 2000});
                    } else {
                        this.snackBar.open('Error while deleting ' + text + '!', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.reload();
                });
            });
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
}
