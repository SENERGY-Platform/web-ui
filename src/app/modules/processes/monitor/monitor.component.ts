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

import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatPaginator, MatSort, MatTableDataSource} from '@angular/material';
import {Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MonitorService} from './shared/monitor.service';
import {MonitorProcessModel} from './shared/monitor-process.model';
import {SelectionModel} from '@angular/cdk/collections';
import {FilterModel} from '../../../core/components/filter/shared/filter.model';

const filterData = new Array(new FilterModel('All', 'all'),
    new FilterModel('Running', 'unfinished'), new FilterModel('Finished', 'finished'));

@Component({
    selector: 'senergy-process-monitor',
    templateUrl: './monitor.component.html',
    styleUrls: ['./monitor.component.css']
})

export class ProcessMonitorComponent implements OnInit, OnDestroy {

    dataSource = new MatTableDataSource<MonitorProcessModel>([]);
    ready = false;
    filterAttributes = filterData;
    displayedColumns: string[] = ['select', 'processDefinitionKey', 'id', 'startTime', 'endTime', 'durationInMillis', 'info', 'delete'];
    selection = new SelectionModel<MonitorProcessModel>(true, []);
    disableDeleteAll = true;
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    private searchText = '';
    private searchSub: Subscription = new Subscription();

    constructor(private searchbarService: SearchbarService,
                private monitorService: MonitorService) {
    }

    ngOnInit() {
        this.initSearchAndGetProcesses();
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.data.length;
        return numSelected === numRows;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selection.clear();
        } else {
            this.dataSource.data.forEach(row => this.selection.select(row));
        }
    }

    private initSearchAndGetProcesses() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getProcesses('');
        });
        this.selection.changed.asObservable().subscribe((selection) => {
            if (selection.source.isEmpty()) {
                this.disableDeleteAll = true;
            } else {
                this.disableDeleteAll = false;
            }
        });
    }

    getProcesses(filter: string) {
        this.dataSource.data = [];
        this.ready = false;
        if (filter === '' || filter === 'all') {
            this.monitorService.getAllHistoryInstances().subscribe(
                (monitorProcessModels: MonitorProcessModel[]) => {
                    this.setData(monitorProcessModels);
                });
        } else {
            this.monitorService.getFilteredHistoryInstances(filter).subscribe(
                (monitorProcessModels: MonitorProcessModel[]) => {
                    this.setData(monitorProcessModels);
                });
        }
    }

    private setData(monitorProcessModels: MonitorProcessModel[]) {
        this.dataSource.data = monitorProcessModels;
        this.ready = true;
    }
}