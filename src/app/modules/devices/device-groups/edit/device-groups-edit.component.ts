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
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {DeviceGroupsService} from '../shared/device-groups.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {forkJoin, Observable} from 'rxjs';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeNestedDataSource} from '@angular/material/tree';
import {MatOption} from '@angular/material/core';
import {DeviceGroupHelperResultModel, DeviceGroupModel} from '../shared/device-groups.model';
import {DeviceInstancesBaseModel} from '../../device-instances/shared/device-instances.model';

@Component({
    selector: 'senergy-device-groups-edit',
    templateUrl: './device-groups-edit.component.html',
    styleUrls: ['./device-groups-edit.component.css']
})
export class DeviceGroupsEditComponent implements OnInit {

    id = '';
    deviceGroupForm!: FormGroup;    // DeviceGroupModel

    selectedForm: FormControl = new FormControl([]);       // []DeviceInstancesBaseModel
    selectableForm: FormControl = new FormControl([]);     // []DeviceGroupHelperOptionsModel
    searchText: FormControl = new FormControl('');
    capabilities: FormControl = new FormControl([]);       // []DeviceGroupCapability

    deviceCache: Map<string, DeviceInstancesBaseModel> = new Map<string, DeviceInstancesBaseModel>();

    searchTimeoutId: any = null;

    constructor(private _formBuilder: FormBuilder,
                private deviceGroupService: DeviceGroupsService,
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
        const devicesFc = this.deviceGroupForm.get('device_ids') as FormArray;
        if (devicesFc) {
            devicesFc.push(new FormControl(id));
        } else {
            throw new Error('unexpected deviceGroupForm structure');
        }
    }

    removeDevice(id: string) {
        const devicesFc = this.deviceGroupForm.get('device_ids') as FormArray;
        if (devicesFc) {
            const arr = devicesFc.getRawValue();
            const index = arr.indexOf(id);
            if (index >= 0) {
                devicesFc.removeAt(index);
            } else {
                throw new Error('device not found in device_ids');
            }
        } else {
            throw new Error('unexpected deviceGroupForm structure');
        }
    }

    close(): void {
    }

    save(): void {
        this.saveDeviceGroup(this.getDeviceGroupFromForm());
    }

    private initFormControls() {
        this.initDeviceGroupFormGroup({} as DeviceGroupModel);
    }

    private initDeviceGroupFormGroup(deviceGroup: DeviceGroupModel) {
        this.deviceGroupForm = this.createDeviceGroupFormGroup(deviceGroup);

        // watch device selection changes
        const devicesFc = this.deviceGroupForm.get('device_ids');
        if (devicesFc) {
            devicesFc.valueChanges.subscribe(this.updateSelectedDevices);
            this.updateSelectedDevices(deviceGroup.device_ids);
            this.runHelper('', deviceGroup.device_ids);
        } else {
            throw new Error('unexpected deviceGroupForm structure');
        }

        // update search
        this.searchText.valueChanges.subscribe(this.search);
    }

    private createDeviceGroupFormGroup(deviceGroup: DeviceGroupModel): FormGroup {
        return this._formBuilder.group({
            id: [{value: deviceGroup.id, disabled: true}],
            name: [deviceGroup.name, Validators.required],
            image: [deviceGroup.image],
            device_ids: [deviceGroup.device_ids && deviceGroup.device_ids.length > 0 ? deviceGroup.device_ids : []],
            criteria: [deviceGroup.criteria && deviceGroup.criteria.length > 0 ? deviceGroup.criteria : []]
        });
    }


    private saveDeviceGroup(deviceGroup: DeviceGroupModel) {
        if (deviceGroup.id === '' || deviceGroup.id === undefined) {
            this.deviceGroupService.createDeviceGroup(deviceGroup).subscribe((deviceGroupSaved: DeviceGroupModel | null) => {
                this.showMessage(deviceGroupSaved);
                this.reload(deviceGroupSaved);
            });
        } else {
            this.deviceGroupService.updateDeviceGroup(deviceGroup).subscribe((deviceGroupSaved: DeviceGroupModel | null) => {
                this.showMessage(deviceGroupSaved);
                this.reload(deviceGroupSaved);
            });
        }
    }

    private reload(deviceGroup: DeviceGroupModel | null) {
        if (deviceGroup) {
            this.router.routeReuseStrategy.shouldReuseRoute = function () {
                return false;
            };
            this.router.onSameUrlNavigation = 'reload';
            this.router.navigate(['devices/devicegroups/edit/' + deviceGroup.id], {});
        }

    }

    private showMessage(deviceGroupSaved: DeviceGroupModel | null) {
        if (deviceGroupSaved) {
            this.snackBar.open('Device-Group saved successfully.', undefined, {duration: 2000});
        } else {
            this.snackBar.open('Error while saving the device group!', undefined, {duration: 2000});
        }
    }

    private loadData(): void {
        if (this.id !== '') {
            this.deviceGroupService.getDeviceGroup(this.id).subscribe((deviceGroup: DeviceGroupModel | null) => {
                if (deviceGroup !== null) {
                    this.initDeviceGroupFormGroup(deviceGroup);
                }
            });
        } else {
            this.initDeviceGroupFormGroup({
                id: '',
                image: '',
                name: '',
                device_ids: [],
                criteria: []
            });
        }
    }


    private getDeviceGroupFromForm(): DeviceGroupModel {
        return this.deviceGroupForm.getRawValue();
    }

    private updateSelectedDevices(deviceIds: string[]) {
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
            this.deviceGroupService.getDeviceListByIds(idsForRepoSearch).subscribe(devices => {
                for (const device of devices) {
                    this.deviceCache.set(device.id, device);
                }
                const sortedResult = fromCache.concat(devices).sort(sortByName);
                this.selectedForm.setValue(sortedResult);
            });
        } else {
            const sortedResult = fromCache.sort(sortByName);
            this.selectedForm.setValue(sortedResult);
        }
    }

    // update selectables by calling POST device-selection/device-group-helper?search={search}&limit={limit}&offset=offset
    private runHelper(search: string, selectedDeviceIds: string[]) {
        this.deviceGroupService.useDeviceSelectionDeviceGroupHelper(selectedDeviceIds, search, 100, 0).subscribe((value: DeviceGroupHelperResultModel | null) => {
            if (value) {
                this.selectableForm.setValue(value.options);
                const criteria = this.deviceGroupForm.get('criteria');
                if (criteria) {
                    criteria.setValue(value.criteria);
                }
            }
        });
    }


    private search(text: string) {
        if (this.searchTimeoutId) {
            clearTimeout(this.searchTimeoutId);
        }
        const that = this;
        this.searchTimeoutId = setTimeout(function () {
            that.searchTimeoutId = null;
            const devicesFc = that.deviceGroupForm.get('device_ids');
            let ids = [];
            if (devicesFc && devicesFc.value) {
                ids = devicesFc.value;
            }
            that.runHelper(text, ids);
        }, 1000);
    }
}
