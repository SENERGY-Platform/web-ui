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

import {Component, OnInit, ViewChild} from '@angular/core';
import {PipelineModel} from './shared/pipeline.model';
import {PipelineRegistryService} from './shared/pipeline-registry.service';
import {FlowEngineService} from '../flow-repo/shared/flow-engine.service';
import {MatTable} from '@angular/material';

@Component({
    selector: 'senergy-pipeline-registry',
    templateUrl: './pipeline-registry.component.html',
    styleUrls: ['./pipeline-registry.component.css']
})

export class PipelineRegistryComponent implements OnInit {

    pipes: PipelineModel[] = [{id: 'sdfsdfsd', operators: []}];
    ready = false;
    displayedColumns: string[] = ['id', 'actions'];

    //@ViewChild(MatTable) private _table!: MatTable<PipelineModel>;

    constructor(private pipelineRegistryService: PipelineRegistryService, private flowEngineService: FlowEngineService) {
    }

    ngOnInit() {
        this.pipelineRegistryService.getPipelines().subscribe((resp: PipelineModel[]) => {
            this.pipes = resp;
            console.log(this.pipes);
            this.ready = true;
            //this._table.renderRows();
        });
    }

    deletePipeline(id: string) {
        this.flowEngineService.deletePipeline(id).subscribe();
    }
}