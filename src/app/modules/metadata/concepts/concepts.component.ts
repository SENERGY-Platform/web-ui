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

import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ConceptsNewDialogComponent} from './dialogs/concepts-new-dialog.component';
import {Router} from '@angular/router';
import {ConceptsService} from './shared/concepts.service';
import {forkJoin, Observable, Subscription, map} from 'rxjs';
import {DialogsService} from '../../../core/services/dialogs.service';
import {ConceptsEditDialogComponent} from './dialogs/concepts-edit-dialog.component';
import {DeviceTypeConceptModel} from '../device-types-overview/shared/device-type.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatTableDataSource} from '@angular/material/table';
import {Sort, SortDirection} from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';

@Component({
    selector: 'senergy-concepts',
    templateUrl: './concepts.component.html',
    styleUrls: ['./concepts.component.css'],
})
export class ConceptsComponent implements OnInit, OnDestroy, AfterViewInit {
    displayedColumns = ['select', 'name', 'info', 'characteristic'];
    pageSize = this.preferencesService.pageSize;
    concepts: DeviceTypeConceptModel[] = [];
    ready = false;
    dataSource = new MatTableDataSource(this.concepts);
    selection = new SelectionModel<DeviceTypeConceptModel>(true, []);
    totalCount = 200;
    offset = 0;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    private searchSub: Subscription = new Subscription();
    searchText = '';
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;

    constructor(
        private dialog: MatDialog,
        private router: Router,
        private searchbarService: SearchbarService,
        private conceptsService: ConceptsService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private preferencesService: PreferencesService,
    ) {}

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    checkAuthorization() {
        this.userHasUpdateAuthorization = this.conceptsService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.conceptsService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
        this.userHasCreateAuthorization = this.conceptsService.userHasDeleteAuthorization();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((e)=>{
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getConcepts().subscribe();
        });
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    newConcept() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(ConceptsNewDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newConcept: DeviceTypeConceptModel) => {
            if (newConcept !== undefined) {
                this.conceptsService.createConcept(newConcept).subscribe((concept: DeviceTypeConceptModel | null) => {
                    if (concept === null) {
                        this.snackBar.open('Error while creating the concept!', 'close', { panelClass: 'snack-bar-error' });
                    } else {
                        this.snackBar.open('Concept created successfully.', undefined, { duration: 2000 });
                    }
                    this.reload();
                });
            }
        });
    }

    editConcept(conceptInput: DeviceTypeConceptModel) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            conceptId: conceptInput.id,
        };
        const editDialogRef = this.dialog.open(ConceptsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((editConcept: DeviceTypeConceptModel) => {
            if (editConcept !== undefined) {
                this.conceptsService.updateConcept(editConcept).subscribe((concept: DeviceTypeConceptModel | null) => {
                    if (concept === null) {
                        this.snackBar.open('Error while updating the concept!', 'close', { panelClass: 'snack-bar-error' });
                    } else {
                        this.snackBar.open('Concept updated successfully.', undefined, { duration: 2000 });
                    }
                    this.reload();
                });
            }
        });
    }

    showConcept(conceptInput: DeviceTypeConceptModel) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            conceptId: conceptInput.id,
            disabled: true,
        };
        const editDialogRef = this.dialog.open(ConceptsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((editConcept: DeviceTypeConceptModel) => {
            if (editConcept !== undefined) {
                this.conceptsService.updateConcept(editConcept).subscribe((concept: DeviceTypeConceptModel | null) => {
                    if (concept === null) {
                        this.snackBar.open('Error while updating the concept!', 'close', { panelClass: 'snack-bar-error' });
                    } else {
                        this.snackBar.open('Concept updated successfully.', undefined, { duration: 2000 });
                    }
                    this.reload();
                });
            }
        });
    }

    deleteConcept(concept: DeviceTypeConceptModel): void {
        this.dialogsService
            .openDeleteDialog('concept ' + concept.name)
            .afterClosed()
            .subscribe((deleteConcept: boolean) => {
                if (deleteConcept) {
                    this.ready = false;
                    this.conceptsService.deleteConcept(concept.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.concepts.splice(this.concepts.indexOf(concept), 1);
                            this.snackBar.open('Concept deleted successfully.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting the concept!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        this.reload();
                    });
                }
            });
    }

    showCharacteristics(concept: DeviceTypeConceptModel) {
        this.router.navigateByUrl('/metadata/characteristics', { state: concept });
    }

    private getConcepts(): Observable<DeviceTypeConceptModel[]> {
        return this.conceptsService
            .getConcepts(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection)
            .pipe(
                map(concepts => {
                    this.totalCount = concepts.total;
                    this.dataSource.data = concepts.result;
                    return concepts.result;
                })
            );
    }

    reload() {
        this.ready = false;
        this.offset = 0;
        this.selectionClear();

        this.getConcepts().subscribe(_ => {
            this.ready = true;
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.reload();
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.dataSource.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.dataSource.connect().value.forEach((row) => this.selection.select(row));
        }
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems() {
        const deletionJobs: Observable<any>[] = [];

        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' concepts' : ' concept'))
            .afterClosed()
            .subscribe((deleteConcepts: boolean) => {
                if (deleteConcepts) {
                    this.ready = false;
                    this.selection.selected.forEach((concept: DeviceTypeConceptModel) => {
                        deletionJobs.push(this.conceptsService.deleteConcept(concept.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open('Concepts deleted successfully.', undefined, {duration: 2000});
                    } else {
                        this.snackBar.open('Error while deleting concepts!', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.reload();
                });
            });
    }
}
