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
import {PipelineRegistryService} from '../shared/pipeline-registry.service';
import {OperatorInputTopic, PipelineModel} from '../shared/pipeline.model';
import {ActivatedRoute} from '@angular/router';
import {DomSanitizer} from '@angular/platform-browser';
import {DeviceTypeService} from '../../../metadata/device-types-overview/shared/device-type.service';
import {DeviceInstancesService} from '../../../devices/device-instances/shared/device-instances.service';
import {DeviceTypeServiceModel} from '../../../metadata/device-types-overview/shared/device-type.model';
import {DeviceInstancesBaseModel} from '../../../devices/device-instances/shared/device-instances.model';
import {util} from 'jointjs';
import string = util.format.string;

@Component({
    selector: 'senergy-pipeline-details',
    templateUrl: './pipeline-details.component.html',
    styleUrls: ['./pipeline-details.component.css']
})

export class PipelineDetailsComponent implements OnInit {

    ready = false;
    pipe = {} as PipelineModel;
    showAll = false;
    configs = new Map<string, [[string, string]]>();

    constructor(private route: ActivatedRoute, private pipelineRegistryService: PipelineRegistryService, private sanitizer: DomSanitizer,
                private deviceTypeService: DeviceTypeService, private deviceInstanceService: DeviceInstancesService) {
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.pipelineRegistryService.getPipeline(id).subscribe((resp: PipelineModel | null) => {
                if (resp !== null) {
                    this.pipe = resp;
                    this.pipe.operators.forEach(operator => {
                        if (operator.config) {
                            const c = [] as unknown as [[string, string]];
                            operator.config.forEach((value: string, key: string) => {
                                c.push([key, value]);
                            });
                            this.configs.set(operator.id, c);
                        }
                        operator.inputTopics.forEach(topic => {
                            if (topic.filterType === 'DeviceId') {
                                this.deviceTypeService.getDeviceService(topic.name.replace(/_/g, ':')).
                                subscribe((service: DeviceTypeServiceModel | null) => {
                                    if (service !== null) {
                                        topic.name = service.name;
                                    }
                                });
                                const devices = topic.filterValue.split(',');
                                for (const [i, value] of devices.entries()) {
                                    this.deviceInstanceService.getDeviceInstance(value).
                                    subscribe((device: DeviceInstancesBaseModel | null) => {
                                        if (device !== null) {
                                            devices[i] = device.name;
                                        }
                                        topic.devices = devices;
                                    });
                                }
                            }
                        });
                    });
                    if (typeof this.pipe.image === 'string') {
                        const parser = new DOMParser();
                        const svg = parser.parseFromString(this.pipe.image, 'image/svg+xml').getElementsByTagName('svg')[0];
                        // @ts-ignore
                        const viewbox = svg.getAttribute('viewbox').split(' ');
                        svg.setAttribute('height', viewbox[3]);
                        this.pipe.image = this.sanitizer.bypassSecurityTrustHtml(
                            new XMLSerializer().serializeToString(svg));
                    }
                }
                this.ready = true;
            });
        }
    }

    getConfigByOperatorId(id: string): [[string, string]] | undefined {
        if (this.configs.has(id)) {
                return this.configs.get(id);
        }
        return undefined;
    }

    show(topic: OperatorInputTopic) {
        return this.showAll || topic.filterType === 'DeviceId' || topic.filterValue.split(':').length === 2;
    }

    getOperatorPipelineStr(filterValue: string) {
        const splitted = filterValue.split(':');
        if (splitted.length !== 2) {
            return filterValue;
        }
        return 'Pipeline: ' + splitted[1] + ', Operator: ' + splitted[0];
    }
}

