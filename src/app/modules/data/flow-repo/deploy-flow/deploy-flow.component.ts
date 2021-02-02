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
} from '../../../metadata/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../metadata/device-types-overview/shared/device-type.service';
import {FlowEngineService} from '../shared/flow-engine.service';
import {
    NodeConfig,
    NodeModel,
    NodeValue,
    PipelineInputSelectionModel,
    PipelineRequestModel
} from './shared/pipeline-request.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {first, map} from 'rxjs/operators';
import {forkJoin, Observable, of} from 'rxjs';
import {DeviceGroupsService} from '../../../devices/device-groups/shared/device-groups.service';
import {PathOptionsService} from '../shared/path-options.service';
import {AbstractControl, FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {DeviceTypePermSearchModel} from '../../../metadata/device-types-overview/shared/device-type-perm-search.model';
import {MatOption} from '@angular/material/core';
import {ConceptsService} from '../../../metadata/concepts/shared/concepts.service';
import {OperatorInputTopic, PipelineModel} from '../../pipeline-registry/shared/pipeline.model';
import {PipelineRegistryService} from '../../pipeline-registry/shared/pipeline-registry.service';


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
                private pipelineRegistryService: PipelineRegistryService,
                private fb: FormBuilder,
                private conceptsService: ConceptsService,
                private flowEngineService: FlowEngineService) {
    }

    static DEVICE_KEY = 'Devices';
    static GROUP_KEY = 'Device Groups';
    static GROUP_PREFIX = 'urn:infai:ses:device-group:';

    ready = false;
    flowId = '';
    pipelineId = '';
    editMode = false;
    allDevices: DeviceInstancesModel[] = [];
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
        this.deviceTypeService.getAspectsWithMeasuringFunction().subscribe(aspects => this.aspects = aspects);
        this.route.url.subscribe(url => {
            this.ready = false;
            this.resetForm();
            let id = this.route.snapshot.paramMap.get('id');
            if (id === null) {
                console.error('id not set!');
                return;
            }
            if (url[url.length - 2]?.path === 'edit') {
                this.editMode = true;
                this.pipelineRegistryService.getPipeline(id || '').subscribe((pipeline: PipelineModel | null) => {
                    if (pipeline === null || pipeline.id.length === 0) { // does not 404
                        this.snackBar.open('Unknown pipeline', undefined, {
                            duration: 2000,
                        });
                        return;
                    }
                    id = pipeline.flowId;
                    this.flowId = pipeline.flowId;
                    this.pipelineId = pipeline.id;
                    this.form.patchValue({
                        name: pipeline.name,
                        description: pipeline.description,
                        windowTime: pipeline.windowTime || 30,
                        enable_metrics: pipeline.metrics || false,
                        consume_all_msgs: pipeline.consumeAllMessages || false,
                    });

                    this.parserService.getInputs(id).subscribe((parseModels: ParseModel []) => {
                        this.deviceInstanceService.getDeviceInstances('', 9999, 0, 'name', 'asc')
                            .subscribe((devices: DeviceInstancesModel []) => {
                                this.allDevices = devices;
                                const observables: Observable<any>[] = [];
                                parseModels.forEach(input => {
                                    const operator = pipeline.operators.find(o => o.id === input.id);
                                    observables.push(this.addNode(input,
                                        operator?.inputSelections || [],
                                        operator?.config, operator?.inputTopics));
                                });
                                forkJoin(observables).subscribe(_ => this.ready = true);
                            });
                    });
                });
            } else {
                this.flowId = id || '';
                this.parserService.getInputs(this.flowId).subscribe((resp: ParseModel []) => {
                    this.deviceInstanceService.getDeviceInstances('', 9999, 0, 'name', 'asc')
                        .subscribe((devices: DeviceInstancesModel []) => {
                            this.allDevices = devices;
                            resp.forEach(input => {
                                this.addNode(input, []);
                            });
                        });
                    this.ready = true;
                });
            }
        });
    }

    private resetForm() {
        this.form = this.fb.group({
            name: '',
            description: '',
            nodes: this.fb.array([]),
            windowTime: 30,
            enable_metrics: false,
            consume_all_msgs: false,
        });
    }

    private addNode(newNode: ParseModel, inputSelections: PipelineInputSelectionModel[], configs: Map<string, string> = new Map(),
                    inputTopics: OperatorInputTopic[] = []): Observable<null[]> {

        const observables: Observable<null>[] = [];
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
            const configGroup = this.fb.group({
                name: config.name,
                type: config.type,
                value: configs.get(config.name) || '',
            });
            (node.get('configs') as FormArray).push(configGroup);
        });
        newNode.inPorts?.forEach(input => {
            const inputGroup = this.fb.group({
                aspectId: '',
                functionId: '',
                characteristics: [],
                selectableId: '',
                filter: new Map<string, { serviceId: string, path: string }>(), // deviceId to serviceId and path
                devices: [],
                deviceTypes: this.fb.array([]),
                name: input,
            });
            inputGroup.get('aspectId')?.valueChanges.subscribe(aspectId => {
                this.loadAspectFunctions(aspectId).subscribe();
                inputGroup.patchValue({
                    functionId: '',
                });
            });
            inputGroup.get('functionId')?.valueChanges.subscribe(functionId => {
                this.prepareSelectables(inputGroup).subscribe();
                const aspectId = inputGroup.get('aspectId')?.value;
                const func = this.aspectFunctions.get(aspectId)?.find(f => f.id === functionId);
                if (func !== undefined) {
                    this.loadFunctionCharacteristics(func).subscribe();
                }
                inputGroup.patchValue({
                    characteristics: [],
                });
            });
            inputGroup.get('characteristics')?.valueChanges.subscribe(_ => {
                this.prepareSelectables(inputGroup).subscribe();
                inputGroup.patchValue({
                    selectableId: '',
                });
            });
            inputGroup.get('selectableId')?.valueChanges.subscribe(selectableId => {
                inputGroup.patchValue({
                    filter: new Map<string, { serviceId: string, path: string }>(), // deviceId to serviceId and path
                    devices: [],
                });
                (inputGroup.get('deviceTypes') as FormArray).clear();
                this.selectableSelected(inputGroup, selectableId);
            });
            inputGroup.get('devices')?.valueChanges.subscribe(_ => {
                const formArray = inputGroup.get('deviceTypes') as FormArray;
                formArray.clear();
                const deviceTypes = this.getDeviceTypes(inputGroup);
                deviceTypes.forEach(deviceType => {
                    const deviceTypeGroup = this.fb.group({
                        id: deviceType.id,
                        name: deviceType.name,
                        selection: [],
                    });
                    formArray.push(deviceTypeGroup);
                    deviceTypeGroup.get('selection')?.valueChanges.subscribe(value =>
                        this.servicePathSelected(inputGroup, deviceTypeGroup.get('id')?.value, value));
                    const serviceOptions = this.getServiceOptions(inputGroup, deviceTypeGroup.get('id')?.value);
                    let options = 0;
                    serviceOptions.forEach(option => options += option.length);
                    if (options < 2) {
                        serviceOptions.forEach(option => {
                            if (option.length === 1) {
                                deviceTypeGroup.patchValue({selection: [option[0]]});
                            }
                        });
                        deviceTypeGroup.disable();
                    } else {
                        deviceTypeGroup.enable();
                    }
                });
            });

            const inputSelection = inputSelections?.find(s => s.inputName === input);
            if (inputSelection !== undefined) {
                observables.push(new Observable<null>(obs => {
                    this.loadAspectFunctions(inputSelection.aspectId).subscribe(functions => {
                        const selectedFunction = functions.find(f => f.id === inputSelection.functionId);
                        if (selectedFunction !== undefined) {
                            return this.loadFunctionCharacteristics(selectedFunction).subscribe(_ => {
                                inputGroup.patchValue({
                                    aspectId: inputSelection.aspectId,
                                    functionId: inputSelection.functionId,
                                    characteristics: inputSelection.characteristicIds,
                                    selectableId: inputSelection.selectableId
                                });
                                return this.prepareSelectables(inputGroup).subscribe(__ => {
                                    let o: Observable<any>;
                                    if (inputSelection.selectableId.startsWith(DeployFlowComponent.GROUP_PREFIX)) {
                                        o = this.loadDeviceGroup(inputSelection.selectableId);
                                    } else {
                                        o = of(null);
                                    }
                                    return o.subscribe(___ => {
                                        inputGroup.patchValue({
                                            aspectId: inputSelection.aspectId,
                                            functionId: inputSelection.functionId,
                                            characteristics: inputSelection.characteristicIds,
                                            selectableId: inputSelection.selectableId
                                        });
                                        this.getDeviceTypes(inputGroup).forEach(deviceType => {
                                            const serviceIds: string[] = [];
                                            if (!Array.isArray(deviceType.service)) {
                                                serviceIds.push(deviceType.service);
                                            } else {
                                                serviceIds.push(...deviceType.service);
                                            }
                                            const matchingTopics = inputTopics?.filter(topic =>
                                                serviceIds.includes(topic.name.replace(/_/g, ':')));
                                            matchingTopics?.forEach(matchingTopic => {
                                                const matchingInput = matchingTopic.mappings.find(mapping => mapping.dest === input);
                                                if (matchingInput !== undefined) {
                                                    const deviceTypeGroups = this.getSubElementAsGroupArray(inputGroup, 'deviceTypes');
                                                    const matchingDeviceTypeGroup = deviceTypeGroups.find(deviceTypeGroup =>
                                                        deviceTypeGroup.get('id')?.value === deviceType.id);
                                                    let selections = matchingDeviceTypeGroup?.get('selection')?.value as
                                                        { path: string; service_id: string; }[] | null;
                                                    if (selections === null) {
                                                        selections = [];
                                                    }
                                                    const serviceId = matchingTopic.name.replace(/_/g, ':');
                                                    if (selections.findIndex(s => s.path === matchingInput.source
                                                        && s.service_id === serviceId) === -1) {

                                                        selections.push({
                                                            service_id: serviceId,
                                                            path: matchingInput.source
                                                        });
                                                        matchingDeviceTypeGroup?.patchValue({
                                                            selection: selections,
                                                        });
                                                    }
                                                }
                                            });
                                            obs.next(null);
                                            obs.complete();
                                        });
                                    });
                                });
                            });
                        } else {
                            obs.next(null);
                            obs.complete();
                        }
                        return;
                    });
                }));
            }
            (node.get('inputs') as FormArray).push(inputGroup);
        });

        (this.form.get('nodes') as FormArray).push(node);
        return observables.length > 0 ? forkJoin(observables) : of([null]);
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

    prepareSelectables(inputGroup: FormGroup): Observable<null> {
        const aspect_id = inputGroup.get('aspectId')?.value;
        const function_id = inputGroup.get('functionId')?.value;
        const characteristicIds = inputGroup.get('characteristics')?.value;
        const currentlySelected = inputGroup.get('selectableId')?.value;

        if (function_id.length === 0 || characteristicIds === null || characteristicIds === undefined) {
            inputGroup.patchValue({selectableId: null});
            return of(null);
        }
        const characteristicKey = DeployFlowComponent.stringArrayKey(characteristicIds);
        if (this.selectablesCharacteristics.has(aspect_id + function_id + characteristicKey)) {
            for (const selectable of this.selectablesCharacteristics.get(aspect_id + function_id + characteristicKey)?.values() || []) {
                if (selectable === currentlySelected) {
                    return of(null);
                }
            }
            // previously selected, but now invalid
            inputGroup.patchValue({selectableId: null});
            return of(null);
        }
        if (characteristicIds.length === 0) {
            this.selectablesCharacteristics.set(aspect_id + function_id + characteristicKey, new Map());
            inputGroup.patchValue({selectableId: null});
            return of(null);
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
        return this.loadSelectables(aspect_id, function_id).pipe(map(selectables => {
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
            return null;
        }));
    }


    getSelectables(aspect_id: string, function_id: string, characteristicIds: string[]): Map<string, CustomSelectable[]> {
        const characteristicKey = DeployFlowComponent.stringArrayKey(characteristicIds);
        return this.selectablesCharacteristics.get(aspect_id + function_id + characteristicKey) || new Map();
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
        if (selectableId.startsWith(DeployFlowComponent.GROUP_PREFIX)) {
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
        const pipeReq: PipelineRequestModel = {
            flowId: this.flowId,
        } as PipelineRequestModel;
        pipeReq.id = this.editMode ? this.pipelineId : null;
        pipeReq.name = this.form.get('name')?.value;
        pipeReq.description = this.form.get('description')?.value;
        pipeReq.consumeAllMessages = this.form.get('consume_all_msgs')?.value;
        pipeReq.metrics = this.form.get('enable_metrics')?.value;
        pipeReq.windowTime = JSON.parse(this.form.get('windowTime')?.value);
        pipeReq.nodes = [];
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
            nodeModel.inputSelections = [];
            const inputs = this.getSubElementAsGroupArray(node, 'inputs');
            const flatFilters: DeviceServicePath[] = [];
            // Create a filter for each device/topic/value
            inputs.forEach(input => {
                const filters = input.get('filter')?.value as Map<string, { serviceId: string, path: string }[]>;
                filters.forEach((subfilters, deviceId) => {
                    subfilters.forEach(filter => {
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

                nodeModel.inputSelections?.push({
                    inputName: input.get('name')?.value,
                    aspectId: input.get('aspectId')?.value,
                    characteristicIds: input.get('characteristics')?.value,
                    functionId: input.get('functionId')?.value,
                    selectableId: input.get('selectableId')?.value,
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

            pipeReq.nodes.push(nodeModel);
        });

        if (this.editMode) {
            this.flowEngineService.updatePipeline(pipeReq).subscribe(_ => {
                this.route.queryParams
                    .pipe(first()).subscribe(params => {
                        if (params.next !== undefined && params.next.length > 0) {
                            const next = (params.next as string).split(',');
                            let url = '/data/pipelines/edit/' + next[0];
                            if (next.length > 1) {
                                url += '?next=' + next.splice(1).join(',');
                            }
                            this.router.navigateByUrl(url);
                            this.snackBar.open('Pipeline updated, preparing next update...', undefined, {
                                duration: 2000,
                            });
                        } else {
                            this.router.navigate(['/data/pipelines']);
                            this.snackBar.open('Pipeline updated', undefined, {
                                duration: 2000,
                            });
                        }
                    }
                );
            });
        } else {
            this.flowEngineService.startPipeline(pipeReq).subscribe(_ => {
                this.router.navigate(['/data/pipelines']);
                this.snackBar.open('Pipeline started', undefined, {
                    duration: 2000,
                });
            });
        }
    }

    switchToClassic() {
        this.router.navigateByUrl('data/flow-repo/deploy-classic/' + this.flowId);
    }

    getServiceOptions(input: FormGroup, deviceTypeId: string): Map<string, { path: string; service_id: string; }[]> {
        const functionId = input.get('functionId')?.value;
        const aspectId = input.get('aspectId')?.value;
        const characteristicsKey = DeployFlowComponent.stringArrayKey(input.get('characteristics')?.value);
        const preparedOptions = this.serviceOptions.get(aspectId)?.get(functionId)?.get(characteristicsKey)?.get(deviceTypeId);
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

    servicePathSelected(input: FormGroup, deviceTypeId: string, selection: { service_id: string, path: string }[] | null) {
        if (selection === null) {
            return;
        }
        let devices = input.get('devices')?.value as DeviceInstancesModel[];
        devices = devices.filter(d => d.device_type.id === deviceTypeId);
        const filter = input.get('filter')?.value as Map<string, { serviceId: string, path: string }[]>;
        const convertedSelection = selection.map(x => {
            return {serviceId: x.service_id, path: x.path};
        });
        devices.forEach(d => filter.set(d.id, convertedSelection));
        input.patchValue({filter});
    }

    getServiceTriggerValue(selection: MatOption | MatOption[] | undefined): string {
        if (!Array.isArray(selection) || selection === undefined) {
            return ''; // multiple should always be set here
        }
        let r = '';
        selection.forEach(s => {
            if (r.length > 0) {
                r += ', ';
            }
            r += s.group.label + ': ' + s.value.path;
        });
        return r;
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

    comparePathOptions(a: any, b: any) {
        return a && b && a.path && b.path && a.path === b.path && a.service_id && b.service_id && a.service_id === b.service_id;
    }

    getServiceOptionDisabledFunction(deviceType: FormGroup): ((option: { path: string; service_id: string; }) => boolean) {
        return ((option: { path: string; service_id: string; }) => {
            const selection = deviceType.get('selection')?.value as { path: string; service_id: string; }[] | null;
            if (selection === null) {
                return false;
            }
            return selection.findIndex(s => s.service_id === option.service_id && s.path !== option.path) !== -1;
        });
    }
}
