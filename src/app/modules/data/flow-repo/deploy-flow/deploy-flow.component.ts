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
import {ParserService} from '../shared/parser.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ParseModel} from '../shared/parse.model';
import {
    DeviceInstancesModel,
    DeviceSelectablesWithGroupsModel
} from '../../../devices/device-instances/shared/device-instances.model';
import {DeviceInstancesService} from '../../../devices/device-instances/shared/device-instances.service';
import {
    DeviceTypeAspectModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeFunctionModel,
    DeviceTypeServiceModel
} from '../../../devices/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../devices/device-types-overview/shared/device-type.service';
import {FlowEngineService} from '../shared/flow-engine.service';
import {NodeConfig, NodeModel, NodeValue, PipelineRequestModel} from './shared/pipeline-request.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {of} from 'rxjs';
import {DeviceGroupsService} from '../../../devices/device-groups/shared/device-groups.service';
import {PathOptionsService} from '../shared/path-options.service';
import {AbstractControl, FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {DeviceTypePermSearchModel} from '../../../devices/device-types-overview/shared/device-type-perm-search.model';
import {MatOption} from '@angular/material/core';
import {ConceptsService} from '../../../devices/concepts/shared/concepts.service';

interface CustomSelectable {
    id: string;
    name: string;
}

interface DeviceServicePath {
    devices: string[];
    values: NodeValue[];
    topic: string;
}

@Component({
    selector: 'senergy-deploy-flow',
    templateUrl: './deploy-flow.component.html',
    styleUrls: ['./deploy-flow.component.css']
})
export class DeployFlowComponent implements OnInit {

    constructor(private parserService: ParserService,
                private route: ActivatedRoute,
                private router: Router,
                public snackBar: MatSnackBar,
                private deviceInstanceService: DeviceInstancesService,
                private deviceTypeService: DeviceTypeService,
                private deviceGroupsService: DeviceGroupsService,
                private pathOptionsService: PathOptionsService,
                private fb: FormBuilder,
                private conceptsService: ConceptsService,
                private flowEngineService: FlowEngineService) {
    }

    static DEVICE_KEY = 'Devices';
    static GROUP_KEY = 'Device Groups';

    ready = false;
    id = '';
    allDevices: DeviceInstancesModel[] = [];
    pipeReq: PipelineRequestModel = {} as PipelineRequestModel;
    aspects: DeviceTypeAspectModel[] = [];
    aspectFunctions = new Map<string, DeviceTypeFunctionModel[]>();
    selectables = new Map<string, DeviceSelectablesWithGroupsModel[]>();
    selectablesCharacteristics = new Map<string, Map<string, CustomSelectable[]>>();
    deviceGroupDevices = new Map<string, string[]>();
    serviceOptions: Map<string, Map<string, Map<string, Map<string, Map<string, { path: string; service_id: string; }[]>>>>> = new Map();
    services = new Map<string, DeviceTypeServiceModel>();
    functionCharacteristics: Map<string, DeviceTypeCharacteristicsModel[]> = new Map();


    form = this.fb.group({
        name: '',
        description: '',
        nodes: this.fb.array([]),
        windowTime: 30,
        enable_metrics: false,
        consume_all_msgs: false,
    });

    private static stringArrayKey(s: string[] | null | undefined): string {
        if (s === null) {
            return 'null';
        }
        if (s === undefined) {
            return 'undefined';
        }
        const copy = JSON.parse(JSON.stringify(s)) as string[];
        const key = copy.sort().join(',');
        return key;
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id === null) {
            console.error('id not set!');
            return;
        }
        this.id = id;

        this.pipeReq = {
            id,
        } as PipelineRequestModel;

        this.parserService.getInputs(id).subscribe((resp: ParseModel []) => {
            this.deviceInstanceService.getDeviceInstances('', 9999, 0, 'name', 'asc')
                .subscribe((devices: DeviceInstancesModel []) => {
                    this.allDevices = devices;
                    resp.forEach(input => {
                        this.addNode(input);
                    });
                });
            this.ready = true;
        });

        this.deviceTypeService.getAspectsWithMeasuringFunction().subscribe(aspects => this.aspects = aspects);
    }

    private addNode(newNode: ParseModel): void {
        const node = this.fb.group({
            id: '',
            name: '',
            inputs: this.fb.array([]),
            deploymentType: '',
            operatorId: '',
            configs: this.fb.array([]),
        });
        node.patchValue(newNode);
        newNode.config?.forEach((config) => {
            (node.get('configs') as FormArray).push(this.fb.group({
                name: config.name,
                type: config.type,
                value: null,
            }));
        });
        newNode.inPorts?.forEach(input => {
            const inputGroup = this.fb.group({
                aspectId: '',
                functionId: '',
                characteristics: [],
                selectableId: '',
                filter: new Map<string, { serviceId: string, path: string }>(), // deviceId to serviceId and path
                devices: [],
                name: input,
            });
            inputGroup.get('aspectId')?.valueChanges.subscribe(aspectId => {
                this.loadAspectFunctions(aspectId).subscribe();
                inputGroup.patchValue({
                    functionId: '',
                });
            });
            inputGroup.get('functionId')?.valueChanges.subscribe(functionId => {
                this.prepareSelectables(inputGroup);
                const aspectId = inputGroup.get('aspectId')?.value;
                const func = this.aspectFunctions.get(aspectId)?.find(f => f.id === functionId);
                if (func !== undefined) {
                    this.loadFunctionCharacteristics(func).subscribe();
                }
                inputGroup.patchValue({
                    selectableId: '',
                });
            });
            inputGroup.get('characteristics')?.valueChanges.subscribe(_ => {
                this.prepareSelectables(inputGroup);
            });
            inputGroup.get('selectableId')?.valueChanges.subscribe(selectableId => {
                inputGroup.patchValue({
                    filter: new Map<string, { serviceId: string, path: string }>(), // deviceId to serviceId and path
                    devices: [],
                });
                this.selectableSelected(inputGroup, selectableId);
            });
            (node.get('inputs') as FormArray).push(inputGroup);
        });

        (this.form.get('nodes') as FormArray).push(node);
    }

    getAspectFunctions(aspectId: string): DeviceTypeFunctionModel[] {
        return this.aspectFunctions.get(aspectId) || [];
    }

    loadAspectFunctions(aspectId: string): Observable<DeviceTypeFunctionModel[]> {
        if (this.aspectFunctions.has(aspectId)) {
            return of(this.aspectFunctions.get(aspectId) || []);
        }
        return this.deviceTypeService.getAspectsMeasuringFunctions(aspectId)
            .pipe(map(functions => {
                this.aspectFunctions.set(aspectId, functions);
                return functions;
            }));
    }

    private loadSelectables(aspect_id: string, function_id: string): Observable<DeviceSelectablesWithGroupsModel[]> {
        if (this.selectables.has(aspect_id + function_id)) {
            return of(this.selectables.get(aspect_id + function_id) || []);
        }
        return this.deviceInstanceService.getDeviceSelectionsWithGroups([{
            function_id,
            aspect_id
        }], true).pipe(map(selectables => {
            this.selectables.set(aspect_id + function_id, selectables);
            return selectables;
        }));
    }

    prepareSelectables(inputGroup: FormGroup) {
        const aspect_id = inputGroup.get('aspectId')?.value;
        const function_id = inputGroup.get('functionId')?.value;
        const characteristicIds = inputGroup.get('characteristics')?.value;
        const currentlySelected = inputGroup.get('selectableId')?.value;

        if (function_id.length === 0 || characteristicIds === null || characteristicIds === undefined) {
            inputGroup.patchValue({selectableId: null});
            return;
        }
        const characteristicKey = DeployFlowComponent.stringArrayKey(characteristicIds);
        if (this.selectablesCharacteristics.has(aspect_id + function_id + characteristicKey)) {
            for (const selectable of this.selectablesCharacteristics.get(aspect_id + function_id + characteristicKey)?.values() || []) {
                if (selectable === currentlySelected) {
                    return;
                }
            }
            // previously selected, but now invalid
            inputGroup.patchValue({selectableId: null});
            return;
        }
        if (characteristicIds.length === 0) {
            this.selectablesCharacteristics.set(aspect_id + function_id + characteristicKey, new Map());
            inputGroup.patchValue({selectableId: null});
            return;
        }
        // prepare serviceOptions
        const characteristicsKey = DeployFlowComponent.stringArrayKey(characteristicIds);
        if (!this.serviceOptions.has(aspect_id)) {
            this.serviceOptions.set(aspect_id, new Map());
        }
        if (!this.serviceOptions.get(aspect_id)?.get(function_id)) {
            this.serviceOptions.get(aspect_id)?.set(function_id, new Map());
        }
        if (!this.serviceOptions.get(aspect_id)?.get(function_id)?.get(characteristicsKey)) {
            this.serviceOptions.get(aspect_id)?.get(function_id)?.set(characteristicsKey, new Map());
        }
        this.loadSelectables(aspect_id, function_id).subscribe(selectables => {
            const m: Map<string, CustomSelectable[]> = new Map();
            m.set(DeployFlowComponent.DEVICE_KEY, []);
            m.set(DeployFlowComponent.GROUP_KEY, []);
            selectables.forEach(selectable => {
                if (selectable.device !== undefined && selectable.device !== null) {
                    selectable.services?.forEach(service => {
                        if (!this.services.has(service.id)) {
                            this.services.set(service.id, service);
                        }
                    });
                    const pathOptions = this.pathOptionsService.getPathOptionsLocal(selectable.services || [], false, characteristicIds);
                    if (pathOptions.length > 0) {
                        m.get(DeployFlowComponent.DEVICE_KEY)?.push({
                            id: selectable.device.id, name: selectable.device.name
                        });
                    } else if (currentlySelected === selectable.device.id) {
                        // previously selected, but now invalid
                        inputGroup.patchValue({selectableId: null});
                    }
                    if (!this.serviceOptions.get(aspect_id)?.get(function_id)?.get(characteristicsKey)
                        ?.get(selectable.device?.device_type_id || '')) {
                        this.serviceOptions.get(aspect_id)?.get(function_id)?.get(characteristicsKey)
                            ?.set(selectable.device?.device_type_id || '', new Map());
                    }
                    pathOptions.forEach(pathOption => {
                        const options: { path: string; service_id: string; }[] = [];
                        pathOption.json_path.forEach(path => options.push({path, service_id: pathOption.service_id}));
                        this.serviceOptions.get(aspect_id)?.get(function_id)?.get(characteristicsKey)
                            ?.get(selectable.device?.device_type_id || '')?.set(pathOption.service.name, options);
                    });

                } else if (selectable.device_group !== undefined && selectable.device_group !== null) {
                    this.loadDeviceGroup(selectable.device_group.id).subscribe(groupDevices => {
                        const matchingDevices = groupDevices.filter(deviceId => {
                            const device = this.allDevices.find(d => d.id === deviceId);
                            if (device === undefined) {
                                return false;
                            }
                            const services: DeviceTypeServiceModel[] = [];
                            if (!Array.isArray(device.device_type.service)) {
                                if (this.services.has(device.device_type.service)) {
                                    services.push(this.services.get(device.device_type.service) || {} as DeviceTypeServiceModel);
                                }
                            } else {
                                device.device_type.service.forEach(serviceId => {
                                    if (this.services.has(serviceId)) {
                                        services.push(this.services.get(serviceId) || {} as DeviceTypeServiceModel);
                                    }
                                });
                            }
                            const pathOptions = this.pathOptionsService.getPathOptionsLocal(services, false, characteristicIds);
                            return pathOptions.length > 0;
                        });

                        if (matchingDevices.length > 0) {
                            m.get(DeployFlowComponent.GROUP_KEY)?.push({
                                id: selectable.device_group?.id || '',
                                name: selectable.device_group?.name || '',
                            });
                        } else {
                            if (currentlySelected === selectable.device_group?.id) {
                                // previously selected, but now invalid
                                inputGroup.patchValue({selectableId: null});
                            }
                        }
                    });
                }
            });
            this.selectablesCharacteristics.set(aspect_id + function_id + characteristicKey, m);
        });
    }


    getSelectables(aspect_id: string, function_id: string, characteristicIds: string[]): Map<string, CustomSelectable[]> {
        const characteristicKey = DeployFlowComponent.stringArrayKey(characteristicIds);
        const selectables = this.selectablesCharacteristics.get(aspect_id + function_id + characteristicKey) || new Map();
        return selectables;
    }

    loadDeviceGroup(id: string): Observable<string[]> {
        if (!this.deviceGroupDevices.has(id)) {
            // unknown device group
            return this.deviceGroupsService.getDeviceGroup(id).pipe(map(group => {
                if (group === null) {
                    console.error('Selected group does not exist!');
                    return [];
                }
                this.deviceGroupDevices.set(id, group.device_ids);
                return group.device_ids;
            }));
        } else {
            return of(this.deviceGroupDevices.get(id) || []);
        }
    }

    selectableSelected(input: FormGroup, selectableId: string | null) {
        if (selectableId === null) {
            return;
        }
        if (selectableId.startsWith('urn:infai:ses:device-group:')) {
            if (!this.deviceGroupDevices.has(selectableId)) {
                // unknown device group
                this.loadDeviceGroup(selectableId).subscribe(deviceIds => {
                    const devices = this.getDeviceInstances(deviceIds);
                    input.patchValue({devices});
                });
            } else {
                // known device group
                const devices = this.getDeviceInstances(this.deviceGroupDevices.get(selectableId) || []);
                input.patchValue({devices});
            }
        } else {
            // single device
            const devices = this.getDeviceInstances([selectableId]);
            input.patchValue({devices});
        }
    }

    private getDeviceInstances(ids: string[]): DeviceInstancesModel[] {
        return this.allDevices.filter(d => ids.findIndex(id => id === d.id) !== -1);
    }

    startPipeline() {
        this.ready = false;
        this.pipeReq.name = this.form.get('name')?.value;
        this.pipeReq.description = this.form.get('description')?.value;
        this.pipeReq.consumeAllMessages = this.form.get('consume_all_msgs')?.value;
        this.pipeReq.metrics = this.form.get('enable_metrics')?.value;
        this.pipeReq.windowTime = this.form.get('windowTime')?.value;
        this.pipeReq.nodes = [];
        this.getSubElementAsGroupArray(this.form, 'nodes').forEach(node => {
            const nodeModel: NodeModel = {} as NodeModel;
            nodeModel.nodeId = node.get('id')?.value;
            nodeModel.deploymentType = node.get('deploymentType')?.value;
            nodeModel.config = [];
            this.getSubElementAsGroupArray(node, 'configs').forEach(config => {
                const nodeConfig: NodeConfig = {
                    name: config.get('name')?.value,
                    value: config.get('value')?.value,
                };
                nodeModel.config?.push(nodeConfig);
            });
            const inputs = this.getSubElementAsGroupArray(node, 'inputs');
            const flatFilters: DeviceServicePath[] = [];
            // Create a filter for each device/topic/value
            inputs.forEach(input => {
                const filters = input.get('filter')?.value as Map<string, { serviceId: string, path: string }>;
                filters.forEach((filter, deviceId) => {
                    flatFilters.push({
                        devices: [deviceId],
                        topic: filter.serviceId.replace(/:/g, '_'),
                        values: [{
                            name: input.get('name')?.value,
                            path: filter.path,
                        }],
                    });
                });
            });
            // Join all filters with same topic/value combination
            const joinedDeviceFilters: DeviceServicePath[] = [];
            flatFilters.forEach(filter => {
                const idx = joinedDeviceFilters.findIndex(joined => {
                    if (joined.topic !== filter.topic || joined.values.length !== filter.values.length) {
                        return false;
                    }

                    let valuesEqual = true;
                    joined.values.forEach(joinedVal => {
                        if (filter.values.findIndex(filterVal =>
                            filterVal.name === joinedVal.name && filterVal.path === joinedVal.path) === -1) {
                            valuesEqual = false;
                        }
                    });
                    return valuesEqual;
                });

                if (idx === -1) {
                    joinedDeviceFilters.push(filter);
                } else {
                    const missingDevices = filter.devices.filter(filterDevice =>
                        joinedDeviceFilters[idx].devices.findIndex(joinedDevice => filterDevice === joinedDevice) === -1);
                    joinedDeviceFilters[idx].devices.push(...missingDevices);
                }
            });
            // Join all filters with same topic/device combination
            const joinedValueFilters: DeviceServicePath[] = [];
            joinedDeviceFilters.forEach(filter => {
                const idx = joinedValueFilters.findIndex(joined => {
                    if (joined.topic !== filter.topic || joined.devices.length !== filter.devices.length) {
                        return false;
                    }

                    let devicesEqual = true;
                    joined.devices.forEach(joinedDevice => {
                        if (filter.devices.findIndex(filterDevice => filterDevice === joinedDevice) === -1) {
                            devicesEqual = false;
                        }
                    });
                    return devicesEqual;
                });
                if (idx === -1) {
                    joinedValueFilters.push(filter);
                } else {
                    const missingValues = filter.values.filter(filterVal =>
                        joinedValueFilters[idx].values.findIndex(joinedVal =>
                            filterVal.name === joinedVal.name && filterVal.path === joinedVal.path) === -1);
                    joinedValueFilters[idx].values.push(...missingValues);
                }
            });

            nodeModel.inputs = [];
            joinedValueFilters.forEach(filter => nodeModel.inputs?.push({
                deviceId: filter.devices.join(','),
                topicName: filter.topic,
                values: filter.values,
            }));
            this.pipeReq.nodes.push(nodeModel);
        });

        this.flowEngineService.startPipeline(this.pipeReq).subscribe(_ => {
            this.router.navigate(['/data/pipelines']);
            this.snackBar.open('Pipeline started', undefined, {
                duration: 2000,
            });
        });
    }

    switchToClassic() {
        this.router.navigateByUrl('data/flow-repo/deploy-classic/' + this.id);
    }

    getServiceOptions(input: FormGroup, deviceType: DeviceTypePermSearchModel): Map<string, { path: string; service_id: string; }[]> {
        const functionId = input.get('functionId')?.value;
        const aspectId = input.get('aspectId')?.value;
        const characteristicsKey = DeployFlowComponent.stringArrayKey(input.get('characteristics')?.value);
        const preparedOptions = this.serviceOptions.get(aspectId)?.get(functionId)?.get(characteristicsKey)?.get(deviceType.id);
        return preparedOptions || new Map();
    }

    getDeviceTypes(input: AbstractControl): DeviceTypePermSearchModel[] {
        const anyTypes = (input.get('devices')?.value?.map((x: DeviceInstancesModel) => x.device_type));
        if (anyTypes === undefined) {
            return [];
        }
        const types = anyTypes as DeviceTypePermSearchModel[];
        return types.filter((t, index) => types.findIndex(t2 => t2.id === t.id) === index); // unique
    }

    getSubElementAsGroupArray(element: AbstractControl, subElementPath: string): FormGroup[] {
        return (element.get(subElementPath) as FormArray)?.controls as FormGroup[] || [];
    }

    servicePathSelected(input: FormGroup, deviceTypeId: string, selection: { service_id: string, path: string }) {
        let devices = input.get('devices')?.value as DeviceInstancesModel[];
        devices = devices.filter(d => d.device_type.id === deviceTypeId);
        const filter = input.get('filter')?.value as Map<string, { serviceId: string, path: string }>;
        devices.forEach(d => filter.set(d.id, {serviceId: selection.service_id, path: selection.path}));
        input.patchValue({filter});
    }

    disableServiceOptions(input: FormGroup, deviceType: DeviceTypePermSearchModel): boolean {
        const serviceOptions = this.getServiceOptions(input, deviceType);
        let foundFirst = false;
        for (const v of serviceOptions) {
            if (v[1].length > 1) {
                return  false;
            }
            if (v[1].length > 0) {
                if (foundFirst) {
                    return false;
                }
                foundFirst = true;
            }
        }
        return true;
    }

    getServiceTriggerValue(selection: MatOption | MatOption[] | undefined): string {
        if (Array.isArray(selection)) {
            return 'Err'; // multiple should never be set here
        }
        return selection?.group.label + ': ' + selection?.value.path;
    }

    loadFunctionCharacteristics(func: DeviceTypeFunctionModel): Observable<DeviceTypeCharacteristicsModel[]> {
        if (this.functionCharacteristics.has(func.id)) {
            return of(this.functionCharacteristics.get(func.id) || []);
        }
        return this.conceptsService.getConceptWithCharacteristics(func.concept_id).pipe(map(concept => {
            this.functionCharacteristics.set(func.id, concept?.characteristics || []);
            return concept?.characteristics || [];
        }));
    }

    getFunctionCharacteristics(functionId: string): DeviceTypeCharacteristicsModel[] {
        return this.functionCharacteristics.get(functionId) || [];
    }
}
