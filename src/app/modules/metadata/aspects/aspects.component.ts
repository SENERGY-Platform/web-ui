/*
 * Copyright 2021 InfAI (CC SES)
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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { SortModel } from '../../../core/components/sort/shared/sort.model';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import { AspectsPermSearchModel } from './shared/aspects-perm-search.model';
import { AspectsService } from './shared/aspects.service';
import { AspectsEditDialogComponent } from './dialog/aspects-edit-dialog.component';
import { DeviceTypeAspectModel } from '../device-types-overview/shared/device-type.model';
import uuid = util.uuid;
import { util } from 'jointjs';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-aspects',
    templateUrl: './aspects.component.html',
    styleUrls: ['./aspects.component.css'],
})
export class AspectsComponent implements OnInit, OnDestroy {
    readonly limitInit = 54;
    aspects: AspectsPermSearchModel[] = [];
    gridCols = 0;
    ready = false;
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'));

    private searchText = '';
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(
        private dialog: MatDialog,
        private responsiveService: ResponsiveService,
        private aspectsService: AspectsService,
        private searchbarService: SearchbarService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
    ) {}

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetAspects();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getAspects(true);
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getAspects(false);
        }
    }

    editAspect(inputAspect: AspectsPermSearchModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            aspect: JSON.parse(JSON.stringify(inputAspect)), // create copy of object
        };

        const editDialogRef = this.dialog.open(AspectsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newAspect: DeviceTypeAspectModel) => {
            if (newAspect !== undefined) {
                this.reset();
                this.aspectsService.updateAspects(newAspect).subscribe((aspect: DeviceTypeAspectModel | null) => {
                    this.reloadAndShowSnackbar(aspect, 'updat');
                });
            }
        });
    }

    deleteAspect(aspect: AspectsPermSearchModel): void {
        this.dialogsService
            .openDeleteDialog('aspect ' + aspect.name)
            .afterClosed()
            .subscribe((deleteAspect: boolean) => {
                if (deleteAspect) {
                    this.aspectsService.deleteAspects(aspect.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.aspects.splice(this.aspects.indexOf(aspect), 1);
                            this.snackBar.open('Aspect deleted successfully.', undefined, { duration: 2000 });
                            this.setLimitOffset(1);
                            this.reloadAspects(false);
                        } else {
                            this.snackBar.open('Error while deleting the aspect!', undefined, { duration: 2000 });
                        }
                    });
                }
            });
    }

    newAspect(): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            aspect: {
                id: 'urn:infai:ses:aspect:' + uuid(),
                name: '',
            } as DeviceTypeAspectModel,
        };

        const editDialogRef = this.dialog.open(AspectsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newAspect: DeviceTypeAspectModel) => {
            if (newAspect !== undefined) {
                this.reset();
                this.aspectsService.createAspect(newAspect).subscribe((aspect: DeviceTypeAspectModel | null) => {
                    this.reloadAndShowSnackbar(aspect, 'sav');
                });
            }
        });
    }

    private reloadAndShowSnackbar(aspect: DeviceTypeAspectModel | null, text: string) {
        if (aspect === null) {
            this.snackBar.open('Error while ' + text + 'ing the aspect!', undefined, { duration: 2000 });
            this.getAspects(true);
        } else {
            this.snackBar.open('Aspect ' + text + 'ed successfully.', undefined, { duration: 2000 });
            this.reloadAspects(true);
        }
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetAspects() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getAspects(true);
        });
    }

    private getAspects(reset: boolean) {
        if (reset) {
            this.reset();
        }

        this.aspectsService
            .getAspects(this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order)
            .subscribe((aspects: AspectsPermSearchModel[]) => {
                if (aspects.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.aspects = this.aspects.concat(aspects);
                this.ready = true;
            });
    }

    private reset() {
        this.aspects = [];
        this.limit = this.limitInit;
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }

    private reloadAspects(reset: boolean) {
        setTimeout(() => {
            this.getAspects(reset);
        }, 2500);
    }

    private setLimitOffset(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.aspects.length;
    }
}
