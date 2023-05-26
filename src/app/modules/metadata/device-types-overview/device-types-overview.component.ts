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
import { forkJoin, Observable, Subscription } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { DeviceTypeService } from './shared/device-type.service';
import { DeviceTypePermSearchModel } from './shared/device-type-perm-search.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { Router } from '@angular/router';
import { DeviceInstancesRouterState, DeviceInstancesRouterStateTypesEnum } from '../../devices/device-instances/device-instances.component';
import { DeviceInstancesDialogService } from '../../devices/device-instances/shared/device-instances-dialog.service';
import { DeviceTypeDeviceClassModel } from './shared/device-type.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, Sort, SortDirection } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { UntypedFormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';

@Component({
    selector: 'senergy-device-types',
    templateUrl: './device-types-overview.component.html',
    styleUrls: ['./device-types-overview.component.css'],
})
export class DeviceTypesOverviewComponent implements OnInit, OnDestroy {
    pageSize = 20;
    deviceTypes: DeviceTypePermSearchModel[] = [];
    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    dataSource = new MatTableDataSource<DeviceTypePermSearchModel>();
    selection = new SelectionModel<DeviceTypePermSearchModel>(true, []);
    totalCount = 200
    offset = 0;
    searchControl = new UntypedFormControl('');
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    ready = false;
    private searchSub: Subscription = new Subscription();
    searchText: string = ""
    sortBy: string = "name"
    sortDirection: SortDirection = "asc"

    constructor(
        private searchbarService: SearchbarService,
        private deviceTypeService: DeviceTypeService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private router: Router,
        private deviceInstancesDialogService: DeviceInstancesDialogService,
    ) {}

    ngOnInit() {
        this.deviceTypeService.getTotalCountOfDevicesTypes().subscribe(totalCount => this.totalCount = totalCount)
        this.initSearch();
        this.loadDeviceClasses();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }
    
    matSortChange($event: Sort) {
        this.sortBy = $event.active 
        this.sortDirection = $event.direction;
        this.reload();
    }

    ngAfterViewInit(): void {
        this.dataSource.sortingDataAccessor = (row: any, sortHeaderId: string) => {
            var value = row[sortHeaderId];
            value = (typeof(value) === 'string') ? value.toLowerCase(): value;
            return value
        };
        
        this.paginator.page.subscribe(()=>{
            this.pageSize = this.paginator.pageSize
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getDeviceTypes()
        });
    }

    delete(deviceTypeInput: DeviceTypePermSearchModel) {
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

    newInstance(deviceType: DeviceTypePermSearchModel): void {
        this.deviceInstancesDialogService.openDeviceCreateDialog(deviceType);
    }

    showDevices(deviceType: DeviceTypePermSearchModel) {
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

    private getDeviceTypes() {
        this.ready = false;
        this.deviceTypeService
            .getDeviceTypes(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection)
            .subscribe((deviceTypes: DeviceTypePermSearchModel[]) => {
                this.dataSource.data = deviceTypes;
                this.ready = true;
            });
    }


    private reload() {
        this.offset = 0;
        this.ready = false;
        this.selectionClear();
        this.getDeviceTypes();
    }

    private loadDeviceClasses(): void {
        this.deviceTypeService.getDeviceClasses().subscribe((deviceClasses: DeviceTypeDeviceClassModel[]) => {
            this.deviceClasses = deviceClasses;
        });
    }

    public deleteMultipleItems(): void {
        const deletionJobs: Observable<any>[] = [];
        var text = this.selection.selected.length + (this.selection.selected.length > 1 ? ' device types' : ' device type')

        this.dialogsService
        .openDeleteDialog(text)
        .afterClosed()
        .subscribe((deletePipelines: boolean) => {
            if (deletePipelines) {
                this.ready = false;
                this.selection.selected.forEach((deviceType: DeviceTypePermSearchModel) => {
                    deletionJobs.push(this.deviceTypeService.deleteDeviceType(deviceType.id))    
                });
            }
            
            forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                if (ok) {
                    this.snackBar.open(text + ' deleted successfully.', undefined, {duration: 2000});            
                } else {
                    this.snackBar.open('Error while deleting ' + text + '!', 'close', {panelClass: 'snack-bar-error'});
                }
                this.reload()
            })
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
