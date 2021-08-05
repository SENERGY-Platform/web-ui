/*
 * Copyright 2021 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {MatDialog} from '@angular/material/dialog';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {merge, Subscription} from 'rxjs';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {SelectionModel} from '@angular/cdk/collections';
import {MatTableDataSource} from '@angular/material/table';
import {WaitingDeviceListModel, WaitingDeviceModel} from './shared/waiting-room.model';
import {startWith, switchMap} from 'rxjs/internal/operators';
import {WaitingRoomService} from './shared/waiting-room.service';


@Component({
    selector: 'senergy-waiting-room',
    templateUrl: './waiting-room.component.html',
    styleUrls: ['./waiting-room.component.css']
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
    @ViewChild('paginator', {static: false}) paginator!: MatPaginator;
    @ViewChild('sort', {static: false}) sort!: MatSort;

    selection = new SelectionModel<WaitingDeviceModel>(true, []);
    displayedColumns: string[] = ['select', 'local_id', 'name', 'created_at', 'updated_at', 'info', 'edit', 'use', 'delete'];
    totalCount = 0;

    devices: WaitingDeviceModel[] = [] as WaitingDeviceModel[];
    devicesDataSource = new MatTableDataSource<WaitingDeviceModel>();
    showHidden = localStorage.getItem('devices.waiting-room.showHidden') === 'true';
    ready = false;


    private searchSub: Subscription = new Subscription();
    public searchText = '';
    private devicesSub: Subscription = new Subscription();

    constructor(private dialog: MatDialog,
                private searchbarService: SearchbarService,
                private waitingRoomService: WaitingRoomService,
                private snackBar: MatSnackBar,
                private router: Router
    ) {
    }

    ngOnInit() {
        this.initSearchAndGetDevices();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    showHiddenChanged() {
        this.showHidden = !this.showHidden;
        localStorage.setItem('devices.waiting-room.showHidden', String(this.showHidden));
        this.getDevices(true);
    }

    private reset() {
        this.devices = [];
        this.ready = false;
    }

    selectionClear(): void {
        this.selection.clear();
    }

    private getDevices(reset: boolean) {
        if (reset) {
            this.reset();
        }
        this.devicesDataSource.sort = this.sort;
        this.sort.sortChange.subscribe(() => {
                this.paginator.pageIndex = 0;
                this.selectionClear();
            }
        );
        this.devicesSub = merge(this.sort.sortChange, this.paginator.page).pipe(startWith({}), switchMap(() => {
            this.ready = false;
            return this.waitingRoomService.searchDevices(
                this.searchText,
                this.paginator.pageSize, this.paginator.pageSize * this.paginator.pageIndex,
                this.sort.active,
                this.sort.direction,
                (this.showHidden ? undefined : false)
            );
        })).subscribe(
            (resp: WaitingDeviceListModel | null) => {
                if (resp !== null) {
                    this.devices = resp.result;
                    if (this.devices === undefined) {
                        this.devices = [];
                    }
                    this.totalCount = resp.total;
                    this.devicesDataSource.data = this.devices;
                }
                this.ready = true;
            });
    }

    private initSearchAndGetDevices() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getDevices(true);
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.devicesDataSource.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.devicesDataSource.connect().value.forEach(row => this.selection.select(row));
        }
    }
}
