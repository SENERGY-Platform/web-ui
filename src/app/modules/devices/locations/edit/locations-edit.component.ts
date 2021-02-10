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

import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {LocationsService} from '../shared/locations.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {LocationModel} from '../shared/locations.model';
import {DeviceInstancesBaseModel} from '../../device-instances/shared/device-instances.model';
import {debounceTime, delay} from 'rxjs/operators';
import {DeviceInstancesService} from '../../device-instances/shared/device-instances.service';
import {DeviceGroupModel} from '../../device-groups/shared/device-groups.model';
import {DeviceGroupsService} from '../../device-groups/shared/device-groups.service';
import {DeviceInstancesDialogService} from '../../device-instances/shared/device-instances-dialog.service';
import {DeviceGroupsDialogService} from '../../device-groups/shared/device-groups-dialog.service';

@Component({
    selector: 'senergy-locations-edit',
    templateUrl: './locations-edit.component.html',
    styleUrls: ['./locations-edit.component.css']
})
export class LocationsEditComponent implements OnInit {

    id = '';
    locationForm!: FormGroup;    // LocationModel

    devicesForm: FormControl = new FormControl([]);       // []DeviceInstancesBaseModel
    deviceGroupsForm: FormControl = new FormControl([]);

    deviceCache: Map<string, DeviceInstancesBaseModel> = new Map<string, DeviceInstancesBaseModel>();
    deviceGroupCache: Map<string, DeviceGroupModel> = new Map<string, DeviceGroupModel>();

    debounceTimeInMs = 500;
    rerouteAfterSaveDelayInMs = 2000;

    constructor(private _formBuilder: FormBuilder,
                private locationService: LocationsService,
                private deviceService: DeviceInstancesService,
                private deviceDialogService: DeviceInstancesDialogService,
                private deviceGroupService: DeviceGroupsService,
                private deviceGroupDialogService: DeviceGroupsDialogService,
                private snackBar: MatSnackBar,
                private route: ActivatedRoute,
                private router: Router) {
        this.getRouterParams();
    }

    ngOnInit() {
        this.loadData();
    }

    private getRouterParams(): void {
        this.id = this.route.snapshot.paramMap.get('id') || '';
    }

    addDevice(id: string) {
        const devicesFc = this.locationForm.get('device_ids');
        if (devicesFc) {
            let idList = devicesFc.value;
            idList.push(id);

            // filter duplicates
            idList = idList.filter((item: string, index: number) => {
                return idList.indexOf(item) === index;
            });

            devicesFc.setValue(idList);
        } else {
            throw new Error('unexpected locationForm structure');
        }
    }

    addDevices(ids: string[]) {
        const devicesFc = this.locationForm.get('device_ids');
        if (devicesFc) {
            let idList = devicesFc.value;
            idList.push(...ids);

            // filter duplicates
            idList = idList.filter((item: string, index: number) => {
                return idList.indexOf(item) === index;
            });

            devicesFc.setValue(idList);
        } else {
            throw new Error('unexpected locationForm structure');
        }
    }

    removeDevice(id: string) {
        const devicesFc = this.locationForm.get('device_ids');
        if (devicesFc) {
            const arr = devicesFc.value;
            const index = arr.indexOf(id);
            if (index >= 0) {
                arr.splice(index, 1);
                devicesFc.setValue(arr);
            } else {
                throw new Error('device not found in device_ids');
            }
        } else {
            throw new Error('unexpected locationForm structure');
        }
    }

    addDeviceGroup(id: string) {
        const deviceGroupsFc = this.locationForm.get('device_group_ids');
        if (deviceGroupsFc) {
            let idList = deviceGroupsFc.value;
            idList.push(id);

            // filter duplicates
            idList = idList.filter((item: string, index: number) => {
                return idList.indexOf(item) === index;
            });

            deviceGroupsFc.setValue(idList);
        } else {
            throw new Error('unexpected locationForm structure');
        }
    }

    addDeviceGroups(ids: string[]) {
        const deviceGroupsFc = this.locationForm.get('device_group_ids');
        if (deviceGroupsFc) {
            let idList = deviceGroupsFc.value;
            idList.push(...ids);

            // filter duplicates
            idList = idList.filter((item: string, index: number) => {
                return idList.indexOf(item) === index;
            });

            deviceGroupsFc.setValue(idList);
        } else {
            throw new Error('unexpected locationForm structure');
        }
    }

    removeDeviceGroup(id: string) {
        const deviceGroupsFc = this.locationForm.get('device_group_ids');
        if (deviceGroupsFc) {
            const arr = deviceGroupsFc.value;
            const index = arr.indexOf(id);
            if (index >= 0) {
                arr.splice(index, 1);
                deviceGroupsFc.setValue(arr);
            } else {
                throw new Error('device not found in device_ids');
            }
        } else {
            throw new Error('unexpected locationForm structure');
        }
    }

    close(): void {
    }

    save(): void {
        this.saveLocation(this.getLocationFromForm());
    }

