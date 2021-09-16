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

import { Component, OnDestroy, OnInit } from '@angular/core';

import { DeviceInstancesService } from './shared/device-instances.service';
import { DeviceInstancesIntermediateModel, DeviceInstancesModel } from './shared/device-instances.model';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { Subscription } from 'rxjs';
import { SortModel } from '../../../core/components/sort/shared/sort.model';
import { KeycloakService } from 'keycloak-angular';
import { TagValuePipe } from '../../../core/pipe/tag-value.pipe';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Navigation, Router } from '@angular/router';
import { NetworksModel } from '../networks/shared/networks.model';
import { DeviceTypePermSearchModel } from '../../metadata/device-types-overview/shared/device-type-perm-search.model';
import { LocationModel } from '../locations/shared/locations.model';
import { LocationsService } from '../locations/shared/locations.service';
import { NetworksService } from '../networks/shared/networks.service';
import { DeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { DeviceTypeBaseModel } from '../../metadata/device-types-overview/shared/device-type.model';

const tabs = [
    { label: 'Online', state: 'connected' },
    { label: 'Offline', state: 'disconnected' },
    {
        label: 'Unknown',
        state: 'unknown',
    },
];
const sortingAttributes = [new SortModel('Name', 'name', 'asc')];

export interface DeviceInstancesRouterState {
    type: DeviceInstancesRouterStateTypesEnum | undefined | null;
    tab: DeviceInstancesRouterStateTabEnum | undefined | null;
    value: any;
}

// eslint-disable-next-line no-shadow
export enum DeviceInstancesRouterStateTypesEnum {
    NETWORK,
    DEVICE_TYPE,
    LOCATION,
}

// eslint-disable-next-line no-shadow
export enum DeviceInstancesRouterStateTabEnum {
    ALL,
    ONLINE,
    OFFLINE,
    UNKNOWN,
}

@Component({
    selector: 'senergy-device-instances',
    templateUrl: './device-instances.component.html',
    styleUrls: ['./device-instances.component.css'],
})
export class DeviceInstancesComponent implements OnInit, OnDestroy {
    deviceInstances: DeviceInstancesModel[] = [];
    ready = false;
    sortAttributes = JSON.parse(JSON.stringify(sortingAttributes)); // create copy of object;
    userID: string;
    selectedTag = '';
    selectedTagTransformed = '';
    selectedTagType = '';
    routerNetwork: NetworksModel | null = null;
    routerDeviceType: DeviceTypeBaseModel | null = null;
    routerLocation: LocationModel | null = null;
    activeIndex = 0;
    animationDone = true;
    tabs: { label: string; state: string }[] = tabs;
    searchInitialized = false;
    searchText = '';

    locationOptions: LocationModel[] = [];
    networkOptions: NetworksModel[] = [];
    deviceTypeOptions: DeviceTypeBaseModel[] = [];

    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(
        private searchbarService: SearchbarService,
        private deviceInstancesService: DeviceInstancesService,
        private keycloakService: KeycloakService,
        private permissionsDialogService: PermissionsDialogService,
        private dialogsService: DialogsService,
        private locationsService: LocationsService,
        private networksService: NetworksService,
        private deviceTypesService: DeviceTypeService,
        public snackBar: MatSnackBar,
        private router: Router,
    ) {
        this.userID = this.keycloakService.getKeycloakInstance().subject || '';
        this.getRouterParams();
    }

    ngOnInit() {
        this.loadFilterOptions();
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
            this.setRepoItemsParams(this.limitInit);
            this.getDeviceInstances(false);
        }
    }

    tagRemoved(): void {
        this.routerNetwork = null;
        this.routerDeviceType = null;
        this.routerLocation = null;
        this.resetTag();
        this.getDeviceInstances(true);
    }

    getDevicesByTag(event: { tag: string; tagType: string }) {
        this.routerNetwork = null;
        this.routerDeviceType = null;
        this.routerLocation = null;
        this.searchText = '';
        if (event.tagType === 'tag') {
            this.selectedTagTransformed = new TagValuePipe().transform(event.tag, '');
        } else {
            this.selectedTagTransformed = event.tag;
        }

        this.selectedTagType = event.tagType;
        this.selectedTag = event.tag;
        this.getDeviceInstances(true);
    }

    reloadElement(event: boolean) {
        if (!this.allDataLoaded && this.ready && event) {
            this.setRepoItemsParams(1);
            setTimeout(() => {
                this.getDeviceInstances(false);
            }, 1000);
        }
    }

    updateTab() {
        this.animationDone = false;
        this.searchText = '';
        this.sortAttributes = JSON.parse(JSON.stringify(sortingAttributes)); // create copy of object;
        this.sortAttribute = this.sortAttributes[0];
        this.resetTag();
    }

    animation(): void {
        if (this.searchInitialized) {
            this.getDeviceInstances(true);
        }
    }

    private getRouterParams(): void {
        const navigation: Navigation | null = this.router.getCurrentNavigation();
        if (navigation !== null) {
            if (navigation.extras.state !== undefined) {
                const state = navigation.extras.state as DeviceInstancesRouterState;
                switch (state.type) {
                case DeviceInstancesRouterStateTypesEnum.DEVICE_TYPE:
                    this.routerDeviceType = state.value as DeviceTypeBaseModel;
                    break;
                case DeviceInstancesRouterStateTypesEnum.NETWORK:
                    this.routerNetwork = state.value as NetworksModel;
                    break;
                case DeviceInstancesRouterStateTypesEnum.LOCATION:
                    this.routerLocation = state.value as LocationModel;
                    break;
                }
                if (state.tab) {
                    this.activeIndex = state.tab;
                }
            }
        }
    }

    private getDeviceInstances(reset: boolean) {
        if (reset) {
            this.setRepoItemsParams(this.limitInit);
            this.reset();
        }

        if (this.routerLocation !== null) {
            this.selectedTag = this.routerLocation.id;
            this.selectedTagTransformed = this.routerLocation.name;
            this.selectedTagType = 'location';
        }

        if (this.routerNetwork !== null) {
            this.selectedTag = this.routerNetwork.name;
            this.selectedTagTransformed = this.routerNetwork.name;
            this.deviceInstancesService
                .getDeviceInstancesByHubId(
                    this.limit,
                    this.offset,
                    this.sortAttribute.value,
                    this.sortAttribute.order,
                    this.routerNetwork.id,
                    this.activeIndex === 0 ? null : (tabs[this.activeIndex - 1].state as 'connected' | 'disconnected' | 'unknown'),
                )
                .subscribe((deviceInstances: DeviceInstancesModel[]) => {
                    this.setDevices(deviceInstances);
                });
        } else if (this.routerDeviceType !== null) {
            this.selectedTag = this.routerDeviceType.name;
            this.selectedTagTransformed = this.routerDeviceType.name;
            this.deviceInstancesService
                .getDeviceInstancesByDeviceType(
                    this.routerDeviceType.id,
                    this.limit,
                    this.offset,
                    this.sortAttribute.value,
                    this.sortAttribute.order,
                    this.activeIndex === 0 ? null : (tabs[this.activeIndex - 1].state as 'connected' | 'disconnected' | 'unknown'),
                )
                .subscribe((deviceInstances) => {
                    this.setDevices(deviceInstances);
                });
        } else {
            if (this.selectedTag === '') {
                if (this.activeIndex === 0) {
                    this.deviceInstancesService
                        .getDeviceInstances(this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order)
                        .subscribe((deviceInstances: DeviceInstancesModel[]) => {
                            this.setDevices(deviceInstances);
                        });
                } else {
                    this.deviceInstancesService
                        .getDeviceInstancesByState(
                            this.searchText,
                            tabs[this.activeIndex - 1].state,
                            this.limit,
                            this.offset,
                            this.sortAttribute.value,
                            this.sortAttribute.order,
                        )
                        .subscribe((deviceInstances: DeviceInstancesModel[]) => {
                            this.setDevices(deviceInstances);
                        });
                }
            } else {
                if (this.activeIndex === 0) {
                    this.deviceInstancesService
                        .getDeviceInstancesByTag(
                            this.selectedTagType,
                            this.selectedTag,
                            this.sortAttribute.value,
                            this.sortAttribute.order,
                            this.limit,
                            this.offset,
                        )
                        .subscribe((deviceInstances: DeviceInstancesModel[]) => {
                            this.setDevices(deviceInstances);
                        });
                } else {
                    this.deviceInstancesService
                        .getDeviceInstancesByTagAndState(
                            this.selectedTagType,
                            this.selectedTag,
                            this.limit,
                            this.offset,
                            this.sortAttribute.value,
                            this.sortAttribute.order,
                            tabs[this.activeIndex - 1].state,
                        )
                        .subscribe((deviceInstances: DeviceInstancesModel[]) => {
                            this.setDevices(deviceInstances);
                        });
                }
            }
        }
    }

    private setDevices(deviceInstances: DeviceInstancesModel[]) {
        this.animationDone = true;
        if (deviceInstances.length !== this.limit) {
            this.allDataLoaded = true;
        }
        this.deviceInstances = this.deviceInstances.concat(deviceInstances);
        this.ready = true;
    }

    private initSearchAndGetDevices() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchInitialized = true;
            if (searchText) {
                this.routerNetwork = null;
                this.routerDeviceType = null;
                this.routerLocation = null;
            }
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

    private reset() {
        this.deviceInstances = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.deviceInstances.length;
    }

    private loadFilterOptions() {
        this.locationsService.listLocations(100, 0, 'name', 'asc').subscribe((value) => {
            this.locationOptions = value;
        });
        this.networksService.listNetworks(100, 0, 'name', 'asc').subscribe((value) => {
            this.networkOptions = value;
        });
        this.deviceInstancesService.listUsedDeviceTypeIds().subscribe((deviceTypeIds) => {
            this.deviceTypesService.getDeviceTypeListByIds(deviceTypeIds).subscribe((deviceTypes) => {
                this.deviceTypeOptions = deviceTypes;
            });
        });
    }

    filterByDeviceType(dt: DeviceTypeBaseModel) {
        this.resetTag();
        this.routerLocation = null;
        this.routerNetwork = null;
        this.routerDeviceType = null;

        this.routerDeviceType = dt;
        this.getDeviceInstances(true);
    }

    filterByLocation(location: LocationModel) {
        this.resetTag();
        this.routerLocation = null;
        this.routerNetwork = null;
        this.routerDeviceType = null;

        this.routerLocation = location;
        this.getDeviceInstances(true);
    }

    filterByNetwork(network: NetworksModel) {
        this.resetTag();
        this.routerLocation = null;
        this.routerNetwork = null;
        this.routerDeviceType = null;

        this.routerNetwork = network;
        this.getDeviceInstances(true);
    }
}
