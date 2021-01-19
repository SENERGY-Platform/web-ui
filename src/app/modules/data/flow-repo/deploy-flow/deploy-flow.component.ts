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
import {DeviceInstancesModel} from '../../../devices/device-instances/shared/device-instances.model';
import {DeviceInstancesService} from '../../../devices/device-instances/shared/device-instances.service';
import {
    DeviceTypeAspectModel,
    DeviceTypeFunctionModel
} from '../../../devices/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../devices/device-types-overview/shared/device-type.service';
import {FlowEngineService} from '../shared/flow-engine.service';
import {NodeConfig, NodeModel, NodeValue, PipelineRequestModel} from './shared/pipeline-request.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {map} from 'rxjs/operators';
import {Observable} from 'rxjs/index';
import {of} from 'rxjs';
import {DeviceGroupsService} from '../../../devices/device-groups/shared/device-groups.service';
import {PathOptionsService} from '../shared/path-options.service';
import {AbstractControl, FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {DeviceTypePermSearchModel} from '../../../devices/device-types-overview/shared/device-type-perm-search.model';
import {MatOption} from '@angular/material/core';

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
    selectables = new Map<string, Map<string, CustomSelectable[]>>();
    deviceGroupDevices = new Map<string, string[]>();
    serviceOptions: Map<string, Map<string, Map<string, Map<string, { path: string; service_id: string; }[]>>>> = new Map();
    serviceIdToName = new Map<string, string>();


    form = this.fb.group({
        name: '',
        description: '',
        nodes: this.fb.array([]),
        windowTime: 30,
        enable_metrics: false,
        consume_all_msgs: false,
    });

    ngOnInit() {
        this.form.valueChanges.subscribe(val => console.log(val)); // TODO

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
                this.loadSelectables(inputGroup.get('aspectId')?.value, functionId).subscribe();
                inputGroup.patchValue({
                    selectableId: '',
                });
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

    loadSelectables(aspect_id: string, function_id: string): Observable<Map<string, CustomSelectable[]>> {
        if (function_id.length === 0) {
            return of(new Map());
        }
        if (this.selectables.has(aspect_id + function_id)) {
            return of(this.selectables.get(aspect_id + function_id) || new Map());
        }
        return this.deviceInstanceService.getDeviceSelectionsWithGroups([{
            function_id,
            aspect_id
        }], false).pipe(map(selectables => {
            const m: Map<string, CustomSelectable[]> = new Map();
            m.set(DeployFlowComponent.DEVICE_KEY, []);
            m.set(DeployFlowComponent.GROUP_KEY, []);
            selectables.forEach(selectable => {
                if (selectable.device !== undefined && selectable.device !== null) {
                    m.get(DeployFlowComponent.DEVICE_KEY)?.push({
                        id: selectable.device.id, name: selectable.device.name
                    });
                    selectable.services?.forEach(service => {
                        this.serviceIdToName.set(service.id, service.name);
                    });
                } else if (selectable.device_group !== undefined && selectable.device_group !== null) {
                    m.get(DeployFlowComponent.GROUP_KEY)?.push({
                        id: selectable.device_group.id,
                        name: selectable.device_group.name
                    });
                }
            });
            this.selectables.set(aspect_id + function_id, m);
            return m;
        }));
    }

    getSelectables(aspect_id: string, function_id: string): Map<string, CustomSelectable[]> {
        return this.selectables.get(aspect_id + function_id) || new Map();
    }

    selectableSelected(input: FormGroup, selectableId: string) {
        if (selectableId.startsWith('urn:infai:ses:device-group:')) {
            if (!this.deviceGroupDevices.has(selectableId)) {
                // unknown device group
                this.deviceGroupsService.getDeviceGroup(selectableId).subscribe(group => {
                    if (group === null) {
                        console.error('Selected group does not exist!');
                        return;
                    }
                    this.deviceGroupDevices.set(selectableId, group.device_ids);
                    const devices = this.getDeviceInstances(group.device_ids);
                    input.patchValue({devices});
                    this.preparePathOptions(input, devices);
                });
            } else {
                // known device group
                const devices = this.getDeviceInstances(this.deviceGroupDevices.get(selectableId) || []);
                input.patchValue({devices});
                this.preparePathOptions(input, devices);
            }
        } else {
            // single device
            const devices = this.getDeviceInstances([selectableId]);
            input.patchValue({devices});
            this.preparePathOptions(input, devices);
        }
    }

    private getDeviceInstances(ids: string[]): DeviceInstancesModel[] {
        return this.allDevices.filter(d => ids.findIndex(id => id === d.id) !== -1);
    }

    private preparePathOptions(input: FormGroup, devices: DeviceInstancesModel[]) {
        const functionId = input.get('functionId')?.value;
        const aspectId = input.get('aspectId')?.value;
        const deviceTypeIds = devices.map(x => x.device_type.id);
        let missingDeviceTypes = deviceTypeIds.filter(deviceTypeId => {
            const known = this.serviceOptions.get(aspectId)?.get(functionId)?.get(deviceTypeId);
            if (known === undefined || known.size === 0) {
                return true;
            }
            return false;
        });
        missingDeviceTypes = missingDeviceTypes.filter((t, index) => missingDeviceTypes.findIndex(t2 => t2 === t) === index); // unique

        if (missingDeviceTypes.length === 0) {
            return;
        }
        if (!this.serviceOptions.has(aspectId)) {
            this.serviceOptions.set(aspectId, new Map());
        }
        if (!this.serviceOptions.get(aspectId)?.get(functionId)) {
            this.serviceOptions.get(aspectId)?.set(functionId, new Map());
        }
        this.pathOptionsService.getPathOptions(missingDeviceTypes, functionId,
            aspectId).subscribe(optionMap => {
            optionMap.forEach((pathOptions, deviceTypeId) => {
                const m = new Map<string, { path: string; service_id: string; }[]>();
                pathOptions.forEach(pathOption => {
                    const pathes: { path: string; service_id: string; }[] = [];
                    pathOption.json_path.forEach(path => {
                        pathes.push({path, service_id: pathOption.service_id});
                    });
                    m.set(this.serviceIdToName.get(pathOption.service_id) || pathOption.service_id, pathes);
                });
                this.serviceOptions.get(aspectId)?.get(functionId)?.set(deviceTypeId, m);
            });
        });
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
        const preparedOptions = this.serviceOptions.get(aspectId)?.get(functionId)?.get(deviceType.id);
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
        let foundOne = false;
        let foundTwo = false;
        serviceOptions.forEach(v => {
            if (v.length > 0) {
                if (foundOne) {
                    foundTwo = true;
                }
                foundOne = true;
            }
        });
        return !foundTwo;
    }

    getServiceTriggerValue(selection: MatOption | MatOption[] | undefined): string {
        if (Array.isArray(selection)) {
            return 'Err'; // multiple should never be set here
        }
        return selection?.group.label + ': ' + selection?.value.path;
    }

}
