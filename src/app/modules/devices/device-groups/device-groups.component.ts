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

import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {forkJoin, Observable, Subscription, map} from 'rxjs';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {DialogsService} from '../../../core/services/dialogs.service';
import {DeviceGroupsPermSearchModel} from './shared/device-groups-perm-search.model';
import {DeviceGroupsService} from './shared/device-groups.service';
import {MatTableDataSource} from '@angular/material/table';
import {MatSort, Sort, SortDirection} from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { DeviceInstancesRouterState, DeviceInstancesRouterStateTypesEnum } from '../device-instances/device-instances.component';
import { DeviceGroupModel } from './shared/device-groups.model';


@Component({
    selector: 'senergy-device-groups',
    templateUrl: './device-groups.component.html',
    styleUrls: ['./device-groups.component.css'],
})
export class DeviceGroupsComponent implements OnInit, OnDestroy, AfterViewInit {
    displayedColumns = ['select', 'name', 'show']
    pageSize = 20;
    selection = new SelectionModel<DeviceGroupsPermSearchModel>(true, []);
    totalCount = 200;
    instances = [];
    dataSource = new MatTableDataSource<DeviceGroupsPermSearchModel>();
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    ready = false;
    offset = 0;
    searchText: string = ""
    sortBy: string = "name"
    sortDirection: SortDirection = "asc"   
    userHasUpdateAuthorization: boolean = false
    userHasDeleteAuthorization: boolean = false
    userHasCreateAuthorization: boolean = false

    private searchSub: Subscription = new Subscription();

    hideGenerated = true;
    allDataLoaded: boolean = false

    constructor(
        private deviceGroupsService: DeviceGroupsService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
        private searchbarService: SearchbarService
    ) {}

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization()
    }

    getTotalCount(): Observable<number> {
        return this.deviceGroupsService.getTotalCountOfDeviceGroups(this.searchText).pipe(
            map(totalCount => this.totalCount = totalCount)
        )
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(()=>{
            this.pageSize = this.paginator.pageSize
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getDeviceGroups()
        });
    }

    checkAuthorization() {
        this.userHasCreateAuthorization = this.deviceGroupsService.userHasCreateAuthorization()
        this.userHasUpdateAuthorization = this.deviceGroupsService.userHasUpdateAuthorization()
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push("edit")
        }

        this.userHasDeleteAuthorization = this.deviceGroupsService.userHasDeleteAuthorization()
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push("delete")
        }
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active 
        this.sortDirection = $event.direction;
        this.reload();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload()
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

    deleteDeviceGroup(deviceGroup: DeviceGroupsPermSearchModel): boolean {
        this.dialogsService
            .openDeleteDialog('device group ' + deviceGroup.name)
            .afterClosed()
            .subscribe((deleteDeviceClass: boolean) => {
                if (deleteDeviceClass) {
                    this.deviceGroupsService.deleteDeviceGroup(deviceGroup.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.snackBar.open('Device-Group deleted successfully.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting the device-group!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        this.reload()
                    });
                }
            });
        return false;
    }

    newDeviceGroup(): boolean {
        this.router.navigate(['devices/devicegroups/edit']);
        return false;
    }

    editDeviceGroup(inputDeviceGroup: DeviceGroupsPermSearchModel): boolean {
        this.router.navigate(['devices/devicegroups/edit/' + inputDeviceGroup.id]);
        return false;
    }

    setHideGenerated(hide: boolean){
        this.hideGenerated = hide;
        this.getDeviceGroups();
    }

    private getDeviceGroups(): Observable<DeviceGroupsPermSearchModel[]> {
        let query =  this.deviceGroupsService.getDeviceGroups(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection);
        if(this.hideGenerated) {
            query = this.deviceGroupsService.getDeviceGroupsWithoutGenerated(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection);
        }

        return query.pipe(
            map((deviceGroups: DeviceGroupsPermSearchModel[]) => {
                this.dataSource.data = deviceGroups;
                return deviceGroups
                }
            )
        )
    }

    public reload() {
        this.offset = 0;
        this.pageSize = 20;
        this.ready = false;
        this.selectionClear();

        var jobs = [this.getDeviceGroups(), this.getTotalCount()]
        forkJoin(jobs).subscribe(_ => {
            this.ready = true;
        })
    }

    deleteMultipleItems() {
        const deletionJobs: Observable<any>[] = [];

        this.dialogsService
        .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' device groups' : ' device group'))
        .afterClosed()
        .subscribe((deleteConcepts: boolean) => {
            if (deleteConcepts) {
                this.ready = false;
                this.selection.selected.forEach((deviceGroup: DeviceGroupsPermSearchModel) => {
                    deletionJobs.push(this.deviceGroupsService.deleteDeviceGroup(deviceGroup.id));
                });
            }
        
            forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                if (ok) {
                    this.snackBar.open('Device group deleted successfully.', undefined, {duration: 2000});            
                } else {
                    this.snackBar.open('Error while deleting the device group!', 'close', {panelClass: 'snack-bar-error'});
                }
                this.reload()
            })
        });
    }

    showDevices(group: DeviceGroupsPermSearchModel) {
        this.deviceGroupsService.getDeviceGroup(group.id).subscribe((deviceGroup: DeviceGroupModel | null) => {
            if(!deviceGroup?.device_ids || deviceGroup.device_ids.length == 0) {
                this.snackBar.open('Device group has no devices', 'close', {panelClass: 'snack-bar-error'});
                return
            }

            this.router.navigate(['devices/deviceinstances'], {
                state: { 
                    type: DeviceInstancesRouterStateTypesEnum.DEVICE_GROUP, 
                    value: deviceGroup?.device_ids 
                } as DeviceInstancesRouterState,
            });
        })
    }
}
