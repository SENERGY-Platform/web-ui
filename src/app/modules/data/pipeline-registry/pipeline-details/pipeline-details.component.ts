/*
 * Copyright 2019 InfAI (CC SES)
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
import {PipelineModel} from '../shared/pipeline.model';
import {ActivatedRoute} from '@angular/router';

@Component({
    selector: 'senergy-pipeline-details',
    templateUrl: './pipeline-details.component.html',
    styleUrls: ['./pipeline-details.component.css']
})

export class PipelineDetailsComponent implements OnInit {

    ready = false;
    pipe = {} as PipelineModel;

    constructor(private route: ActivatedRoute, private pipelineRegistryService: PipelineRegistryService) {
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.pipelineRegistryService.getPipeline(id).subscribe((resp: PipelineModel | null) => {
                if (resp !== null) {
                    this.pipe = resp;
                }
                this.ready = true;
            });
        }
    }
}

