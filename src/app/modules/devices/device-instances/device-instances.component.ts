/*
 * Copyright 2018 InfAI (CC SES)
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

import {DeviceInstancesService} from './shared/device-instances.service';
import {DeviceInstancesModel} from './shared/device-instances.model';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {Subscription} from 'rxjs';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {KeycloakService} from 'keycloak-angular';
import {TagValuePipe} from '../../../core/pipe/tag-value.pipe';

const grids = new Map([
    ['xs', 1],
    ['sm', 2],
    ['md', 2],
    ['lg', 3],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-device-instances',
    templateUrl: './device-instances.component.html',
    styleUrls: ['./device-instances.component.css']
})
export class DeviceInstancesComponent implements OnInit, OnDestroy {

    deviceInstances: DeviceInstancesModel[] = [];
    gridCols = 0;
    ready = false;
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'));
    userID: string;
    selectedTag = '';
    selectedTagTransformed = '';
    selectedTagType = '';

    private searchText = '';
    private limit = 54;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private searchbarService: SearchbarService,
                private responsiveService: ResponsiveService,
                private deviceinstancesService: DeviceInstancesService,
                private keycloakService: KeycloakService) {
        this.userID = this.keycloakService.getKeycloakInstance().subject || '';
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetDevices();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getDeviceInstances(true);
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getDeviceInstances(false);
        }
    }

    tagRemoved(): void {
        this.resetTag();
        this.getDeviceInstances(true);
    }

    getDevicesByTag(tag: string, tagType: string) {

        if (tagType === 'tag') {
            this.selectedTagTransformed = new TagValuePipe().transform(tag, '');
        } else {
            this.selectedTagTransformed = tag;
        }

        this.selectedTagType = tagType;
        this.selectedTag = tag;
        this.getDeviceInstances(true);
    }

    private getDeviceInstances(reset: boolean) {
        if (reset) {
            this.deviceInstances = [];
            this.offset = 0;
            this.allDataLoaded = false;
            this.ready = false;
        }
        if (this.selectedTag === '') {
            this.deviceinstancesService.getDeviceInstances(
                this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order).subscribe(
                (deviceInstances: DeviceInstancesModel[]) => {
                    if (deviceInstances.length !== this.limit) {
                        this.allDataLoaded = true;
                    }
                    this.deviceInstances = this.deviceInstances.concat(deviceInstances);
                    this.ready = true;
                });
        } else {
            this.deviceinstancesService.getDeviceInstancesByTag(this.selectedTagType, this.selectedTag, this.sortAttribute.value, this.sortAttribute.order).subscribe(
                (deviceInstances: DeviceInstancesModel[]) => {
                    this.allDataLoaded = true;
                    this.deviceInstances = this.deviceInstances.concat(deviceInstances);
                    this.ready = true;
                });
        }
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetDevices() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.resetTag();
            this.searchText = searchText;
            this.getDeviceInstances(true);
        });
    }

    private resetTag() {
        this.selectedTag = '';
        this.selectedTagTransformed = '';
        this.selectedTagType = '';
    }
}
