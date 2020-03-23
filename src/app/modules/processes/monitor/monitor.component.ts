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

import {map, startWith, switchMap} from 'rxjs/operators';

import {AfterViewInit, Component, EventEmitter, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {merge, Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MonitorService} from './shared/monitor.service';
import {MonitorProcessModel} from './shared/monitor-process.model';
import {SelectionModel} from '@angular/cdk/collections';
import {DialogsService} from '../../../core/services/dialogs.service';
import {MonitorProcessTotalModel} from './shared/monitor-process-total.model';
import {Navigation, Router} from '@angular/router';
import {DeploymentsModel} from '../deployments/shared/deployments.model';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';

@Component({
    selector: 'senergy-process-monitor',
    templateUrl: './monitor.component.html',
    styleUrls: ['./monitor.component.css']
})

export class ProcessMonitorComponent implements OnInit, OnDestroy, AfterViewInit {

    dataSourceFinished = new MatTableDataSource<MonitorProcessModel>();
    dataSourceRunning = new MatTableDataSource<MonitorProcessModel>();
    displayedColumnsFinished: string[] = ['select', 'definitionName', 'id', 'startTime', 'endTime', 'duration', 'info', 'delete'];
    displayedColumnsRunning: string[] = ['definitionName', 'id', 'startTime', 'action'];
    selection = new SelectionModel<MonitorProcessModel>(true, []);
    activeIndex = 0;
    totalCountFinished = 0;
    totalCountRunning = 0;
    searchText = '';
    isLoadingResultsFinished = true;
    isLoadingResultsRunning = true;
    searchInitialized = false;
    animation = true;
    selectedDeployment: DeploymentsModel | null = null;
    @ViewChild('paginatorFinished', {static: false}) paginatorFinished!: MatPaginator;
    @ViewChild('paginatorRunning', {static: false}) paginatorRunning!: MatPaginator;
    @ViewChild('sortFinished', {static: false}) sortFinished!: MatSort;
    @ViewChild('sortRunning', {static: false}) sortRunning!: MatSort;

    private searchSub: Subscription = new Subscription();
    private finishedSub: Subscription = new Subscription();
    private runningSub: Subscription = new Subscription();
    private reloadFinishedSub: EventEmitter<boolean> = new EventEmitter();
    private reloadRunningSub: EventEmitter<boolean> = new EventEmitter();

    constructor(private searchbarService: SearchbarService,
                private monitorService: MonitorService,
                private dialogsService: DialogsService,
                private router: Router) {
        this.getRouterParams();
    }

    ngOnInit() {
        this.initSearch();
    }

    ngAfterViewInit(): void {
        this.initRunning();
        this.initFinished();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
        this.finishedSub.unsubscribe();
        this.runningSub.unsubscribe();
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.dataSourceFinished.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.dataSourceFinished.connect().value.forEach(row => this.selection.select(row));
        }
    }

    animationDone(): void {
        this.animation = false;
    }

    setTabIndex(index: number): void {
        this.animation = true;
        this.activeIndex = index;
        this.searchText = '';
        if (this.activeIndex === 0) {
            this.isLoadingResultsRunning = true;
        } else {
            this.isLoadingResultsFinished = true;
        }
        this.reload();
    }

    openDetailsDialog(id: string): void {
        this.monitorService.openDetailsDialog(id);
    }

    deleteSingleItem(element: MonitorProcessModel): void {
        this.dialogsService.openDeleteDialog('process (' + element.id + ')').afterClosed().subscribe((processDelete: boolean) => {
            if (processDelete) {
                this.isLoadingResultsFinished = true;
                this.monitorService.deleteInstances(element.id).subscribe((resp: string) => {
                    if (resp === 'ok') {
                        this.paginatorFinished.pageIndex = 0;
                        this.reload();
                    }
                });
            }
        });
    }

    deleteMultipleItems(): void {
        this.dialogsService.openDeleteDialog(this.selection.selected.length + ' process(es)').afterClosed().subscribe(
            (processesDelete: boolean) => {
                if (processesDelete) {
                    this.isLoadingResultsFinished = true;
                    this.monitorService.deleteMultipleInstances(this.selection.selected).subscribe(() => {
                        this.paginatorFinished.pageIndex = 0;
                        this.reload();
                        this.selectionClear();
                    });
                }
            });
    }

    stop(element: MonitorProcessModel): void {
        this.monitorService.stopInstances(element.id).subscribe((resp: string) => {
            if (resp === 'ok') {
                this.isLoadingResultsRunning = true;
                this.paginatorRunning.pageIndex = 0;
                this.reload();
            }
        });
    }

    selectionClear(): void {
        this.selection.clear();
    }

    removeChip(): void {
        this.selectedDeployment = null;
        this.reload();
    }

    private initRunning() {
        this.dataSourceRunning.sort = this.sortRunning;
        this.dataSourceRunning.sort.sortChange.subscribe(() => {
            this.paginatorRunning.pageIndex = 0;
        });
        this.runningSub = merge(this.dataSourceRunning.sort.sortChange, this.paginatorRunning.page, this.reloadRunningSub).pipe(
            startWith({}),
            switchMap(() => {
                this.isLoadingResultsRunning = true;
                const searchParams = this.setSearchParams();
                return this.monitorService.getFilteredHistoryInstances('unfinished', searchParams.searchType, searchParams.searchValue,
                    this.paginatorRunning.pageSize, this.paginatorRunning.pageSize * this.paginatorRunning.pageIndex,
                    this.sortRunning.active, this.sortRunning.direction);
            }),
            map((resp: MonitorProcessTotalModel) => {
                this.totalCountRunning = resp.total;
                return resp.data;
            })
        ).subscribe((data: MonitorProcessModel[]) => {
            this.dataSourceRunning.data = data || [];
            this.isLoadingResultsRunning = false;

        });
    }

    private initFinished() {
        this.dataSourceFinished.sort = this.sortFinished;
        this.dataSourceFinished.sort.sortChange.subscribe(() => {
            this.paginatorFinished.pageIndex = 0;
            this.selectionClear();
        });

        this.finishedSub = merge(this.dataSourceFinished.sort.sortChange, this.paginatorFinished.page, this.reloadFinishedSub).pipe(
            startWith({}),
            switchMap(() => {
                this.isLoadingResultsFinished = true;
                const searchParams = this.setSearchParams();
                return this.monitorService.getFilteredHistoryInstances('finished', searchParams.searchType, searchParams.searchValue,
                    this.paginatorFinished.pageSize, this.paginatorFinished.pageSize * this.paginatorFinished.pageIndex,
                    this.sortFinished.active, this.sortFinished.direction);
            }),
            map((resp: MonitorProcessTotalModel) => {
                this.totalCountFinished = resp.total;
                return resp.data;
            })
        ).subscribe((data: MonitorProcessModel[]) => {
            this.dataSourceFinished.data = data || [];
            this.isLoadingResultsFinished = false;
        });
    }

    private setSearchParams(): { searchType: string, searchValue: string } {
        let searchType = '';
        let searchValue = '';

        if (this.selectedDeployment === null) {
            searchType = 'processDefinitionNameLike';
            searchValue = this.searchText;
        } else {
            searchType = 'processDefinitionId';
            searchValue = this.selectedDeployment.definition_id;
        }
        return {searchType, searchValue};
    }

    private initSearch() {

        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            if (searchText !== '') {
                this.searchInitialized = true;
            }
            this.searchText = searchText;
            if (this.searchInitialized) {
                this.reload();
            }
        });
    }
    private getRouterParams(): void {
        const navigation: Navigation | null = this.router.getCurrentNavigation();
        if (navigation !== null) {
            if (navigation.extras.state !== undefined) {
                const params = navigation.extras.state as {deployment: DeploymentsModel, activeTab: number};
                this.selectedDeployment = params.deployment;
                this.activeIndex = params.activeTab;
            }
        }
    }

    private reload() {
        if (this.activeIndex === 0) {
            this.reloadRunningSub.emit(true);
        } else {
            this.reloadFinishedSub.emit(true);
        }
    }
}
