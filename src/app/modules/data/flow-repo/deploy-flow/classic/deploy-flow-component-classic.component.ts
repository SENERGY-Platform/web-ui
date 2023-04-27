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

import { Component } from '@angular/core';
import { ParserService } from '../../shared/parser.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigModel, ParseModel } from '../../shared/parse.model';
import { DeviceInstancesModel } from '../../../../devices/device-instances/shared/device-instances.model';
import { DeviceInstancesService } from '../../../../devices/device-instances/shared/device-instances.service';
import {
    DeviceTypeContentModel,
    DeviceTypeContentVariableModel,
    DeviceTypeModel,
    DeviceTypeServiceModel,
} from '../../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { FlowEngineService } from '../../shared/flow-engine.service';
import { NodeInput, NodeModel, NodeValue, PipelineRequestModel } from '../shared/pipeline-request.model';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

@Component({
    selector: 'senergy-deploy-flow-classic',
    templateUrl: './deploy-flow-component-classic.component.html',
    styleUrls: ['./deploy-flow-component-classic.component.css'],
})
export class DeployFlowClassicComponent {
    ready = false;
    inputs: ParseModel[] = [];
    id = '' as string;
    name = '';
    description = '';

    deviceTypes = [] as any;
    paths = [] as any;

    allDevices: DeviceInstancesModel[] = [];
    devices: DeviceInstancesModel[][][] = [[[]]];

    Arr = Array;

    selectedValues = new Map();

    windowTime = 30;

    mergeStrategy = 'inner';

    allMessages = false;

    metrics = false;

    vals = [] as string[];

    pipeReq: PipelineRequestModel = {} as PipelineRequestModel;

    constructor(
        private parserService: ParserService,
        private route: ActivatedRoute,
        private router: Router,
        public snackBar: MatSnackBar,
        private deviceInstanceService: DeviceInstancesService,
        private deviceTypeService: DeviceTypeService,
        private flowEngineService: FlowEngineService,
    ) {
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.id = id;
        }

        this.pipeReq = {
            id: null,
            flowId: this.id,
            name: '',
            description: '',
            nodes: [],
            windowTime: this.windowTime,
            mergeStrategy: this.mergeStrategy,
            metrics: this.metrics,
            consumeAllMessages: this.allMessages,
        };

