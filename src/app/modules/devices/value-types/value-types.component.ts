/*
 * Copyright 2018 InfAI (CC SES)
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

import {AfterViewInit, Component, EventEmitter, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {merge, Subscription} from 'rxjs';
import {ValueTypesService} from './shared/value-types.service';
import {ValueTypesModel} from './shared/value-types.model';
import {MatDialog, MatDialogConfig, MatPaginator, MatSort} from '@angular/material';
import {ValueTypesNewDialogComponent} from './dialogs/value-types-new-dialog.component';
import {map, startWith, switchMap} from 'rxjs/operators';
import {ValueTypesTotalModel} from './shared/value-types-total.model';

@Component({
    selector: 'senergy-value-types',
    templateUrl: './value-types.component.html',
    styleUrls: ['./value-types.component.css']
})
export class ValueTypesComponent implements OnInit, OnDestroy, AfterViewInit {

    isLoadingResults = true;
    displayedColumns: string[] = ['name', 'desc'];
    totalCount = 0;
    data: ValueTypesModel[] = [];
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    private searchText = '';
    private searchSub: Subscription = new Subscription();
    private addSub = new EventEmitter();

    constructor(private searchbarService: SearchbarService,
                private valueTypesService: ValueTypesService,
                private dialog: MatDialog) {
    }

    ngOnInit() {
        this.initSearchAndGetValuetypes();
    }

    ngAfterViewInit(): void {
        this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

        merge(this.sort.sortChange, this.paginator.page, this.searchbarService.currentSearchText, this.addSub).pipe(
            startWith({}),
            switchMap(() => {
                this.isLoadingResults = true;
                return this.valueTypesService.getValuetypesWithTotal(this.searchText, this.paginator.pageSize,
                    this.paginator.pageSize * this.paginator.pageIndex, this.sort.active, this.sort.direction);
            }),
            map((data: ValueTypesTotalModel) => {
                this.totalCount = data.total;
                return data.result;
            })
        ).subscribe(result => {
            this.data = result;
            this.isLoadingResults = false;
        });
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    newValuetype() {
        this.valueTypesService.getValuetypes('', 9999, 0, 'name', 'asc').subscribe((valuetypes: ValueTypesModel[]) => {
            const dialogConfig = new MatDialogConfig();
            dialogConfig.autoFocus = true;
            dialogConfig.data = {
                valuetypes: valuetypes
            };
            const editDialogRef = this.dialog.open(ValueTypesNewDialogComponent, dialogConfig);

            editDialogRef.afterClosed().subscribe((valuetype: ValueTypesModel) => {
                if (valuetype !== undefined) {
                    this.valueTypesService.saveValuetype(valuetype).subscribe(() => {
                        this.isLoadingResults = true;
                        setTimeout(() => this.addSub.emit(true), 1000);
                    });
                }
            });
        });
    }

    private initSearchAndGetValuetypes() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.isLoadingResults = true;
            this.searchText = searchText;
            this.paginator.pageIndex = 0;
        });
    }

}
