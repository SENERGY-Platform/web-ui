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

import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { PipelineModel } from './shared/pipeline.model';
import { PipelineRegistryService } from './shared/pipeline-registry.service';
import { FlowEngineService } from '../flow-repo/shared/flow-engine.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { MatLegacyTable as MatTable } from '@angular/material/legacy-table';
import { MatSort } from '@angular/material/sort';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';

@Component({
    selector: 'senergy-pipeline-registry',
    templateUrl: './pipeline-registry.component.html',
    styleUrls: ['./pipeline-registry.component.css'],
})
export class PipelineRegistryComponent implements OnInit, AfterViewInit {
    readonly pageSize = 20;
    dataSource: MatTableDataSource<PipelineModel> = new MatTableDataSource();
    ready = false;
    displayedColumns: string[] = ['select', 'id', 'name', 'createdat', 'updatedat', 'info', 'edit', 'delete'];
    selection = new SelectionModel<PipelineModel>(true, []);
    totalCount = 200;

    @ViewChild(MatSort, { static: false }) sort!: MatSort;

    constructor(
        private pipelineRegistryService: PipelineRegistryService,
        private flowEngineService: FlowEngineService,
        public snackBar: MatSnackBar,
        private dialogsService: DialogsService,
    ) {}

    ngOnInit() {
        this.pipelineRegistryService.getPipelines('createdat:desc').subscribe((resp: PipelineModel[]) => {
            this.dataSource.data = resp;
            this.ready = true;
        });
    }

    ngAfterViewInit() {
        this.sort.sortChange.subscribe(() => {
            this.ready = false;
            this.pipelineRegistryService.getPipelines(this.sort.active + ':' + this.sort.direction).subscribe((resp: PipelineModel[]) => {
                this.dataSource.data = resp;
                this.ready = true;
            });
        });
    }

    deletePipeline(pipe: PipelineModel) {
        this.dialogsService
            .openDeleteDialog('pipeline')
            .afterClosed()
            .subscribe((deletePipeline: boolean) => {
                if (deletePipeline) {
                    this.ready = false;
                    this.flowEngineService.deletePipeline(pipe.id).subscribe();
                    const index = this.dataSource.data.indexOf(pipe);
                    if (index > -1) {
                        this.dataSource.data.splice(index, 1);
                    }
                    this.ready = true;
                    this.snackBar.open('Pipeline deleted', undefined, {
                        duration: 2000,
                    });
                }
            });
    }

    isEditable(pipe: PipelineModel): boolean {
        return pipe.operators.findIndex((op) => op.inputSelections !== undefined && op.inputSelections.length > 0) !== -1;
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.dataSource.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.dataSource.connect().value.forEach((row) => this.selection.select(row));
        }
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems() {
    }
}
