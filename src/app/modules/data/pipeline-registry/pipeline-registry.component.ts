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

import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FilterSelection, PipelineModel} from './shared/pipeline.model';
import { PipelineRegistryService } from './shared/pipeline-registry.service';
import { FlowEngineService } from '../flow-repo/shared/flow-engine.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { Sort, SortDirection } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { forkJoin, Observable, Subscription, concatMap, of, map } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UtilService } from 'src/app/core/services/util.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import {PermissionsV2RightsAndIdModel} from '../../permissions/shared/permissions-resource.model';
import {PermissionsService} from '../../permissions/shared/permissions.service';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {MatDialog} from '@angular/material/dialog';
import {PipelineFilterDialogComponent} from './pipeline-filter-dialog/pipeline-filter-dialog.component';
import {ActivatedRoute, Params, Router} from '@angular/router';

@Component({
    selector: 'senergy-pipeline-registry',
    templateUrl: './pipeline-registry.component.html',
    styleUrls: ['./pipeline-registry.component.css'],
})
export class PipelineRegistryComponent implements OnInit, AfterViewInit, OnDestroy {
    pageSize = this.preferencesService.pageSize;
    offset = 0;
    dataSource: MatTableDataSource<PipelineModel> = new MatTableDataSource();
    ready = false;
    displayedColumns: string[] = ['select', 'status','access', 'id', 'name', 'createdat', 'updatedat', 'info'];
    selection = new SelectionModel<PipelineModel>(true, []);
    totalCount = 0;
    searchSub: Subscription = new Subscription();
    sortBy = 'createdat';
    sortDirection: SortDirection = 'desc';
    search: string | undefined = undefined;

    userId: string | Error = '';


    routerOperator: string[] | undefined = undefined;
    routerOperatorNames: string[] | undefined = undefined;

    shareUser = '';

    userHasDeleteAuthorization = false;
    userHasUpdateAuthorization = false;

    permissionsPerPipeline: PermissionsV2RightsAndIdModel[] = [];

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    constructor(
        private pipelineRegistryService: PipelineRegistryService,
        private flowEngineService: FlowEngineService,
        public snackBar: MatSnackBar,
        private searchbarService: SearchbarService,
        private dialogsService: DialogsService,
        public utilsService: UtilService,
        public preferencesService: PreferencesService,
        private permissionsDialogService: PermissionsDialogService,
        protected permission: PermissionsService,
        protected auth: AuthorizationService,
        private dialog: MatDialog,
        private cd: ChangeDetectorRef,
        private activatedRoute: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit() {
        this.userId = this.auth.getUserId();
        this.userHasUpdateAuthorization = this.flowEngineService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('share');
            this.displayedColumns.push('edit');

        }

        this.userHasDeleteAuthorization = this.flowEngineService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
        this.activatedRoute.queryParamMap.subscribe(value => {
           if (value.has('operator')){
               this.routerOperator = value.getAll('operator');
           }
            if (value.has('operatorName')){
                this.routerOperatorNames = value.getAll('operatorName');
            }
        });

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
        this.paginator.page.subscribe((e)=>{
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageIndex*this.paginator.pageSize;

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

        let filter = undefined;
        if (this.routerOperator != null && this.routerOperator.length > 0){
            filter = 'operator:'+this.routerOperator!.toString();
        }
        return this.pipelineRegistryService.getPipelinesNew(order, this.pageSize, this.offset, this.search, undefined, filter).pipe(
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
        this.permission.getComputedResourcePermissionsV2('analytics-pipelines', pipelines.map(e => e.id || '')).subscribe(
            perms => (this.permissionsPerPipeline = perms)
        );
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

    sharePipeline(pipeline: PipelineModel){
        if (pipeline.id == null) {
            return;
        }
        this.permissionsDialogService.openPermissionV2Dialog('analytics-pipelines', pipeline.id, pipeline.name || '');
    }

    getPipelineUser(id: string | undefined) {
        if (id !== undefined) {
            this.permission.getUserById(id).subscribe((item) => {
                this.shareUser = item.username;
            });
        }
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

    openFilterDialog() {
        const filterSelection: FilterSelection = {
            operators: this.routerOperator,
            operatorNames: []
        };
        const dialogRef = this.dialog.open(PipelineFilterDialogComponent, {
            data: filterSelection,
            minWidth: '50vw',
        });

        dialogRef.afterClosed().subscribe({
            next: (filterSelectionInner: FilterSelection) => {
                if (filterSelectionInner != null) {
                    this.routerOperator = filterSelectionInner.operators;
                    this.routerOperatorNames = filterSelectionInner.operatorNames;
                    const queryParams: Params = {operator: this.routerOperator, operatorName: this.routerOperatorNames};
                    this.router.navigate(
                        [],
                        {
                            relativeTo: this.activatedRoute,
                            queryParams
                        },
                    );
                    this.cd.detectChanges();

                }
                this.reload();
            }
        });
    }

    removeChip(i: number){
        this.routerOperator!.splice(i, 1);
        this.routerOperatorNames!.splice(i, 1);
        const queryParams: Params = {operator: this.routerOperator, operatorName: this.routerOperatorNames};
        this.router.navigate(
            [],
            {
                relativeTo: this.activatedRoute,
                queryParams
            },
        );
        this.reload();
    }

    userHasAdministratePermission(id: string): boolean {
        return this.permissionsPerPipeline.find(e => e.id === id)?.administrate || false;
    }

    private _chipDiv?: ElementRef;
    @ViewChild('chipDiv')
    set chipDivSetter(ref: ElementRef | undefined) {
        this._chipDiv = ref;
        this.cd.detectChanges();
    }
    calcTableMaxHeight(): string {
        if (this._chipDiv === undefined) {
            return '';
        }
        return 'calc(100vh - ' + (this._chipDiv.nativeElement.clientHeight + 216) + 'px - 1em)';
    }
}
