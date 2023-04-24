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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SortModel } from '../../../core/components/sort/shared/sort.model';
import { Subscription } from 'rxjs';
import { MatLegacyDialog as MatDialog, MatLegacyDialogConfig as MatDialogConfig } from '@angular/material/legacy-dialog';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import uuid = util.uuid;
import { util } from 'jointjs';
import { DeviceGroupsPermSearchModel } from './shared/device-groups-perm-search.model';
import { DeviceGroupsService } from './shared/device-groups.service';
import { DeviceGroupModel } from './shared/device-groups.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';


@Component({
    selector: 'senergy-device-groups',
    templateUrl: './device-groups.component.html',
    styleUrls: ['./device-groups.component.css'],
})
export class DeviceGroupsComponent implements OnInit, OnDestroy {
    readonly limitInit = 54;

    deviceGroups: DeviceGroupsPermSearchModel[] = [];
    instances = []
    dataSource = new MatTableDataSource(this.deviceGroups)
    @ViewChild(MatSort) sort!: MatSort

    searchControl = new FormControl('');

    ready = false;

    private limit = this.limitInit;
    private offset = 0;
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    hideGenerated = true;

    constructor(
        private deviceGroupsService: DeviceGroupsService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
    ) {}

    ngOnInit() {
        this.getDeviceGroups();
        this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.reload());
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getDeviceGroups();
        }
    }

    deleteDeviceGroup(deviceGroup: DeviceGroupsPermSearchModel): boolean {
        this.dialogsService
            .openDeleteDialog('device group ' + deviceGroup.name)
            .afterClosed()
            .subscribe((deleteDeviceClass: boolean) => {
                if (deleteDeviceClass) {
                    this.deviceGroupsService.deleteDeviceGroup(deviceGroup.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.deviceGroups.splice(this.deviceGroups.indexOf(deviceGroup), 1);
                            this.snackBar.open('Device-Group deleted successfully.', undefined, { duration: 2000 });
                            this.setLimitOffset(1);
                            this.reloadDeviceGroups();
                        } else {
                            this.snackBar.open('Error while deleting the device-group!', "close", { panelClass: "snack-bar-error" });
                        }
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

    private getDeviceGroups() {
        let query =  this.deviceGroupsService.getDeviceGroups(this.searchControl.value, this.limit, this.offset, "name", "asc")
        if(this.hideGenerated) {
            query = this.deviceGroupsService.getDeviceGroupsWithoutGenerated(this.searchControl.value, this.limit, this.offset, "name", "asc")
        }

        query.subscribe((deviceGroups: DeviceGroupsPermSearchModel[]) => {
                if (deviceGroups.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.deviceGroups = this.deviceGroups.concat(deviceGroups);
                this.dataSource = new MatTableDataSource(this.deviceGroups)
                this.dataSource.sort = this.sort
                this.ready = true;
            });
    }

    public reload() {
        this.deviceGroups = [];
        this.limit = this.limitInit;
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
        this.getDeviceGroups();
    }

    private reloadDeviceGroups() {
        setTimeout(() => {
            this.reload()
        }, 2500);
    }

    public resetSearch() {
        this.searchControl.setValue('');
    }

    private setLimitOffset(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.deviceGroups.length;
    }
}
