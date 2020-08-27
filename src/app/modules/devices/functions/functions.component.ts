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
import {CharacteristicsPermSearchModel} from '../characteristics/shared/characteristics-perm-search.model';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {Subscription} from 'rxjs';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {CharacteristicsService} from '../characteristics/shared/characteristics.service';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {DialogsService} from '../../../core/services/dialogs.service';
import {FunctionsPermSearchModel} from './shared/functions-perm-search.model';
import {FunctionsService} from './shared/functions.service';
import {CharacteristicsEditDialogComponent} from '../characteristics/dialogs/characteristics-edit-dialog.component';
import {DeviceTypeCharacteristicsModel, DeviceTypeFunctionModel} from '../device-types-overview/shared/device-type.model';
import {FunctionsEditDialogComponent} from './dialog/functions-edit-dialog.component';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-functions',
    templateUrl: './functions.component.html',
    styleUrls: ['./functions.component.css']
})
export class FunctionsComponent implements OnInit, OnDestroy {

    functions: FunctionsPermSearchModel[] = [];
    gridCols = 0;
    ready = false;
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'));

    private searchText = '';
    private limit = 54;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private dialog: MatDialog,
                private responsiveService: ResponsiveService,
                private functionsService: FunctionsService,
                private searchbarService: SearchbarService,
                private snackBar: MatSnackBar,
                private router: Router,
                private dialogsService: DialogsService
    ) {
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetCharacteristics();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getFunctions(true);
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getFunctions(false);
        }
    }

    editFunction(inputFunction: FunctionsPermSearchModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            function: JSON.parse(JSON.stringify(inputFunction))         // create copy of object
        };

        const editDialogRef = this.dialog.open(FunctionsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newFunction: DeviceTypeFunctionModel) => {
            if (newFunction !== undefined) {
                this.reset();
                this.functionsService.updateFunction(newFunction).subscribe((func: (DeviceTypeFunctionModel | null)) => {
                    if (func === null) {
                        this.snackBar.open('Error while updating the function!', undefined, {duration: 2000});
                        this.getFunctions(true);
                    } else {
                        this.snackBar.open('Function updated successfully.', undefined, {duration: 2000});
                        this.reloadFunctions(true);
                    }
                });
            }
        });
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetCharacteristics() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getFunctions(true);
        });
    }

    private getFunctions(reset: boolean) {
        if (reset) {
            this.reset();
        }

        this.functionsService.getFunctions(this.searchText, this.limit, this.offset, this.sortAttribute.value,
            this.sortAttribute.order).subscribe(
            (functions: FunctionsPermSearchModel[]) => {
                if (functions.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.functions = this.functions.concat(functions);
                this.ready = true;
            });

    }

    private reset() {
        this.functions = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }

    private reloadFunctions(reset: boolean) {
        setTimeout(() => {
            this.getFunctions(reset);
        }, 1500);
    }

}
