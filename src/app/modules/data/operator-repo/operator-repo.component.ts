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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {OperatorModel} from './shared/operator.model';
import {OperatorRepoService} from './shared/operator-repo.service';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogsService} from '../../../core/services/dialogs.service';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-operator-repo',
    templateUrl: './operator-repo.component.html',
    styleUrls: ['./operator-repo.component.css']
})
export class OperatorRepoComponent implements OnInit, OnDestroy {

    operators = [] as OperatorModel[];
    ready = false;
    gridCols = 0;
    sortAttributes = [new SortModel('Name', 'name', 'asc')];
    userId: string | Error = '';

    private searchText = '';
    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private operatorRepoService: OperatorRepoService,
                protected auth: AuthorizationService,
                private searchbarService: SearchbarService,
                public snackBar: MatSnackBar,
                private dialogsService: DialogsService,
                private responsiveService: ResponsiveService) {
    }

    ngOnInit() {
        this.userId = this.auth.getUserId();
        this.initGridCols();
        this.initSearchAndGetOperators();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.setRepoItemsParams(this.limitInit);
            this.getOperators(false);
        }
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getOperators(true);
    }

    deleteOperator(operator: OperatorModel) {
        this.dialogsService.openDeleteDialog('operator').afterClosed().subscribe((operatorDelete: boolean) => {
            if (operatorDelete) {
                const index = this.operators.indexOf(operator);
                if (index > -1) {
                    this.operators.splice(index, 1);
                }
                this.operatorRepoService.deleteOeprator(operator).subscribe(() => {
                    this.snackBar.open('Operator deleted', undefined, {
                        duration: 2000,
                    });
                    this.setRepoItemsParams(1);
                    this.getOperators(false);
                });
            }
        });

    }

    private getOperators(reset: boolean) {
        if (reset) {
            this.setRepoItemsParams(this.limitInit);
            this.reset();
        }
        this.operatorRepoService.getOperators(this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order).subscribe((resp: { operators: OperatorModel[] }) => {
            if (resp.operators.length !== this.limit) {
                this.allDataLoaded = true;
            }
            for (const operator of resp.operators) {
                if (operator.userId === this.userId) {
                    operator.editable = true;
                } else {
                    operator.editable = false;
                }
                this.operators.push(operator);
            }
            this.ready = true;
        });
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetOperators() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getOperators(true);
        });
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.operators.length;
    }

    private reset() {
        this.operators = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }
}
