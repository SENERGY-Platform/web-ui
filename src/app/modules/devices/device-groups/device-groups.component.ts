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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {Subscription} from 'rxjs';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {DialogsService} from '../../../core/services/dialogs.service';
import uuid = util.uuid;
import {util} from 'jointjs';
import {DeviceGroupsPermSearchModel} from './shared/device-groups-perm-search.model';
import {DeviceGroupsService} from './shared/device-groups.service';
import {DeviceGroupModel} from './shared/device-groups.model';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-device-groups',
    templateUrl: './device-groups.component.html',
    styleUrls: ['./device-groups.component.css']
})
export class DeviceGroupsComponent implements OnInit, OnDestroy {
    readonly limitInit = 54;

    deviceGroups: DeviceGroupsPermSearchModel[] = [];
    gridCols = 0;
    ready = false;
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'));

    private searchText = '';
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private dialog: MatDialog,
                private responsiveService: ResponsiveService,
                private deviceGroupsService: DeviceGroupsService,
                private searchbarService: SearchbarService,
                private snackBar: MatSnackBar,
                private router: Router,
                private dialogsService: DialogsService
    ) {
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetdeviceGroups();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getDeviceGroups(true);
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getDeviceGroups(false);
        }
    }

    editDeviceGroup(inputDeviceGroup: DeviceGroupsPermSearchModel): void {
        console.log('TODO: edit', JSON.stringify(inputDeviceGroup));
    }

    deleteDeviceGroup(deviceGroup: DeviceGroupsPermSearchModel): void {
        console.log('TODO: edit', JSON.stringify(deviceGroup));
    }

    newDeviceGroup(): void {
        console.log('TODO: create');
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetdeviceGroups() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getDeviceGroups(true);
        });
    }

    private getDeviceGroups(reset: boolean) {
        if (reset) {
            this.reset();
        }

        this.deviceGroupsService.getDeviceGroups(this.searchText, this.limit, this.offset, this.sortAttribute.value,
            this.sortAttribute.order).subscribe(
            (deviceGroups: DeviceGroupsPermSearchModel[]) => {
                if (deviceGroups.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.deviceGroups = this.deviceGroups.concat(deviceGroups);
                this.ready = true;
            });

    }

    private reset() {
        this.deviceGroups = [];
        this.limit = this.limitInit;
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }

    private reloadDeviceGroups(reset: boolean) {
        setTimeout(() => {
            this.getDeviceGroups(reset);
        }, 2500);
    }

    private setLimitOffset(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.deviceGroups.length;
    }

    private reloadAndShowSnackbar(deviceGroup: DeviceGroupModel | null, text: string) {
        if (deviceGroup === null) {
            this.snackBar.open('Error while ' + text + 'ing the device class!', undefined, {duration: 2000});
            this.getDeviceGroups(true);
        } else {
            this.snackBar.open('Device class ' + text + 'ed successfully.', undefined, {duration: 2000});
            this.reloadDeviceGroups(true);
        }
    }

}