        this.parserService.getInputs(this.id).subscribe((resp: ParseModel[]) => {
            this.inputs = resp;
            this.deviceInstanceService.getDeviceInstances(9999, 0, 'name', 'asc').subscribe((devices: DeviceInstancesModel[]) => {
                devices = this.deviceInstanceService.useDisplayNameAsName(devices) as DeviceInstancesModel[];
                this.allDevices = devices;
                this.inputs?.forEach((input, operatorKey) => {
                    this.devices[operatorKey] = [];
                    input.inPorts?.forEach((_, deviceKey) => {
                        this.devices[operatorKey][deviceKey] = devices;
                    });
                });
            });
            this.createMappingVars();
            this.ready = true;
        });
    }

    trimExtendedId(id: string): string{
        return id.split('$')[0];
    }

    startPipeline() {
        const self = this;
        this.ready = false;
        this.pipeReq.nodes.forEach((pipeReqNode: NodeModel) => {
            pipeReqNode.config = [];
            pipeReqNode.inputs = [];
            for (const formDeviceEntry of this.selectedValues.get(pipeReqNode.nodeId).entries()) {
                const nodeValues = [] as NodeValue[];
                const operatorFieldName = formDeviceEntry[0];
                const formDeviceInfo: { device: DeviceInstancesModel[]; service: DeviceTypeServiceModel; path: string } =
                    formDeviceEntry[1];

                // check if device and service are selected
                if (operatorFieldName === '_config') {
                    for (const config of formDeviceEntry[1].entries()) {
                        pipeReqNode.config.push({ name: config[0], value: config[1] });
                    }
                } else {
                    let deviceIds = '';
                    formDeviceInfo.device.forEach((device) => {
                        if (deviceIds === '') {
                            deviceIds = this.trimExtendedId(device.id);
                        } else {
                            deviceIds += ',' + this.trimExtendedId(device.id);
                        }
                    });
                    // parse input of form fields
                    const nodeValue = { name: operatorFieldName, path: formDeviceInfo.path } as NodeValue;
                    nodeValues.push(nodeValue);

                    // add values from input form
                    const nodeInput = {
                        filterIds: deviceIds,
                        filterType: 'devcieId',
                        values: nodeValues,
                    } as NodeInput;

                    // check if node is local or cloud and set input topic accordingly
                    if (pipeReqNode.deploymentType === 'local') {
                        formDeviceInfo.device.forEach((device: DeviceInstancesModel) => {
                            if (nodeInput.topicName === undefined) {
                                nodeInput.topicName = 'event/' + device.local_id + '/' + formDeviceInfo.service.local_id;
                            } else {
                                nodeInput.topicName += ',event/' + device.local_id + '/' + formDeviceInfo.service.local_id;
                            }
                        });
                    } else {
                        if (formDeviceInfo.service !== undefined && formDeviceInfo.service.id !== undefined) {
                            nodeInput.topicName = formDeviceInfo.service.id.replace(/#/g, '_').replace(/:/g, '_');
                        }
                    }
                    this.populateRequestNodeInputs(pipeReqNode, deviceIds, nodeValue, nodeInput);
                }
            }
        });

        this.pipeReq.windowTime = this.windowTime;
        this.pipeReq.consumeAllMessages = this.allMessages;
        this.pipeReq.metrics = this.metrics;
        this.pipeReq.name = this.name;
        this.pipeReq.description = this.description;
        this.ready = true;
        this.flowEngineService.startPipeline(this.pipeReq).subscribe(function() {
            self.router.navigate(['/data/pipelines']);
            self.snackBar.open('Pipeline started', undefined, {
                duration: 2000,
            });
        });
    }

    deviceChanged(device: DeviceInstancesModel[], inputId: string, port: string, operatorKey: number, deviceKey: number) {
        if (device.length === 0) {
            this.devices[operatorKey][deviceKey] = this.allDevices;
        } else {
            this.deviceTypeService.getDeviceType(device[0].device_type.id).subscribe((resp: DeviceTypeModel | null) => {
                if (resp !== null) {
                    this.deviceTypes[inputId][port] = resp;
                    this.paths[inputId][port] = [];
                    this.devices[operatorKey][deviceKey] = this.devices[operatorKey][deviceKey].filter(function(dev) {
                        return dev.device_type.id === device[0].device_type.id;
                    });
                }
            });
        }
    }

    serviceChanged(service: DeviceTypeServiceModel, inputId: string, port: string) {
        const input = this.inputs.find((x) => x.id === inputId);
        this.vals = [];
        let pathString = 'value';
        if (input !== undefined && input.deploymentType === 'local') {
            pathString = '';
            service.outputs.forEach((out: DeviceTypeContentModel) => {
                this.traverseDataStructure(pathString, out.content_variable, true);
            });
        } else {
            service.outputs.forEach((out: DeviceTypeContentModel) => {
                this.traverseDataStructure(pathString, out.content_variable, false);
            });
        }
        this.paths[inputId][port] = this.vals;
    }

    private createMappingVars() {
        this.inputs.map((parseModel: ParseModel, key) => {
            this.pipeReq.nodes[key] = {
                nodeId: parseModel.id,
                inputs: undefined,
                config: undefined,
                deploymentType: parseModel.deploymentType,
            } as NodeModel;
            // create map for inputs
            if (parseModel.inPorts !== undefined) {
                parseModel.inPorts.map((port: string, _) => {
                    if (!this.selectedValues.has(parseModel.id)) {
                        this.selectedValues.set(parseModel.id, new Map());
                    }
                    if (this.deviceTypes[parseModel.id] === undefined) {
                        this.deviceTypes[parseModel.id] = [];
                    }
                    if (this.paths[parseModel.id] === undefined) {
                        this.paths[parseModel.id] = [];
                    }
                    this.selectedValues.get(parseModel.id).set(port, {
                        device: [] as DeviceInstancesModel[],
                        service: {} as DeviceTypeServiceModel,
                        path: '',
                    });
                    this.deviceTypes[parseModel.id][port] = {} as DeviceTypeModel;
                });
            }
            // create map for config
            if (parseModel.config !== undefined) {
                if (!this.selectedValues.has(parseModel.id)) {
                    this.selectedValues.set(parseModel.id, new Map());
                }
                parseModel.config.map((config: ConfigModel) => {
                    if (!this.selectedValues.get(parseModel.id).has('_config')) {
                        this.selectedValues.get(parseModel.id).set('_config', new Map());
                    }
                    this.selectedValues.get(parseModel.id).get('_config').set(config.name, '');
                });
            }
        });
    }

    private populateRequestNodeInputs(pipeReqNode: NodeModel, deviceIds: string, nodeValue: NodeValue, nodeInput: NodeInput) {
        if (pipeReqNode.inputs !== undefined) {
            if (pipeReqNode.inputs.length > 0) {
                let inserted = false;
                let counter = 0;
                const length = pipeReqNode.inputs.length;
                // Try to add current entry to existing input
                pipeReqNode.inputs.forEach((pipeReqNodeInput: NodeInput) => {
                    counter++;
                    if (pipeReqNodeInput.filterIds === deviceIds && pipeReqNodeInput.topicName === nodeInput.topicName) {
                        if (pipeReqNodeInput.values.length > 0) {
                            pipeReqNodeInput.values.push(nodeValue);
                            inserted = true;
                        }
                    }
                    if (counter === length && !inserted && pipeReqNode.inputs) {
                        // No existing input found for device ID, create new input
                        pipeReqNode.inputs.push(nodeInput);
                    }
                });
            } else {
                pipeReqNode.inputs.push(nodeInput);
            }
        }
    }

    private traverseDataStructure(pathString: string, field: DeviceTypeContentVariableModel, isLocal: boolean) {
        if (field.type === 'https://schema.org/StructuredValue' && field.type !== undefined && field.type !== null) {
            if (pathString !== '') {
                pathString += '.' + field.name;
            } else {
                if (field.name !== undefined) {
                    pathString = field.name;
                }
            }
            if (field.sub_content_variables !== undefined) {
                field.sub_content_variables.forEach((innerField: DeviceTypeContentVariableModel) => {
                    this.traverseDataStructure(pathString, innerField, isLocal);
                });
            }
        } else {
            let out = pathString + '.' + field.name;
            if (isLocal) {
                out = (pathString + '.' + field.name).split(/\.(.+)/)[1];
            }
            this.vals.push(out);
        }
    }
}
