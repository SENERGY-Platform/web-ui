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

import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {Subscription} from 'rxjs';
import {ValueTypesService} from './shared/value-types.service';
import {ValueTypesModel} from './shared/value-types.model';
import {MatPaginator, MatTableDataSource} from '@angular/material';

@Component({
    selector: 'senergy-value-types',
    templateUrl: './value-types.component.html',
    styleUrls: ['./value-types.component.css']
})
export class ValueTypesComponent implements OnInit, OnDestroy {

    dataSource = new MatTableDataSource<ValueTypesModel>([]);
    ready = false;
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'), new SortModel('Description', 'desc', 'asc'));
    displayedColumns: string[] = ['name', 'description'];
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    private searchText = '';
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();

    constructor(private searchbarService: SearchbarService,
                private valueTypesService: ValueTypesService) {
    }

    ngOnInit() {
        this.initSearchAndGetValuetypes();
        this.dataSource.paginator = this.paginator;
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getValuetypes();
    }

    private initSearchAndGetValuetypes() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getValuetypes();
        });
    }

    private getValuetypes() {
        this.dataSource.data = [];
        this.ready = false;

        this.valueTypesService.getValuetypes(
            this.searchText, 9999, 0, this.sortAttribute.value, this.sortAttribute.order).subscribe(
                (valuetypes: ValueTypesModel[]) => {
                this.dataSource.data = valuetypes;
                this.ready = true;
            });
    }
}
