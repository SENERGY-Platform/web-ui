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

const tabs = [{label: 'Finished', filter: 'finished'}, {label: 'Running', filter: 'unfinished'}];

import {AfterViewInit, Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {MatPaginator, MatSort, MatTableDataSource} from '@angular/material';
import {Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MonitorService} from './shared/monitor.service';
import {MonitorProcessModel} from './shared/monitor-process.model';
import {SelectionModel} from '@angular/cdk/collections';
import {DialogsService} from '../../../core/services/dialogs.service';
import {PermissionsResponseModel} from '../../permissions/shared/permissions-response.model';

@Component({
    selector: 'senergy-process-monitor',
    templateUrl: './monitor.component.html',
    styleUrls: ['./monitor.component.css']
})

export class ProcessMonitorComponent implements OnInit, OnDestroy, AfterViewInit {

    dataSourceFinished = new MatTableDataSource<MonitorProcessModel>([]);
    dataSourceRunning = new MatTableDataSource<MonitorProcessModel>([]);
    ready = false;
    displayedColumnsFinished: string[] = ['select', 'processDefinitionName', 'id', 'startTime', 'endTime', 'durationInMillis', 'info', 'delete'];
    displayedColumnsRunning: string[] = ['processDefinitionName', 'id', 'startTime', 'info', 'action'];
    selection = new SelectionModel<MonitorProcessModel>(true, []);
    activeIndex = 0;
    searchText = '';
    searchInitialized = false;
    tabs: { label: string, filter: string }[] = tabs;
    @ViewChildren(MatPaginator) paginator = new QueryList<MatPaginator>();
    @ViewChild(MatSort) sort!: MatSort;

    private searchSub: Subscription = new Subscription();

    constructor(private searchbarService: SearchbarService,
                private monitorService: MonitorService,
                private dialogsService: DialogsService) {
    }

    ngOnInit() {
        this.initSearch();
    }

    ngAfterViewInit(): void {
        this.dataSourceFinished.paginator = this.paginator.toArray()[0];
        this.dataSourceRunning.paginator = this.paginator.toArray()[1];
        this.dataSourceFinished.sort = this.sort;
        this.dataSourceFinished.sort.sortChange.subscribe(() => {
            this.selectionClear();
        });
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
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

    getProcesses() {
        this.selectionClear();
        this.ready = false;
        this.dataSourceFinished.data = [];
        this.dataSourceRunning.data = [];
        if (this.searchText === '') {
            this.monitorService.getFilteredHistoryInstances(this.tabs[this.activeIndex].filter).subscribe(
                (monitorProcessModels: MonitorProcessModel[]) => {
                    this.setData(monitorProcessModels);
                });
        } else {
            this.monitorService.getFilteredHistoryInstancesWithSearch(this.tabs[this.activeIndex].filter, this.searchText).subscribe(
                (monitorProcessModels: MonitorProcessModel[]) => {
                    this.setData(monitorProcessModels);
                });
        }
    }

    animation(): void {
        if (this.searchInitialized) {
            this.getProcesses();
        }
    }

    setTabIndex(index: number): void {
        this.activeIndex = index;
        this.ready = false;
        this.searchText = '';
    }

    openDetailsDialog(id: string): void {
        this.monitorService.openDetailsDialog(id);
    }

    deleteSingleItem(element: MonitorProcessModel): void {
        this.dialogsService.openDeleteDialog('process (' + element.id + ')').afterClosed().subscribe((processDelete: boolean) => {
            if (processDelete) {
                this.monitorService.deleteInstances(element.id).subscribe((resp: string) => {
                    if (resp === 'ok') {
                        const index = this.dataSourceFinished.data.indexOf(element);
                        this.dataSourceFinished.data.splice(index, 1);
                        this.dataSourceFinished._updateChangeSubscription();
                    }
                });
            }
        });
    }

    deleteMultipleItems(): void {
        this.dialogsService.openDeleteDialog(this.selection.selected.length + ' process(es)').afterClosed().subscribe((processesDelete: boolean) => {
            if (processesDelete) {
                this.monitorService.deleteMultipleInstances(this.selection.selected).subscribe((resp: string[]) => {
                    const countOk = resp.filter((response: string) => {
                        return response === 'ok';
                    }).length;
                    if (countOk === this.selection.selected.length) {
                        this.selection.selected.forEach((item: MonitorProcessModel) => {
                            const index = this.dataSourceFinished.data.indexOf(item);
                            this.dataSourceFinished.data.splice(index, 1);
                        });
                        this.dataSourceFinished._updateChangeSubscription();
                        this.selectionClear();
                    }
                });
            }
        });
    }

    stop(element: MonitorProcessModel): void {
        this.monitorService.stopInstances(element.id).subscribe((resp: string) => {
            if (resp === 'ok') {
                const index = this.dataSourceRunning.data.indexOf(element);
                this.dataSourceRunning.data.splice(index, 1);
                this.dataSourceRunning._updateChangeSubscription();
            }
        });
    }

    selectionClear(): void {
        this.selection.clear();
    }

    private setData(monitorProcessModels: MonitorProcessModel[]) {
        if (this.activeIndex === 0) {
            this.dataSourceFinished.data = monitorProcessModels;
        } else {
            this.dataSourceRunning.data = monitorProcessModels;
        }
        this.ready = true;
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchInitialized = true;
            this.searchText = searchText;
            this.getProcesses();
        });
    }
}