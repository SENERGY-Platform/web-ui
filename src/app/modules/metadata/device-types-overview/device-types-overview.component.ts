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

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable, map } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { DeviceTypeService } from './shared/device-type.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { Router } from '@angular/router';
import { DeviceInstancesDialogService } from '../../devices/device-instances/shared/device-instances-dialog.service';
import { DeviceTypeDeviceClassModel, DeviceTypeModel } from './shared/device-type.model';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Sort, SortDirection, MatSort, MatSortHeader } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { NgClass } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-device-types',
    templateUrl: './device-types-overview.component.html',
    styleUrls: ['./device-types-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, SpinnerComponent, NgClass, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatIconButton, MatIcon, MatTooltip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, MatFabButton]
})
export class DeviceTypesOverviewComponent implements OnInit, AfterViewInit {
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private deviceTypeService = inject(DeviceTypeService);
    private snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private router = inject(Router);
    private deviceInstancesDialogService = inject(DeviceInstancesDialogService);
    private preferencesSerivce = inject(PreferencesService);

    displayedColumns = ['select', 'name', 'info', 'copy', 'new', 'show'];
    pageSize = this.preferencesSerivce.pageSize;
    deviceTypes: DeviceTypeModel[] = [];
    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    dataSource = new MatTableDataSource<DeviceTypeModel>();
    selection = new SelectionModel<DeviceTypeModel>(true, []);
    totalCount = 200;
    offset = 0;
    searchControl = new FormControl<string | null>('');
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    ready = false;
    searchText = '';
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;

    ngOnInit() {
        this.initSearch();
        this.loadDeviceClasses();
        this.checkAuthorization();
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
        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e)=>{
            this.preferencesSerivce.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getDeviceTypes().subscribe();
        });
    }

    delete(deviceTypeInput: DeviceTypeModel) {
        this.dialogsService
            .openDeleteDialog('device type: ' + deviceTypeInput.name)
            .afterClosed()
            .subscribe((deviceTypeDelete: boolean | undefined) => {
                if (deviceTypeDelete) {
                    this.ready = false;
                    this.deviceTypeService.deleteDeviceType(encodeURIComponent(deviceTypeInput.id)).subscribe((deleted: boolean) => {
                        if (deleted) {
                            const index = this.deviceTypes.indexOf(deviceTypeInput);
                            this.deviceTypes.splice(index, 1);
                            snackSuccess(this.snackBar, 'Device type deleted successfully.');
                        } else {
                            snackError(this.snackBar, 'Error while deleting device type!');
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
            queryParams: {
                'device-type-id': deviceType.id,
                'device-type-name': deviceType.name,
            },
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
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    private getDeviceTypes(): Observable<DeviceTypeModel[]> {
        return this.deviceTypeService
            .getDeviceTypes(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection)
            .pipe(
                map(deviceTypes => {
                    this.totalCount = deviceTypes.total;
                    this.dataSource.data = deviceTypes.result;
                    return deviceTypes.result;
                })
            );
    }


    private reload() {
        this.offset = 0;
        this.ready = false;
        this.selectionClear();

        this.getDeviceTypes().subscribe(_ => {
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
            .subscribe((deletePipelines: boolean | undefined) => {
                if (deletePipelines) {
                    this.ready = false;
                    this.selection.selected.forEach((deviceType: DeviceTypeModel) => {
                        deletionJobs.push(this.deviceTypeService.deleteDeviceType(deviceType.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.every((r: boolean) => r === true);
                    if (ok) {
                        snackSuccess(this.snackBar, text + ' deleted successfully.');
                    } else {
                        snackError(this.snackBar, 'Error while deleting ' + text + '!');
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
