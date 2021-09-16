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

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DeviceGroupsService } from '../shared/device-groups.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
    DeviceGroupCapability,
    DeviceGroupCriteriaModel,
    DeviceGroupHelperResultModel,
    DeviceGroupModel,
} from '../shared/device-groups.model';
import { DeviceInstancesBaseModel } from '../../device-instances/shared/device-instances.model';
import { debounceTime, delay } from 'rxjs/operators';
import { DeviceTypeFunctionModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { AspectsPermSearchModel } from '../../../metadata/aspects/shared/aspects-perm-search.model';
import { DeviceClassesPermSearchModel } from '../../../metadata/device-classes/shared/device-classes-perm-search.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DeviceGroupsPipelineHelperDialogComponent } from './device-groups-pipeline-helper-dialog/device-groups-pipeline-helper-dialog.component';
import { PipelineRegistryService } from '../../../data/pipeline-registry/shared/pipeline-registry.service';

@Component({
    selector: 'senergy-device-groups-edit',
    templateUrl: './device-groups-edit.component.html',
    styleUrls: ['./device-groups-edit.component.css'],
})
export class DeviceGroupsEditComponent implements OnInit {
    id = '';
    deviceGroupForm!: FormGroup; // DeviceGroupModel

    selectedForm: FormControl = new FormControl([]); // []DeviceInstancesBaseModel
    selectableForm: FormControl = new FormControl([]); // []DeviceGroupHelperOptionsModel
    searchText: FormControl = new FormControl('');
    capabilities: FormControl = new FormControl([]); // []DeviceGroupCapability

    deviceCache: Map<string, DeviceInstancesBaseModel> = new Map<string, DeviceInstancesBaseModel>();
    functionsCache: Map<string, DeviceTypeFunctionModel> = new Map<string, DeviceTypeFunctionModel>();
    aspectCache: Map<string, AspectsPermSearchModel> = new Map<string, AspectsPermSearchModel>();
    deviceClassCache: Map<string, DeviceClassesPermSearchModel> = new Map<string, DeviceClassesPermSearchModel>();

    debounceTimeInMs = 500;
    rerouteAfterSaveDelayInMs = 2000;
    isSaving = false;

    constructor(
        private _formBuilder: FormBuilder,
        private deviceGroupService: DeviceGroupsService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private pipelineRegistryService: PipelineRegistryService,
        private route: ActivatedRoute,
        private router: Router,
    ) {
        this.getRouterParams();
    }

    ngOnInit() {
        this.loadData();
    }

    private getRouterParams(): void {
        this.id = this.route.snapshot.paramMap.get('id') || '';
    }

    addDevice(id: string) {
        const devicesFc = this.deviceGroupForm.get('device_ids');
        if (devicesFc) {
            let idList = devicesFc.value;
            idList.push(id);
            // filter duplicates
            idList = idList.filter((item: string, index: number) => idList.indexOf(item) === index);
            devicesFc.setValue(idList);
        } else {
            throw new Error('unexpected deviceGroupForm structure');
        }
    }

    removeDevice(id: string) {
        const devicesFc = this.deviceGroupForm.get('device_ids');
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
            throw new Error('unexpected deviceGroupForm structure');
        }
    }

    close(): void {}

    save(): void {
        this.saveDeviceGroup(this.getDeviceGroupFromForm());
    }

    private initDeviceGroupFormGroup(deviceGroup: DeviceGroupModel) {
        this.deviceGroupForm = this.createDeviceGroupFormGroup(deviceGroup);
        const that = this;

        // watch device selection changes
        const devicesFc = this.deviceGroupForm.get('device_ids');
        if (devicesFc) {
            devicesFc.valueChanges.subscribe((value) => {
                that.updateSelectedDevices(value);
            });
            devicesFc.valueChanges.subscribe((value) => {
                that.runHelper(this.searchText.value, value);
            });
            this.updateSelectedDevices(deviceGroup.device_ids);
            this.runHelper('', deviceGroup.device_ids);
        } else {
            throw new Error('missing device_ids in deviceGroupForm');
        }

        const criteriaFc = this.deviceGroupForm.get('criteria');
        if (criteriaFc) {
            criteriaFc.valueChanges.subscribe((value) => {
                that.updateCapabilities(value);
            });
            this.updateCapabilities(deviceGroup.criteria);
        } else {
            throw new Error('missing criteria in deviceGroupForm');
        }

        // update search
        this.searchText.valueChanges.pipe(debounceTime(this.debounceTimeInMs)).subscribe((value) => {
            that.search(value);
        });
    }

    private createDeviceGroupFormGroup(deviceGroup: DeviceGroupModel): FormGroup {
        return this._formBuilder.group({
            id: [{ value: deviceGroup.id, disabled: true }],
            name: [deviceGroup.name, Validators.required],
            image: [deviceGroup.image],
            device_ids: [deviceGroup.device_ids && deviceGroup.device_ids.length > 0 ? deviceGroup.device_ids : []],
            criteria: [deviceGroup.criteria && deviceGroup.criteria.length > 0 ? deviceGroup.criteria : []],
        });
    }

    private saveDeviceGroup(deviceGroup: DeviceGroupModel) {
        this.isSaving = true;
        if (deviceGroup.id === '' || deviceGroup.id === undefined) {
            this.deviceGroupService
                .createDeviceGroup(deviceGroup)
                .pipe(delay(this.rerouteAfterSaveDelayInMs))
                .subscribe((deviceGroupSaved: DeviceGroupModel | null) => {
                    this.showMessage(deviceGroupSaved);
                    this.isSaving = false;
                    this.reload(deviceGroupSaved);
                });
        } else {
            this.deviceGroupService
                .updateDeviceGroup(deviceGroup)
                .pipe(delay(this.rerouteAfterSaveDelayInMs))
                .subscribe((deviceGroupSaved: DeviceGroupModel | null) => {
                    this.showMessage(deviceGroupSaved);
                    this.pipelineRegistryService.getPipelinesWithSelectable(deviceGroupSaved?.id || '').subscribe((pipelines) => {
                        this.isSaving = false;
                        if (pipelines.length === 0) {
                            // this.reload(deviceGroupSaved);
                        } else {
                            const config: MatDialogConfig = {
                                data: pipelines,
                            };
                            this.dialog.open(DeviceGroupsPipelineHelperDialogComponent, config);
                        }
                    });
                });
        }
    }

    private reload(deviceGroup: DeviceGroupModel | null) {
        if (deviceGroup) {
            this.router.routeReuseStrategy.shouldReuseRoute = function() {
                return false;
            };
            this.router.onSameUrlNavigation = 'reload';
            this.router.navigate(['devices/devicegroups/edit/' + deviceGroup.id], {});
        }
    }

    private showMessage(deviceGroupSaved: DeviceGroupModel | null) {
        if (deviceGroupSaved) {
            this.snackBar.open('Device-Group saved successfully.', undefined, { duration: 2000 });
        } else {
            this.snackBar.open('Error while saving the device group!', undefined, { duration: 2000 });
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
                criteria: [],
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
            this.deviceGroupService.getDeviceListByIds(idsForRepoSearch).subscribe((devices) => {
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

    private updateCapabilities(criteria: DeviceGroupCriteriaModel[]) {
        const that = this;
        const functionIds = [];
        const aspectIds = [];
        const deviceClassIds = [];
        for (const c of criteria) {
            functionIds.push(c.function_id);
            if (c.aspect_id) {
                aspectIds.push(c.aspect_id);
            }
            if (c.device_class_id) {
                deviceClassIds.push(c.device_class_id);
            }
        }
        Promise.all([this.loadIotFunctions(functionIds), this.loadAspects(aspectIds), this.loadDeviceClasses(deviceClassIds)]).then(
            (infos) => {
                const functions: Map<string, DeviceTypeFunctionModel> = infos[0];
                const aspects: Map<string, AspectsPermSearchModel> = infos[1];
                const deviceClasses: Map<string, DeviceClassesPermSearchModel> = infos[2];
                let result: DeviceGroupCapability[] = [];
                for (const c of criteria) {
                    const element: DeviceGroupCapability = {
                        device_class_id: c.device_class_id,
                        aspect_id: c.aspect_id,
                        function_id: c.function_id,
                        interaction: c.interaction,
                        aspect_name: '',
                        device_class_name: '',
                        function_name: '',
                        function_description: '',
                        function_type: '',
                    };
                    if (c.aspect_id) {
                        const aspect = aspects.get(c.aspect_id);
                        if (aspect) {
                            element.aspect_name = aspect.name;
                        }
                    }
                    if (c.device_class_id) {
                        const deviceClass = deviceClasses.get(c.device_class_id);
                        if (deviceClass) {
                            element.device_class_name = deviceClass.name;
                        }
                    }
                    if (c.function_id) {
                        const iotFunction = functions.get(c.function_id);
                        if (iotFunction) {
                            element.function_name = iotFunction.name;
                            element.function_description = iotFunction.description;
                            element.function_type = iotFunction.rdf_type;
                        }
                    }
                    result.push(element);
                }
                result = this.sortCapabilities(result);
                that.capabilities.setValue(result);
            },
        );
    }

    sortCapabilities(list: DeviceGroupCapability[]): DeviceGroupCapability[] {
        return list.sort((a, b) => {
            const ahash = a.function_id + '_' + a.aspect_id + '_' + a.device_class_id + '_' + a.interaction;
            const bhash = b.function_id + '_' + b.aspect_id + '_' + b.device_class_id + '_' + b.interaction;
            if (ahash > bhash) {
                return 1;
            }
            if (ahash < bhash) {
                return -1;
            }
            return 0;
        });
    }

    // update selectables by calling POST device-selection/device-group-helper?search={search}&limit={limit}&offset=offset
    private runHelper(search: string, selectedDeviceIds: string[]) {
        this.deviceGroupService
            .useDeviceSelectionDeviceGroupHelper(selectedDeviceIds, search, 100, 0, true)
            .subscribe((value: DeviceGroupHelperResultModel | null) => {
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
        const devicesFc = this.deviceGroupForm.get('device_ids');
        let ids = [];
        if (devicesFc && devicesFc.value) {
            ids = devicesFc.value;
        }
        this.runHelper(text, ids);
    }

    resetSearchText() {
        this.searchText.setValue('');
        return false;
    }

    private loadIotFunctions(functionIds: string[]): Promise<Map<string, DeviceTypeFunctionModel>> {
        const result: Map<string, DeviceTypeFunctionModel> = new Map<string, DeviceTypeFunctionModel>();
        const idsForRepoSearch: string[] = [];
        for (const id of functionIds) {
            const cachedElement = this.functionsCache.get(id);
            if (cachedElement) {
                result.set(cachedElement.id, cachedElement);
            } else {
                idsForRepoSearch.push(id);
            }
        }
        if (idsForRepoSearch.length) {
            return new Promise<Map<string, DeviceTypeFunctionModel>>((resolve) => {
                this.deviceGroupService.getFunctionListByIds(idsForRepoSearch).subscribe((value) => {
                    for (const element of value) {
                        result.set(element.id, element);
                    }
                    resolve(result);
                });
            });
        } else {
            return Promise.resolve(result);
        }
    }

    private loadAspects(aspectIds: string[]): Promise<Map<string, AspectsPermSearchModel>> {
        const result: Map<string, AspectsPermSearchModel> = new Map<string, AspectsPermSearchModel>();
        const idsForRepoSearch: string[] = [];
        for (const id of aspectIds) {
            const cachedElement = this.aspectCache.get(id);
            if (cachedElement) {
                result.set(cachedElement.id, cachedElement);
            } else {
                idsForRepoSearch.push(id);
            }
        }
        if (idsForRepoSearch.length) {
            return new Promise<Map<string, AspectsPermSearchModel>>((resolve) => {
                this.deviceGroupService.getAspectListByIds(idsForRepoSearch).subscribe((value) => {
                    for (const element of value) {
                        result.set(element.id, element);
                    }
                    resolve(result);
                });
            });
        } else {
            return Promise.resolve(result);
        }
    }

    private loadDeviceClasses(deviceClassIds: string[]): Promise<Map<string, DeviceClassesPermSearchModel>> {
        const result: Map<string, DeviceClassesPermSearchModel> = new Map<string, DeviceClassesPermSearchModel>();
        const idsForRepoSearch: string[] = [];
        for (const id of deviceClassIds) {
            const cachedElement = this.deviceClassCache.get(id);
            if (cachedElement) {
                result.set(cachedElement.id, cachedElement);
            } else {
                idsForRepoSearch.push(id);
            }
        }
        if (idsForRepoSearch.length) {
            return new Promise<Map<string, DeviceClassesPermSearchModel>>((resolve) => {
                this.deviceGroupService.getDeviceClassListByIds(idsForRepoSearch).subscribe((value) => {
                    for (const element of value) {
                        result.set(element.id, element);
                    }
                    resolve(result);
                });
            });
        } else {
            return Promise.resolve(result);
        }
    }
}
