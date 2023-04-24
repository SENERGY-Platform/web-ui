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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatLegacyDialog as MatDialog, MatLegacyDialogConfig as MatDialogConfig } from '@angular/material/legacy-dialog';
import { ConceptsNewDialogComponent } from './dialogs/concepts-new-dialog.component';
import { Router } from '@angular/router';
import { ConceptsService } from './shared/concepts.service';
import { Subscription } from 'rxjs';
import { DialogsService } from '../../../core/services/dialogs.service';
import { ConceptsEditDialogComponent } from './dialogs/concepts-edit-dialog.component';
import { ConceptsPermSearchModel } from './shared/concepts-perm-search.model';
import { DeviceTypeConceptModel } from '../device-types-overview/shared/device-type.model';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

@Component({
    selector: 'senergy-concepts',
    templateUrl: './concepts.component.html',
    styleUrls: ['./concepts.component.css'],
})
export class ConceptsComponent implements OnInit, OnDestroy {
    readonly limitInit = 54;

    concepts: ConceptsPermSearchModel[] = [];
    ready = false;
    dataSource = new MatTableDataSource(this.concepts)
    @ViewChild(MatSort) sort!: MatSort

    searchControl = new FormControl('');

    private limit = this.limitInit;
    private offset = 0;
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(
        private dialog: MatDialog,
        private router: Router,
        private conceptsService: ConceptsService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
    ) {}

    ngOnInit() {
        this.getConcepts();
        this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.reload());
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.setRepoItemsParams(this.limitInit);
            this.getConcepts();
        }
    }

    newConcept() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(ConceptsNewDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newConcept: DeviceTypeConceptModel) => {
            if (newConcept !== undefined) {
                this.conceptsService.createConcept(newConcept).subscribe((concept: DeviceTypeConceptModel | null) => {
                    if (concept === null) {
                        this.snackBar.open('Error while creating the concept!', "close", { panelClass: "snack-bar-error" });
                    } else {
                        this.snackBar.open('Concept created successfully.', undefined, { duration: 2000 });
                    }
                    this.reload();
                });
            }
        });
    }

    editConcept(conceptInput: ConceptsPermSearchModel) {
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
                        this.snackBar.open('Error while updating the concept!', "close", { panelClass: "snack-bar-error" });
                    } else {
                        this.snackBar.open('Concept updated successfully.', undefined, { duration: 2000 });
                    }
                    this.reload();
                });
            }
        });
    }

    showConcept(conceptInput: ConceptsPermSearchModel) {
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
                        this.snackBar.open('Error while updating the concept!', "close", { panelClass: "snack-bar-error" });
                    } else {
                        this.snackBar.open('Concept updated successfully.', undefined, { duration: 2000 });
                    }
                    this.reload();
                });
            }
        });
    }

    deleteConcept(concept: ConceptsPermSearchModel): void {
        this.dialogsService
            .openDeleteDialog('concept ' + concept.name)
            .afterClosed()
            .subscribe((deleteConcept: boolean) => {
                if (deleteConcept) {
                    this.conceptsService.deleteConcept(concept.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.concepts.splice(this.concepts.indexOf(concept), 1);
                            this.snackBar.open('Concept deleted successfully.', undefined, { duration: 2000 });
                            this.setRepoItemsParams(1);
                            this.reloadConcepts(false);
                        } else {
                            this.snackBar.open('Error while deleting the concept!', "close", { panelClass: "snack-bar-error" });
                        }
                    });
                }
            });
    }

    showCharacteristics(concept: ConceptsPermSearchModel) {
        this.router.navigateByUrl('/metadata/characteristics', { state: concept });
    }

    private getConcepts() {
        this.conceptsService
            .getConcepts(this.searchControl.value, this.limit, this.offset, "name", "asc")
            .subscribe((concepts: ConceptsPermSearchModel[]) => {
                if (concepts.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.concepts = this.concepts.concat(concepts);
                this.dataSource = new MatTableDataSource(this.concepts)
                this.dataSource.sort = this.sort
                this.ready = true;
            });
    }

    reload() {
        this.concepts = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
        this.limit = this.limitInit;
        this.getConcepts();
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.concepts.length;
    }

    private reloadConcepts(reset: boolean) {
        setTimeout(() => {
            if(reset) {
                this.reload();
            } else {
                this.getConcepts()
            }
        }, 1500);
    }

    resetSearch() {
        this.searchControl.setValue('');
    }
}
