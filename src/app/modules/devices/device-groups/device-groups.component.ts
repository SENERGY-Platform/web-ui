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

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable, map, concatMap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DeviceGroupsService } from './shared/device-groups.service';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Sort, SortDirection, MatSort, MatSortHeader } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { DeviceGroupModel } from './shared/device-groups.model';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsV2RightsAndIdModel } from '../../permissions/shared/permissions-resource.model';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { NgClass } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';


@Component({
    selector: 'senergy-device-groups',
    templateUrl: './device-groups.component.html',
    styleUrls: ['./device-groups.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, MatIconButton, MatTooltip, MatIcon, SpinnerComponent, NgClass, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, MatFabButton]
})
export class DeviceGroupsComponent implements OnInit, AfterViewInit {
    private deviceGroupsService = inject(DeviceGroupsService);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private dialogsService = inject(DialogsService);
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private permissionsDialogService = inject(PermissionsDialogService);
    private permissionsService = inject(PermissionsService);
    private preferencesService = inject(PreferencesService);

    displayedColumns = ['select', 'name', 'show'];
    pageSize = this.preferencesService.pageSize;
    selection = new SelectionModel<DeviceGroupModel>(true, []);
    totalCount = 200;
    instances = [];
    dataSource = new MatTableDataSource<DeviceGroupModel>();
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    ready = false;
    offset = 0;
    searchText = '';
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    permissionsPerInstance: PermissionsV2RightsAndIdModel[] = [];


    hideGenerated = true;
    allDataLoaded = false;

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e)=>{
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getDeviceGroups().subscribe();
        });
    }

    checkAuthorization() {
        this.userHasCreateAuthorization = this.deviceGroupsService.userHasCreateAuthorization();
        this.userHasUpdateAuthorization = this.deviceGroupsService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.deviceGroupsService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
        this.displayedColumns.push('share');
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.reload();
    }

    private initSearch() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
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

    deleteDeviceGroup(deviceGroup: DeviceGroupModel): boolean {
        this.dialogsService
            .openDeleteDialog('device group ' + deviceGroup.name)
            .afterClosed()
            .subscribe((deleteDeviceClass: boolean | undefined) => {
                if (deleteDeviceClass) {
                    this.deviceGroupsService.deleteDeviceGroup(deviceGroup.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            snackSuccess(this.snackBar, 'Device-Group deleted successfully.');
                        } else {
                            snackError(this.snackBar, 'Error while deleting the device-group!');
                        }
                        this.reload();
                    });
                }
            });
        return false;
    }

    newDeviceGroup(): boolean {
        this.router.navigate(['devices/devicegroups/edit']);
        return false;
    }

    editDeviceGroup(inputDeviceGroup: DeviceGroupModel): boolean {
        this.router.navigate(['devices/devicegroups/edit/' + inputDeviceGroup.id]);
        return false;
    }

    setHideGenerated(hide: boolean){
        this.hideGenerated = hide;
        this.getDeviceGroups().subscribe();
    }

    private getDeviceGroups(): Observable<DeviceGroupModel[]> {
        let query: Observable<{result: DeviceGroupModel[]; total: number}>  =  this.deviceGroupsService.getDeviceGroups(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection);
        if(this.hideGenerated) {
            query = this.deviceGroupsService.getDeviceGroupsWithoutGenerated(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection);
        }

        return query.pipe(
            concatMap(a => this.permissionsService.getComputedResourcePermissionsV2('device-groups', a.result.map(i => i.id)).pipe(
                map(permissions => this.permissionsPerInstance = permissions),
                map(_ => a)
            )),
            map(res => {
                this.dataSource.data = res.result;
                this.totalCount = res.total;
                return res.result;
            }),
        );
    }

    public reload() {
        this.offset = 0;
        this.ready = false;
        this.selectionClear();

        this.getDeviceGroups().subscribe(_ => {
            this.ready = true;
        });
    }

    deleteMultipleItems() {
        const deletionJobs: Observable<any>[] = [];

        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' device groups' : ' device group'))
            .afterClosed()
            .subscribe((deleteConcepts: boolean | undefined) => {
                if (deleteConcepts) {
                    this.ready = false;
                    this.selection.selected.forEach((deviceGroup: DeviceGroupModel) => {
                        deletionJobs.push(this.deviceGroupsService.deleteDeviceGroup(deviceGroup.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.every((r: boolean) => r === true);
                    if (ok) {
                        snackSuccess(this.snackBar, deletionJobs.length > 1 ? 'Device groups deleted successfully.' : 'Device group deleted successfully.');
                    } else {
                        snackError(this.snackBar, 'Error while deleting the device group!');
                    }
                    this.reload();
                });
            });
    }

    showDevices(group: DeviceGroupModel) {
        this.deviceGroupsService.getDeviceGroup(group.id).subscribe((deviceGroup: DeviceGroupModel | null) => {
            if(!deviceGroup?.device_ids || deviceGroup.device_ids.length == 0) {
                snackError(this.snackBar, 'Device group has no devices');
                return;
            }

            this.router.navigate(['devices/deviceinstances'], {
                queryParams: {
                    'device-id': deviceGroup?.device_ids,
                },
            });
        });
    }

    shareDeviceGroup(group: DeviceGroupModel) {
        this.permissionsDialogService.openPermissionV2Dialog('device-groups', group.id, group.name);
    }

    userHasEditPermission(groupId: string) {
        return this.permissionsPerInstance.find(e => e.id === groupId)?.write || false;
    }


    userHasAdministratePermission(groupId: string) {
        return this.permissionsPerInstance.find(e => e.id === groupId)?.administrate || false;
    }

}
