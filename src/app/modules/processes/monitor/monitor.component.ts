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

import {map, startWith, switchMap} from 'rxjs/operators';

import {AfterViewInit, Component, EventEmitter, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatPaginator, MatSort, MatTableDataSource} from '@angular/material';
import {merge, Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MonitorService} from './shared/monitor.service';
import {MonitorProcessModel} from './shared/monitor-process.model';
import {SelectionModel} from '@angular/cdk/collections';
import {DialogsService} from '../../../core/services/dialogs.service';
import {MonitorProcessTotalModel} from './shared/monitor-process-total.model';

@Component({
    selector: 'senergy-process-monitor',
    templateUrl: './monitor.component.html',
    styleUrls: ['./monitor.component.css']
})

export class ProcessMonitorComponent implements OnInit, OnDestroy, AfterViewInit {

    dataSourceFinished = new MatTableDataSource<MonitorProcessModel>();
    dataSourceRunning = new MatTableDataSource<MonitorProcessModel>();
    displayedColumnsFinished: string[] = ['select', 'definitionName', 'id', 'startTime', 'endTime', 'duration', 'info', 'delete'];
    displayedColumnsRunning: string[] = ['definitionName', 'id', 'startTime', 'info', 'action'];
    selection = new SelectionModel<MonitorProcessModel>(true, []);
    activeIndex = 0;
    totalCountFinished = 0;
    totalCountRunning = 0;
    searchText = '';
    isLoadingResultsFinished = true;
    isLoadingResultsRunning = true;
    searchInitialized = false;
    animation = true;
    @ViewChild('paginatorFinished') paginatorFinished!: MatPaginator;
    @ViewChild('paginatorRunning') paginatorRunning!: MatPaginator;
    @ViewChild('sortFinished') sortFinished!: MatSort;
    @ViewChild('sortRunning') sortRunning!: MatSort;

    private searchSub: Subscription = new Subscription();
    private finishedSub: Subscription = new Subscription();
    private runningSub: Subscription = new Subscription();
    private reloadFinishedSub: EventEmitter<boolean> = new EventEmitter();
    private reloadRunningSub: EventEmitter<boolean> = new EventEmitter();

    constructor(private searchbarService: SearchbarService,
                private monitorService: MonitorService,
                private dialogsService: DialogsService) {
    }

    ngOnInit() {
        this.initSearch();
    }

    ngAfterViewInit(): void {
        this.initFinished();
        this.initRunning();
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
            this.isLoadingResultsFinished = true;
            this.reloadFinished();
        } else {
            this.isLoadingResultsRunning = true;
            this.reloadRunning();
        }
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
                        this.reloadFinished();
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
                        this.reloadFinished();
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
                this.reloadRunning();
            }
        });
    }

    selectionClear(): void {
        this.selection.clear();
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
                return this.monitorService.getFilteredHistoryInstances('unfinished', this.searchText,
                    this.paginatorRunning.pageSize, this.paginatorRunning.pageSize * this.paginatorRunning.pageIndex,
                    this.sortRunning.active, this.sortRunning.direction);
            }),
            map((resp: MonitorProcessTotalModel) => {
                this.totalCountRunning = resp.total;
                return resp.data;
            })
        ).subscribe((data: MonitorProcessModel[]) => {
            this.dataSourceRunning.data = data;
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
                return this.monitorService.getFilteredHistoryInstances('finished', this.searchText,
                    this.paginatorFinished.pageSize, this.paginatorFinished.pageSize * this.paginatorFinished.pageIndex,
                    this.sortFinished.active, this.sortFinished.direction);
            }),
            map((resp: MonitorProcessTotalModel) => {
                this.totalCountFinished = resp.total;
                return resp.data;
            })
        ).subscribe((data: MonitorProcessModel[]) => {
            this.dataSourceFinished.data = data;
            this.isLoadingResultsFinished = false;
        });

    }

    private initSearch() {

        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            if (searchText !== '') {
                this.searchInitialized = true;
            }
            this.searchText = searchText;
            if (this.searchInitialized) {
                if (this.activeIndex === 0) {
                    this.reloadFinished();
                } else {
                    this.reloadRunning();
                }
            }
        });
    }

    private reloadFinished(): void {
        this.reloadFinishedSub.emit(true);
    }

    private reloadRunning(): void {
        this.reloadRunningSub.emit(true);
    }
}
