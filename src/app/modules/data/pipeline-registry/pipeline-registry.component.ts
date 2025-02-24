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

import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { PipelineModel, PipelineStatus } from './shared/pipeline.model';
import { PipelineRegistryService } from './shared/pipeline-registry.service';
import { FlowEngineService } from '../flow-repo/shared/flow-engine.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { Sort, SortDirection } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { forkJoin, Observable, Subscription, concatMap, of, map, catchError} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UtilService } from 'src/app/core/services/util.service';

@Component({
    selector: 'senergy-pipeline-registry',
    templateUrl: './pipeline-registry.component.html',
    styleUrls: ['./pipeline-registry.component.css'],
})
export class PipelineRegistryComponent implements OnInit, AfterViewInit, OnDestroy {
    pageSize = 20;
    offset = 0;
    dataSource: MatTableDataSource<PipelineModel> = new MatTableDataSource();
    ready = false;
    displayedColumns: string[] = ['select', 'status', 'id', 'name', 'createdat', 'updatedat', 'info'];
    selection = new SelectionModel<PipelineModel>(true, []);
    totalCount = 0;
    searchSub: Subscription = new Subscription();
    sortBy = 'createdat';
    sortDirection: SortDirection = 'desc';
    search: string | undefined = undefined;

    userHasDeleteAuthorization = false;
    userHasUpdateAuthorization = false;

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    constructor(
        private pipelineRegistryService: PipelineRegistryService,
        private flowEngineService: FlowEngineService,
        public snackBar: MatSnackBar,
        private searchbarService: SearchbarService,
        private dialogsService: DialogsService,
        public utilsService: UtilService
    ) {}

    ngOnInit() {
        this.userHasDeleteAuthorization = this.flowEngineService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }

        this.userHasUpdateAuthorization = this.flowEngineService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.initSearch();
    }

    ngOnDestroy(){
        this.searchSub.unsubscribe();
    }

    initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            if (searchText != ''){
                this.search = searchText;
            } else {
                this.search = undefined;
            }
            this.loadPipelines().subscribe({
                next: (pipelines) => {
                    this.setPipelines(pipelines);
                }
            });
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.reload();
    }

    ngAfterViewInit() {
        this.paginator.page.subscribe(()=>{
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageIndex;
            this.loadPipelines().subscribe({
                next: (pipelines) => {
                    this.setPipelines(pipelines);
                }
            });
        });
    }

    loadPipelines(): Observable<PipelineModel[]> {
        this.ready = false;
        const order = this.sortBy + ':' + this.sortDirection;
        return this.pipelineRegistryService.getPipelinesNew(order, this.pageSize, this.offset, this.search).pipe(
            concatMap((pipelines) => {
                this.totalCount = pipelines!.total;
                if(pipelines!.data.length === 0) {
                    return of([]);
                }
                return this.flowEngineService.getPipelinesStatus().pipe(
                    map((response) => {
                        pipelines?.data.forEach(pipeline => {
                            pipeline.status = response.find(status => status.name === pipeline.id);
                        });
                        return pipelines!.data;
                    })
                );
            })
        );
    }

    setPipelines(pipelines: PipelineModel[]) {
        this.dataSource.data = pipelines;
        this.ready = true;
    }

    reload() {
        this.selectionClear();
        this.loadPipelines().subscribe({
            next: (pipelines) => {
                this.setPipelines(pipelines);
            },
            error: (_) => {
                this.ready = true;
            }
        });
    }

    deletePipeline(pipe: PipelineModel) {
        this.dialogsService
            .openDeleteDialog('pipeline')
            .afterClosed()
            .pipe(
                concatMap((deletePipeline: boolean) => {
                    if (deletePipeline) {
                        return this.flowEngineService.deletePipeline(pipe.id);
                    }
                    return of();
                })
            ).subscribe({
                next: (_) => {
                    this.reload();
                    this.snackBar.open('Pipeline deleted', undefined, {
                        duration: 2000,
                    });
                },
                error: (err) => {
                    this.snackBar.open('Error while deleting pipeline!: ' + err, 'close', {panelClass: 'snack-bar-error'});
                    this.reload();
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
        const deletionJobs: Observable<any>[] = [];
        const text = this.selection.selected.length + (this.selection.selected.length > 1 ? ' pipelines' : ' pipeline');

        this.dialogsService
            .openDeleteDialog(text)
            .afterClosed()
            .subscribe((deletePipelines: boolean) => {
                if (deletePipelines) {
                    this.ready = false;
                    this.selection.selected.forEach((pipeline: PipelineModel) => {
                        deletionJobs.push(this.flowEngineService.deletePipeline(pipeline.id));
                    });
                }

                forkJoin(deletionJobs).subscribe(
                    {
                        next: (_) => {
                            this.snackBar.open(text + ' deleted successfully.', undefined, {duration: 2000});
                            this.reload();
                        },
                        error: (err) => {
                            this.snackBar.open('Error while deleting ' + text + '!: ' + err, 'close', {panelClass: 'snack-bar-error'});
                            this.reload();
                        }
                    });
            });
    }
}
