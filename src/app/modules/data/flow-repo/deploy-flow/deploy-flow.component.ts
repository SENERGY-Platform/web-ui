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

import {Component, OnInit} from '@angular/core';
import {ParserService} from '../shared/parser.service';
import {ActivatedRoute} from '@angular/router';
import {ParseModel} from '../shared/parse.model';
import {DeviceInstancesModel} from '../../../devices/device-instances/shared/device-instances.model';
import {DeviceInstancesService} from '../../../devices/device-instances/shared/device-instances.service';
import {DeviceTypeModel} from '../../../devices/device-types/shared/device-type.model';
import {DeviceTypeService} from '../../../devices/device-types/shared/device-type.service';

@Component({
    selector: 'senergy-deploy-flow',
    templateUrl: './deploy-flow.component.html',
    styleUrls: ['./deploy-flow.component.css']
})
export class DeployFlowComponent implements OnInit {

    ready = false;
    inputs: ParseModel[] = [];

    deviceTypes = [] as DeviceTypeModel [];
    devices: DeviceInstancesModel [] = [];

    constructor(private parserService: ParserService,
                private route: ActivatedRoute,
                private deviceInstanceService: DeviceInstancesService,
                private deviceTypeService: DeviceTypeService,
    ) {
    }

    ngOnInit() {
        this.loadDevices();
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.parserService.getInputs(id).subscribe((resp: ParseModel []) => {
                this.inputs = resp;
                this.ready = true;
                this.inputs.forEach((_, index) => {
                    this.deviceTypes [index] = {} as DeviceTypeModel;
                });
            });
        }
    }

    startPipeline() {
        console.log(this.inputs);
    }

    loadDevices() {
        this.deviceInstanceService.getDeviceInstances('', 50, 0, 'name', 'asc').subscribe((resp: DeviceInstancesModel []) => {
            this.devices = resp;
        });
    }

    deviceChanged(device: DeviceInstancesModel, key: number) {
        if (this.inputs[key].device !== device.name) {
            this.deviceTypeService.getDeviceType(device.devicetype).subscribe((resp: DeviceTypeModel | null) => {
                if (resp !== null) {
                    this.deviceTypes[key] = resp;
                }
            });
        }
    }
}
