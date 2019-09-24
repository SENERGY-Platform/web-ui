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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {MatDialog, MatDialogConfig, MatSnackBar} from '@angular/material';
import {ConceptsNewDialogComponent} from './dialogs/concepts-new-dialog.component';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {Router} from '@angular/router';
import {ConceptsService} from './shared/concepts.service';
import {Subscription} from 'rxjs';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import {ConceptsEditDialogComponent} from './dialogs/concepts-edit-dialog.component';
import {ConceptsPermSearchModel} from './shared/concepts-perm-search.model';
import {DeviceTypeConceptModel} from '../device-types-overview/shared/device-type.model';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-concepts',
    templateUrl: './concepts.component.html',
    styleUrls: ['./concepts.component.css']
})
export class ConceptsComponent implements OnInit, OnDestroy {

    concepts: ConceptsPermSearchModel[] = [];
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
                private router: Router,
                private conceptsService: ConceptsService,
                private searchbarService: SearchbarService,
                private snackBar: MatSnackBar,
                private dialogsService: DialogsService) {
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetValuetypes();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getConcepts(true);
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getConcepts(false);
        }
    }

    newConcept() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(ConceptsNewDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newConcept: DeviceTypeConceptModel) => {
            if (newConcept !== undefined) {
                this.reset();
                this.conceptsService.createConcept(newConcept).subscribe((concept: (DeviceTypeConceptModel | null)) => {
                    if (concept === null) {
                        this.snackBar.open('Error while creating the concept!', undefined, {duration: 2000});
                        this.getConcepts(true);
                    } else {
                        this.snackBar.open('Concept created successfully.', undefined, {duration: 2000});
                        this.reloadConcepts(true);
                    }
                });
            }
        });
    }

    editConcept(conceptInput: ConceptsPermSearchModel) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            conceptId: conceptInput.id
        };
        const editDialogRef = this.dialog.open(ConceptsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((editConcept: DeviceTypeConceptModel) => {
            if (editConcept !== undefined) {
                this.reset();
                this.conceptsService.updateConcept(editConcept).subscribe((concept: (DeviceTypeConceptModel | null)) => {
                    if (concept === null) {
                        this.snackBar.open('Error while updating the concept!', undefined, {duration: 2000});
                        this.getConcepts(true);
                    } else {
                        this.snackBar.open('Concept updated successfully.', undefined, {duration: 2000});
                        this.reloadConcepts(true);
                    }
                });
            }
        });
    }

    deleteConcept(concept: ConceptsPermSearchModel): void {
        this.dialogsService.openDeleteDialog('concept ' + concept.name).afterClosed().subscribe((deleteConcept: boolean) => {
            if (deleteConcept) {
                this.conceptsService.deleteConcept(concept.id).subscribe((resp: boolean) => {
                    console.log(resp);
                    if (resp === true) {
                        this.concepts.splice(this.concepts.indexOf(concept), 1);
                        this.snackBar.open('Concept deleted successfully.', undefined, {duration: 2000});
                        this.setRepoItemsParams(1);
                        this.reloadConcepts(false);
                    } else {
                        this.snackBar.open('Error while deleting the concept!', undefined, {duration: 2000});
                    }
                });
            }
        });
    }

    showCharacteristics(concept: ConceptsPermSearchModel) {
        this.router.navigateByUrl('/devices/characteristics', {state: concept});
    }

    private getConcepts(reset: boolean) {
        if (reset) {
            this.reset();
        }
        this.conceptsService.getConcepts(this.searchText, this.limit, this.offset, this.sortAttribute.value,
            this.sortAttribute.order).subscribe(
            (concepts: ConceptsPermSearchModel[]) => {
                if (concepts.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.concepts = this.concepts.concat(concepts);
                this.ready = true;
            });
    }

    private initSearchAndGetValuetypes() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getConcepts(true);
        });
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private reset() {
        this.concepts = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.concepts.length;
    }

    private reloadConcepts(reset: boolean) {
        setTimeout(() => {
            this.getConcepts(reset);
        }, 1500);
    }

}