    private initLocationFormGroup(location: LocationModel) {
        this.locationForm = this.createLocationFormGroup(location);
        const that = this;

        // watch devices changes
        const devicesFc = this.locationForm.get('device_ids');
        if (devicesFc) {
            devicesFc.valueChanges.subscribe(value => { that.updateDevicesForm(value); });
            this.updateDevicesForm(location.device_ids);
        } else {
            throw new Error('missing device_ids in locationForm');
        }

        // watch device groups changes
        const devicesGroupsFc = this.locationForm.get('device_group_ids');
        if (devicesGroupsFc) {
            devicesGroupsFc.valueChanges.subscribe(value => { that.updateDeviceGroupsForm(value); });
            this.updateDeviceGroupsForm(location.device_group_ids);
        } else {
            throw new Error('missing device_ids in locationForm');
        }
    }

    private createLocationFormGroup(location: LocationModel): FormGroup {
        return this._formBuilder.group({
            id: [{value: location.id, disabled: true}],
            name: [location.name, Validators.required],
            description: [location.description],
            image: [location.image],
            device_ids: [location.device_ids && location.device_ids.length > 0 ? location.device_ids : []],
            device_group_ids: [location.device_group_ids && location.device_group_ids.length > 0 ? location.device_group_ids : []]
        });
    }


    private saveLocation(location: LocationModel) {
        if (location.id === '' || location.id === undefined) {
            this.locationService.createLocation(location).pipe(delay(this.rerouteAfterSaveDelayInMs)).subscribe((locationSaved: LocationModel | null) => {
                this.showMessage(locationSaved);
                this.reload(locationSaved);
            });
        } else {
            this.locationService.updateLocation(location).pipe(delay(this.rerouteAfterSaveDelayInMs)).subscribe((locationSaved: LocationModel | null) => {
                this.showMessage(locationSaved);
                this.reload(locationSaved);
            });
        }
    }

    private reload(location: LocationModel | null) {
        if (location) {
            this.router.routeReuseStrategy.shouldReuseRoute = function () {
                return false;
            };
            this.router.onSameUrlNavigation = 'reload';
            this.router.navigate(['devices/locations/edit/' + location.id], {});
        }
    }

    private showMessage(locationSaved: LocationModel | null) {
        if (locationSaved) {
            this.snackBar.open('Location saved successfully.', undefined, {duration: 2000});
        } else {
            this.snackBar.open('Error while saving the device group!', undefined, {duration: 2000});
        }
    }

    private loadData(): void {
        if (this.id !== '') {
            this.locationService.getLocation(this.id).subscribe((location: LocationModel | null) => {
                if (location !== null) {
                    this.initLocationFormGroup(location);
                }
            });
        } else {
            this.initLocationFormGroup({
                id: '',
                name: '',
                description: '',
                image: '',
                device_ids: [],
                device_group_ids: []
            });
        }
    }


    private getLocationFromForm(): LocationModel {
        return this.locationForm.getRawValue();
    }

    private updateDevicesForm(deviceIds: string[]) {
        const fromCache: DeviceInstancesBaseModel[] = [];
        const idsForRepoSearch: string[] = [];
        for (const id of deviceIds) {
            const cachedDevice = this.deviceCache.get(id);
            if (cachedDevice) {
                fromCache.push(cachedDevice);
            } else {
                idsForRepoSearch.push(id);
            }
        }

        const sortByName = (n1: DeviceInstancesBaseModel, n2: DeviceInstancesBaseModel) => {
            if (n1.name > n2.name) {
                return 1;
            }
            if (n1.name < n2.name) {
                return -1;
            }
            return 0;
        };

        if (idsForRepoSearch.length) {
            this.deviceService.getDeviceListByIds(idsForRepoSearch).subscribe(devices => {
                for (const device of devices) {
                    this.deviceCache.set(device.id, device);
                }
                const sortedResult = fromCache.concat(devices).sort(sortByName);
                this.devicesForm.setValue(sortedResult);
            });
        } else {
            const sortedResult = fromCache.sort(sortByName);
            this.devicesForm.setValue(sortedResult);
        }
    }

    private updateDeviceGroupsForm(deviceGroupIds: string[]) {
        const fromCache: DeviceGroupModel[] = [];
        const idsForRepoSearch: string[] = [];
        for (const id of deviceGroupIds) {
            const cachedGroups = this.deviceGroupCache.get(id);
            if (cachedGroups) {
                fromCache.push(cachedGroups);
            } else {
                idsForRepoSearch.push(id);
            }
        }

        const sortByName = (n1: DeviceGroupModel, n2: DeviceGroupModel) => {
            if (n1.name > n2.name) {
                return 1;
            }
            if (n1.name < n2.name) {
                return -1;
            }
            return 0;
        };

        if (idsForRepoSearch.length) {
            this.deviceGroupService.getDeviceGroupListByIds(idsForRepoSearch).subscribe(groups => {
                for (const group of groups) {
                    this.deviceGroupCache.set(group.id, group);
                }
                const sortedResult = fromCache.concat(groups).sort(sortByName);
                this.deviceGroupsForm.setValue(sortedResult);
            });
        } else {
            const sortedResult = fromCache.sort(sortByName);
            this.deviceGroupsForm.setValue(sortedResult);
        }
    }

    selectAndAddDevices() {
        this.deviceDialogService.openDeviceSelectDialog().subscribe(deviceIds => {
            if (deviceIds) {
                this.addDevices(deviceIds);
            }
        });
    }

    selectAndAddGroups() {
        this.deviceGroupDialogService.openDeviceGroupSelectDialog().subscribe(ids => {
            if (ids) {
                this.addDeviceGroups(ids);
            }
        });
    }
}
