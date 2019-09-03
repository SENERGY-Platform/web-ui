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

import {Component} from '@angular/core';
import {ParserService} from '../shared/parser.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ConfigModel, ParseModel} from '../shared/parse.model';
import {DeviceInstancesModel} from '../../../devices/device-instances/shared/device-instances.model';
import {DeviceInstancesService} from '../../../devices/device-instances/shared/device-instances.service';
import {DeviceTypeAssignmentModel, DeviceTypeModel, DeviceTypeServiceModel} from '../../../devices/device-types/shared/device-type.model';
import {DeviceTypeService} from '../../../devices/device-types/shared/device-type.service';
import {FlowEngineService} from '../shared/flow-engine.service';
import {NodeInput, NodeModel, NodeValue, PipelineRequestModel} from './shared/pipeline-request.model';
import {MatSnackBar} from '@angular/material';
import {ValueTypesFieldTypeModel} from '../../../devices/value-types/shared/value-types.model';

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

    selectedValues = new Map();

    windowTime = 30;

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

        this.pipeReq = {id: this.id, name: '', description: '', nodes: [], windowTime: this.windowTime};

        this.parserService.getInputs(this.id).subscribe((resp: ParseModel []) => {
            this.inputs = resp;
            this.ready = true;
            this.inputs.map((value: ParseModel, key) => {
                this.pipeReq.nodes[key] = {nodeId: value.id, inputs: undefined,
                    config: undefined, deploymentType: value.deploymentType} as NodeModel;
                // create map for inputs
                if (value.inPorts !== undefined) {
                    value.inPorts.map((port: string) => {
                        if (!this.selectedValues.has(value.id)) {
                            this.selectedValues.set(value.id, new Map());
                        }
                        if (this.deviceTypes[value.id] === undefined) {
                            this.deviceTypes[value.id] = [];
                        }
                        if (this.paths[value.id] === undefined) {
                            this.paths[value.id] = [];
                        }
                        this.selectedValues.get(value.id).set(port, {
                            device: {} as DeviceInstancesModel,
                            service: {} as DeviceTypeServiceModel, path: ''
                        });
                        this.deviceTypes[value.id][port] = {} as DeviceTypeModel;
                    });
                }
                // create map for config
                if (value.config !== undefined) {
                    if (!this.selectedValues.has(value.id)) {
                        this.selectedValues.set(value.id, new Map());
                    }
                    value.config.map((config: ConfigModel) => {
                        if (!this.selectedValues.get(value.id).has('_config')) {
                            this.selectedValues.get(value.id).set('_config', new Map());
                        }
                        this.selectedValues.get(value.id).get('_config').set(config.name, '');
                    });
                }
                this.ready = true;
            });
        });
    }

    startPipeline() {
        const self = this;
        this.ready = false;
        this.pipeReq.nodes.forEach((node: NodeModel) => {
            for (const entry of this.selectedValues.get(node.nodeId).entries()) {
                if (entry[0] === '_config') {
                    if (node.config === undefined) {
                        node.config = [];
                    }
                    for (const config of entry[1].entries()) {
                        node.config.push({name: config[0], value: config [1]});
                    }
                } else {
                    if (entry[1].device.id !== undefined && entry[1].service.id !== undefined) {
                        const x = {name: entry [0], path: entry[1].path} as NodeValue;
                        const y = [] as NodeValue [];
                        y.push(x);
                        let z = {} as NodeInput;
                        if (node.deploymentType === 'local') {
                            z = {
                                deviceId: entry[1].device.id,
                                topicName: 'event/' + entry[1].device.uri + '/' + entry[1].service.url,
                                values: y
                            } as NodeInput;
                        } else {
                            z = {
                            deviceId: entry[1].device.id,
                            topicName: entry[1].service.id.replace(/#/g, '_'),
                            values: y
                            } as NodeInput;
                        }
                        if (node.inputs === undefined) {
                            node.inputs = [];
                        }
                        if (node.inputs.length > 0) {
                            let inserted = false;
                            let counter = 0;
                            const length = node.inputs.length;
                            // Try to add current entry to existing input
                            node.inputs.forEach((input: NodeInput) => {
                                counter++;
                                if (input.deviceId === entry[1].device.id) {
                                    if (input.values.length > 0) {
                                        input.values.push(x);
                                        inserted = true;
                                    }
                                }
                                if (counter === length && inserted === false && node.inputs) {
                                    // No existing input found for device ID, create new input
                                    node.inputs.push(z);
                                }
                            });
                        } else {
                            node.inputs.push(z);
                        }
                    }
                }
            }
        });

        this.pipeReq.windowTime = this.windowTime;
        this.pipeReq.name = this.name;
        this.pipeReq.description = this.description;
        this.flowEngineService.startPipeline(this.pipeReq).subscribe(function () {
            self.router.navigate(['/data/pipelines']);
            self.snackBar.open('Pipeline started', undefined, {
                duration: 2000,
            });
        });
    }

    loadDevices() {
        this.deviceInstanceService.getDeviceInstances('', 9999, 0, 'name', 'asc').subscribe((resp: DeviceInstancesModel []) => {
            this.devices = resp;
        });
    }

    deviceChanged(device: DeviceInstancesModel, inputId: string, port: string) {
        if (this.selectedValues.get(inputId).get(port).device !== device) {
            this.deviceTypeService.getDeviceType(device.devicetype).subscribe((resp: DeviceTypeModel | null) => {
                if (resp !== null) {
                    this.deviceTypes[inputId][port] = resp;
                    this.paths[inputId][port] = [];
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
            service.output.forEach((out: DeviceTypeAssignmentModel) => {
                if (out.type.fields != null) {
                    pathString += out.msg_segment.name;
                    out.type.fields.forEach((field: ValueTypesFieldTypeModel) => {
                        this.traverseDataStructure(pathString, field);
                    });
                }
            });
        } else {
            service.output.forEach((out: DeviceTypeAssignmentModel) => {
                if (out.type.fields != null) {
                    pathString += '.' + out.name;
                    out.type.fields.forEach((field: ValueTypesFieldTypeModel) => {
                        this.traverseDataStructure(pathString, field);
                    });
                }
            });
        }
        this.paths[inputId][port] = this.vals;
    }

    traverseDataStructure(pathString: string, field: ValueTypesFieldTypeModel) {
        if (field.type.base_type.split('#')[1] === 'structure' && field.type.fields !== undefined && field.type.fields !== null) {
            pathString += '.' + field.name;
            field.type.fields.forEach((innerField: ValueTypesFieldTypeModel) => {
                this.traverseDataStructure(pathString, innerField);
            });
        } else {
            this.vals.push(pathString + '.' + field.name);
        }
    }
}
