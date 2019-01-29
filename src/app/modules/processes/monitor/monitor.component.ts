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

import {AfterViewInit, Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {MatPaginator, MatSort, MatTableDataSource} from '@angular/material';
import {Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MonitorService} from './shared/monitor.service';
import {MonitorProcessModel} from './shared/monitor-process.model';
import {SelectionModel} from '@angular/cdk/collections';

@Component({
    selector: 'senergy-process-monitor',
    templateUrl: './monitor.component.html',
    styleUrls: ['./monitor.component.css']
})

export class ProcessMonitorComponent implements OnInit, OnDestroy, AfterViewInit {

    dataSourceFinished = new MatTableDataSource<MonitorProcessModel>([]);
    dataSourceRunning = new MatTableDataSource<MonitorProcessModel>([]);
    ready = false;
    displayedColumnsFinished: string[] = ['select', 'processDefinitionKey', 'id', 'startTime', 'endTime', 'durationInMillis', 'info', 'delete'];
    displayedColumnsRunning: string[] = ['processDefinitionKey', 'id', 'startTime', 'info', 'action'];
    selection = new SelectionModel<MonitorProcessModel>(true, []);
    disableDeleteAll = true;
    activeIndex = 0;
    @ViewChildren(MatPaginator) paginator = new QueryList<MatPaginator>();
    @ViewChild(MatSort) sort!: MatSort;

    private searchSub: Subscription = new Subscription();

    constructor(private searchbarService: SearchbarService,
                private monitorService: MonitorService) {
    }

    ngOnInit() {
        this.initSearchAndGetProcesses();
    }

    ngAfterViewInit(): void {
        this.dataSourceFinished.paginator = this.paginator.toArray()[0];
        this.dataSourceRunning.paginator = this.paginator.toArray()[1];
        this.dataSourceFinished.sort = this.sort;
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSourceFinished.data.length;
        return numSelected === numRows;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selection.clear();
        } else {
            this.dataSourceFinished.data.forEach(row => this.selection.select(row));
        }
    }

    getProcesses() {
        this.ready = false;
        if (this.activeIndex === 0) {
            this.dataSourceFinished.data = [];
            this.monitorService.getFilteredHistoryInstances('finished').subscribe(
                (monitorProcessModels: MonitorProcessModel[]) => {
                    this.dataSourceFinished.data = monitorProcessModels;
                    this.ready = true;
                });
        } else {
            this.dataSourceRunning.data = [];
            this.monitorService.getFilteredHistoryInstances('unfinished').subscribe(
                (monitorProcessModels: MonitorProcessModel[]) => {
                    this.dataSourceRunning.data = monitorProcessModels;
                    this.ready = true;
                });
        }
    }

    setTabIndex(index: number): void {
        this.activeIndex = index;
        this.getProcesses();
    }

    openDetailsDialog(id: string): void {
        this.monitorService.openDetailsDialog(id);
    }

    private initSearchAndGetProcesses() {
        this.getProcesses();
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            if (this.activeIndex === 0) {
                this.dataSourceFinished.filter = searchText.trim().toLowerCase();
                console.log(this.dataSourceFinished);
            } else {
                this.dataSourceRunning.filter = searchText.trim().toLowerCase();
                console.log(this.dataSourceRunning);
            }
        });
        this.selection.changed.asObservable().subscribe((selection) => {
            if (selection.source.isEmpty()) {
                this.disableDeleteAll = true;
            } else {
                this.disableDeleteAll = false;
            }
        });
    }
}