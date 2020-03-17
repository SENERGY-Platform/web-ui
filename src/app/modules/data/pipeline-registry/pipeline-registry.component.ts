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

import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {PipelineModel} from './shared/pipeline.model';
import {PipelineRegistryService} from './shared/pipeline-registry.service';
import {FlowEngineService} from '../flow-repo/shared/flow-engine.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import {MatTable} from '@angular/material/table';
import {MatSort} from '@angular/material/sort';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
    selector: 'senergy-pipeline-registry',
    templateUrl: './pipeline-registry.component.html',
    styleUrls: ['./pipeline-registry.component.css']
})

export class PipelineRegistryComponent implements OnInit, AfterViewInit {

    pipes = [] as PipelineModel [];
    ready = false;
    displayedColumns: string[] = ['id', 'name', 'createdat', 'info', 'delete'];

    @ViewChild(MatTable, {static: false}) table!: MatTable<PipelineModel>;
    @ViewChild(MatSort, {static: false}) sort!: MatSort;

    constructor(private pipelineRegistryService: PipelineRegistryService,
                private flowEngineService: FlowEngineService,
                public snackBar: MatSnackBar,
                private dialogsService: DialogsService) {
    }

    ngOnInit() {
        this.pipelineRegistryService.getPipelines('createdat:desc').subscribe((resp: PipelineModel[]) => {
            this.pipes = resp;
            this.ready = true;
        });
    }

    ngAfterViewInit() {
        this.sort.sortChange.subscribe(() => {
            this.ready = false;
            this.pipelineRegistryService.getPipelines(this.sort.active + ':' + this.sort.direction).subscribe((resp: PipelineModel[]) => {
                this.pipes = resp;
                this.ready = true;
            });
        });
    }

    deletePipeline(pipe: PipelineModel) {
        this.dialogsService.openDeleteDialog('pipeline').afterClosed().subscribe((deletePipeline: boolean) => {
            if (deletePipeline) {
                this.ready = false;
                this.flowEngineService.deletePipeline(pipe.id).subscribe();
                const index = this.pipes.indexOf(pipe);
                if (index > -1) {
                    this.pipes.splice(index, 1);
                }
                this.table.renderRows();
                this.ready = true;
                this.snackBar.open('Pipeline deleted', undefined, {
                    duration: 2000,
                });
            }
        });

    }
}
