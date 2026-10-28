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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { PipelineRegistryService } from '../shared/pipeline-registry.service';
import { isPipelineEditable, OperatorInputTopic, PipelineModel } from '../shared/pipeline.model';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceInstancesService } from '../../../devices/device-instances/shared/device-instances.service';
import { DeviceTypeServiceModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceInstanceModel} from '../../../devices/device-instances/shared/device-instances.model';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { fitSvgImageHeight, parseSvgImage, svgImageDataUrl } from '../../../../core/svg-image';
import { FlowEngineService } from '../../flow-repo/shared/flow-engine.service';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../../core/components/form-section/form-section.component';
import { SpinnerComponent } from '../../../../core/components/spinner/spinner.component';

@Component({
    selector: 'senergy-pipeline-details',
    templateUrl: './pipeline-details.component.html',
    styleUrls: ['./pipeline-details.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatButton, MatIcon, RouterLink, MatCheckbox, FormsModule, PageHeaderComponent, FormSectionComponent, SpinnerComponent]
})
export class PipelineDetailsComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private pipelineRegistryService = inject(PipelineRegistryService);
    private deviceTypeService = inject(DeviceTypeService);
    private deviceInstanceService = inject(DeviceInstancesService);
    private flowEngineService = inject(FlowEngineService);

    ready = false;
    pipe = {} as PipelineModel;
    imageUrl: string | null = null;
    showAll = false;
    configs = new Map<string, [[string, string]]>();
    /** Whether the Edit action is offered: the same two conditions as the Edit entry of the pipeline list. */
    canEdit = false;

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.pipelineRegistryService.getPipeline(id).subscribe((resp: PipelineModel | null) => {
                if (resp !== null) {
                    this.pipe = resp;
                    this.canEdit = this.flowEngineService.userHasUpdateAuthorization() && isPipelineEditable(resp);
                    this.pipe.operators.forEach((operator) => {
                        if (operator.config) {
                            const c = [] as unknown as [[string, string]];
                            operator.config.forEach((value: string, key: string) => {
                                c.push([key, value]);
                            });
                            this.configs.set(operator.id, c);
                        }
                        operator.inputTopics.forEach((topic) => {
                            if (topic.filterType === 'DeviceId') {
                                this.deviceTypeService
                                    .getDeviceService(topic.name.replace(/_/g, ':'))
                                    .subscribe((service: DeviceTypeServiceModel | null) => {
                                        if (service !== null) {
                                            topic.name = service.name;
                                        }
                                    });
                                const devices = topic.filterValue.split(',');
                                for (const [i, value] of devices.entries()) {
                                    this.deviceInstanceService
                                        .getDeviceInstance(value)
                                        .subscribe((device: DeviceInstanceModel | null) => {
                                            if (device !== null) {
                                                devices[i] = device.display_name || device.name;
                                            }
                                            topic.devices = devices;
                                        });
                                }
                            }
                        });
                    });
                    const svg = parseSvgImage(this.pipe.image);
                    if (svg !== null) {
                        fitSvgImageHeight(svg);
                        this.imageUrl = svgImageDataUrl(svg);
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
