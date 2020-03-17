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

import {Component} from '@angular/core';
import {ParserService} from '../shared/parser.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ConfigModel, ParseModel} from '../shared/parse.model';
import {DeviceInstancesModel} from '../../../devices/device-instances/shared/device-instances.model';
import {DeviceInstancesService} from '../../../devices/device-instances/shared/device-instances.service';
import {
    DeviceTypeContentModel, DeviceTypeContentVariableModel,
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../devices/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../devices/device-types-overview/shared/device-type.service';
import {FlowEngineService} from '../shared/flow-engine.service';
import {NodeInput, NodeModel, NodeValue, PipelineRequestModel} from './shared/pipeline-request.model';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
    selector: 'senergy-deploy-flow',
    templateUrl: './deploy-flow.component.html',
    styleUrls: ['./deploy-flow.component.css']
})

export class DeployFlowComponent {

    ready = false;
    inputs: ParseModel[] = [];
    id = '' as string;
    name = '';
    description = '';

    deviceTypes = [] as any;
    paths = [] as any;
    devices: DeviceInstancesModel [] = [];
    filteredDevices: DeviceInstancesModel [] = [];

    Arr = Array;
    additionalDevices = [] as any;

    selectedValues = new Map();

    windowTime = 30;

    allMessages = false;

    metrics = false;

    vals = [] as string [];

    pipeReq: PipelineRequestModel = {} as PipelineRequestModel;

    constructor(private parserService: ParserService,
                private route: ActivatedRoute,
                private router: Router,
                public snackBar: MatSnackBar,
                private deviceInstanceService: DeviceInstancesService,
                private deviceTypeService: DeviceTypeService,
                private flowEngineService: FlowEngineService
    ) {
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.id = id;
        }
        this.loadDevices();

        this.pipeReq = {id: this.id, name: '', description: '', nodes: [], windowTime: this.windowTime, metrics: this.metrics,
            consumeAllMessages: this.allMessages};

        this.parserService.getInputs(this.id).subscribe((resp: ParseModel []) => {
            this.inputs = resp;
            this.ready = true;
            this.createMappingVars();
        });
    }

    startPipeline() {
        const self = this;
        this.ready = false;
        this.pipeReq.nodes.forEach((pipeReqNode: NodeModel) => {
            pipeReqNode.config = [];
            for (const entry of this.selectedValues.get(pipeReqNode.nodeId).entries()) {
                // check if device and service are selected
                if (entry[0] === '_config') {
                    for (const config of entry[1].entries()) {
                        pipeReqNode.config.push({name: config[0], value: config [1]});
                    }
                } else {
                    let deviceIds = '';
                    for (let x = 0; x < entry[1].device.length; x++) {
                        if (x === 0) {
                            deviceIds = entry[1].device[x].id;
                        } else {
                            deviceIds += ',' + entry[1].device[x].id;
                        }
                    }
                    // parse input of form fields
                    const nodeValue = {name: entry [0], path: entry[1].path} as NodeValue;
                    const nodeValues = [] as NodeValue [];
                    nodeValues.push(nodeValue);
                    // add values from input form
                    const nodeInput = {
                        deviceId: deviceIds,
                        values: nodeValues
                    } as NodeInput;

                    // check if node is local or cloud and set input topic accordingly
                    if (pipeReqNode.deploymentType === 'local') {
                        nodeInput.topicName = 'event/' + entry[1].device.uri + '/' + entry[1].service.url;
                    } else {
                        nodeInput.topicName = entry[1].service.id.replace(/#/g, '_').replace(/:/g, '_');
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

        this.flowEngineService.startPipeline(this.pipeReq).subscribe(function () {
            self.router.navigate(['/data/pipelines']);
            self.snackBar.open('Pipeline started', undefined, {
                duration: 2000,
            });
        });
    }

    addAdditionalDevice() {
        this.additionalDevices.push(true);
    }

    removeAdditionalDevice(input: ParseModel, port: string, key: number) {
        if (key > -1) {
            this.selectedValues.get(input.id).get(port).device.splice(key + 1, 1);
            this.additionalDevices.splice(key, 1);
        }
    }

    deviceChanged(device: DeviceInstancesModel, inputId: string, port: string) {
        if (this.selectedValues.get(inputId).get(port).device !== device) {
            this.deviceTypeService.getDeviceType(device.device_type.id).subscribe((resp: DeviceTypeModel | null) => {
                if (resp !== null) {
                    this.deviceTypes[inputId][port] = resp;
                    this.paths[inputId][port] = [];
                    this.filteredDevices = this.devices.filter(function (dev) {
                            return dev.device_type.id === device.device_type.id;
                        }
                    );
                }
            });
        }
    }

    serviceChanged(service: DeviceTypeServiceModel, inputId: string, port: string) {
        const input = this.inputs.find(x => x.id === inputId);
        this.vals = [];
        let pathString = 'value';
        if (input !== undefined && input.deploymentType === 'local') {
            pathString = '';
            service.outputs.forEach((out: DeviceTypeContentModel) => {
                this.traverseDataStructure(pathString, out.content_variable);
            });
        } else {
            service.outputs.forEach((out: DeviceTypeContentModel) => {
                this.traverseDataStructure(pathString, out.content_variable);
            });
        }
        this.paths[inputId][port] = this.vals;
    }

    private createMappingVars() {
        this.inputs.map((parseModel: ParseModel, key) => {
            this.pipeReq.nodes[key] = {
                nodeId: parseModel.id, inputs: undefined,
                config: undefined, deploymentType: parseModel.deploymentType
            } as NodeModel;
            // create map for inputs
            if (parseModel.inPorts !== undefined) {
                parseModel.inPorts.map((port: string) => {
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
                        device: [] as DeviceInstancesModel [],
                        service: {} as DeviceTypeServiceModel,
                        path: ''
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
            this.ready = true;
        });
    }

    private populateRequestNodeInputs(pipeReqNode: NodeModel, deviceIds: string, nodeValue: NodeValue, nodeInput: NodeInput) {
        pipeReqNode.inputs = [];
        if (pipeReqNode.inputs.length > 0) {
            let inserted = false;
            let counter = 0;
            const length = pipeReqNode.inputs.length;
            // Try to add current entry to existing input
            pipeReqNode.inputs.forEach((pipeReqNodeInput: NodeInput) => {
                counter++;
                if (pipeReqNodeInput.deviceId === deviceIds) {
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

    private loadDevices() {
        this.deviceInstanceService.getDeviceInstances('', 9999, 0, 'name', 'asc').subscribe((resp: DeviceInstancesModel []) => {
            this.devices = resp;
        });
    }

    private traverseDataStructure(pathString: string, field: DeviceTypeContentVariableModel) {
        if (field.type === 'https://schema.org/StructuredValue' && field.type !== undefined && field.type !== null) {
            pathString += '.' + field.name;
            if (field.sub_content_variables !== undefined) {
                field.sub_content_variables.forEach((innerField: DeviceTypeContentVariableModel) => {
                    this.traverseDataStructure(pathString, innerField);
                });
            }
        } else {
            this.vals.push(pathString + '.' + field.name);
        }
    }
}
