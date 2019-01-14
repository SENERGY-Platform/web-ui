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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {Subscription} from 'rxjs';
import {ValueTypesService} from './shared/value-types.service';
import {ValueTypesModel} from './shared/value-types.model';

@Component({
    selector: 'senergy-value-types',
    templateUrl: './value-types.component.html',
    styleUrls: ['./value-types.component.css']
})
export class ValueTypesComponent implements OnInit, OnDestroy {

    valuetypes: ValueTypesModel[] = [];
    ready = false;
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'), new SortModel('Description', 'desc', 'asc'));
    displayedColumns: string[] = ['name', 'description'];

    private searchText = '';
    private limit = 25;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private searchbarService: SearchbarService,
                private valueTypesService: ValueTypesService) {
    }

    ngOnInit() {
        this.initSearchAndGetValuetypes();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getValuetypes(true);
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.offset = this.offset + this.limit;
            this.getValuetypes(false);
        }
    }

    private initSearchAndGetValuetypes() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getValuetypes(true);
        });
    }

    private getValuetypes(reset: boolean) {
        if (reset) {
            this.valuetypes = [];
            this.offset = 0;
            this.allDataLoaded = false;
            this.ready = false;
        }

        this.valueTypesService.getValuetypes(
            this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order).subscribe(
            (valuetypes: ValueTypesModel[]) => {
                if (valuetypes.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.valuetypes = this.valuetypes.concat(valuetypes);
                this.ready = true;
            });
    }
}
