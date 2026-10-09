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

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ConceptsNewDialogComponent} from './dialogs/concepts-new-dialog.component';
import {Router} from '@angular/router';
import {ConceptsService} from './shared/concepts.service';
import {forkJoin, Observable, of, map} from 'rxjs';
import {DialogsService} from '../../../core/services/dialogs.service';
import {ConceptsEditDialogComponent} from './dialogs/concepts-edit-dialog.component';
import {DeviceTypeConceptModel, DeviceTypeFunctionModel} from '../device-types-overview/shared/device-type.model';
import {FunctionsService} from '../functions/shared/functions.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { PagedListState } from 'src/app/core/classes/paged-list-state';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { NgClass } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-concepts',
    templateUrl: './concepts.component.html',
    styleUrls: ['./concepts.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, SpinnerComponent, NgClass, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatIconButton, MatTooltip, MatIcon, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, MatFabButton]
})
export class ConceptsComponent implements OnInit, AfterViewInit {
    private dialog = inject(MatDialog);
    private router = inject(Router);
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private conceptsService = inject(ConceptsService);
    private functionsService = inject(FunctionsService);
    private snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private preferencesService = inject(PreferencesService);

    displayedColumns = ['select', 'name', 'info', 'characteristic'];
    concepts: DeviceTypeConceptModel[] = [];
    ready = false;
    dataSource = new MatTableDataSource(this.concepts);
    listSelection = new ListSelection<DeviceTypeConceptModel>(() => this.dataSource.connect().value);
    selection = this.listSelection.model;
    totalCount = 200;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    searchText = '';
    list = new PagedListState(this.preferencesService, () => this.getConcepts(), { sortBy: 'name', sortDirection: 'asc' });
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
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
        this.list.connect(this.paginator, this.destroyRef);
    }

    private initSearch() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
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
                        snackError(this.snackBar, 'Error while creating the concept!');
                    } else {
                        snackSuccess(this.snackBar, 'Concept created successfully.');
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
                        snackError(this.snackBar, 'Error while updating the concept!');
                    } else {
                        snackSuccess(this.snackBar, 'Concept updated successfully.');
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
                        snackError(this.snackBar, 'Error while updating the concept!');
                    } else {
                        snackSuccess(this.snackBar, 'Concept updated successfully.');
                    }
                    this.reload();
                });
            }
        });
    }

    deleteConcept(concept: DeviceTypeConceptModel): void {
        this.functionsByConceptId([concept.id]).subscribe((byConcept) => {
            const functions = byConcept.get(concept.id) || [];
            if (functions.length > 0) {
                this.reportBlockedDeletes([{ concept, functions }]);
                return;
            }
            this.dialogsService
                .openDeleteDialog('concept ' + concept.name)
                .afterClosed()
                .subscribe((deleteConcept: boolean | undefined) => {
                    if (deleteConcept) {
                        this.ready = false;
                        this.conceptsService.deleteConcept(concept.id).subscribe((resp: boolean) => {
                            if (resp === true) {
                                this.concepts.splice(this.concepts.indexOf(concept), 1);
                                snackSuccess(this.snackBar, 'Concept deleted successfully.');
                            } else {
                                snackError(this.snackBar, 'Error while deleting the concept!');
                            }
                            this.reload();
                        });
                    }
                });
        });
    }

    /**
     * The device-repository refuses to delete a concept while a function still references it, grouped by
     * concept_id from one request rather than one request per concept.
     */
    private functionsByConceptId(conceptIds: string[]): Observable<Map<string, DeviceTypeFunctionModel[]>> {
        return this.functionsService.getFunctionsByConceptIds(conceptIds).pipe(
            map((functions) => {
                const byConcept = new Map<string, DeviceTypeFunctionModel[]>();
                functions.forEach((f) => {
                    const list = byConcept.get(f.concept_id) || [];
                    list.push(f);
                    byConcept.set(f.concept_id, list);
                });
                return byConcept;
            }),
        );
    }

    /**
     * Names the functions blocking each concept and, if some deletions failed outright, says how many -
     * both can happen in the same bulk delete. Offers to jump to the functions page, filtered to the blocking concepts, to clean the blockers up.
     */
    private reportBlockedDeletes(blocked: { concept: DeviceTypeConceptModel; functions: DeviceTypeFunctionModel[] }[], failedCount = 0): void {
        const parts: string[] = [];
        if (blocked.length > 0) {
            const detail = blocked
                .map((b) => b.concept.name + ' (used by ' + b.functions.map((f) => f.display_name || f.name).join(', ') + ')')
                .join('; ');
            parts.push('Still in use, not deleted: ' + detail);
        }
        if (failedCount > 0) {
            parts.push(failedCount + (failedCount > 1 ? ' concepts' : ' concept') + ' could not be deleted.');
        }
        this.snackBar
            .open(parts.join(' '), 'View functions', { panelClass: 'snack-bar-error' })
            .onAction()
            .subscribe(() =>
                this.router.navigate(['/metadata/functions'], {
                    queryParams: blocked.length > 0 ? {concept_ids: blocked.map((b) => b.concept.id).join(',')} : undefined,
                }),
            );
    }

    showCharacteristics(concept: DeviceTypeConceptModel) {
        this.router.navigateByUrl('/metadata/characteristics', { state: concept });
    }

    private getConcepts(): Observable<DeviceTypeConceptModel[]> {
        return this.conceptsService
            .getConcepts(this.searchText, this.list.pageSize, this.list.offset, this.list.sortBy, this.list.sortDirection)
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
        this.selectionClear();

        this.list.reload(() => {
            this.ready = true;
        });
    }

    matSortChange($event: Sort) {
        this.list.sortChanged($event);
        this.reload();
    }

    isAllSelected() {
        return this.listSelection.isAllSelected();
    }

    masterToggle() {
        this.listSelection.masterToggle();
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems() {
        const selected = [...this.selection.selected];

        this.dialogsService
            .openDeleteDialog(selected.length + (selected.length > 1 ? ' concepts' : ' concept'))
            .afterClosed()
            .subscribe((deleteConcepts: boolean | undefined) => {
                if (!deleteConcepts) {
                    return;
                }
                this.ready = false;
                this.functionsByConceptId(selected.map((concept) => concept.id)).subscribe((byConcept) => {
                    const blocked = selected
                        .map((concept) => ({ concept, functions: byConcept.get(concept.id) || [] }))
                        .filter((c) => c.functions.length > 0);
                    const unblocked = selected.filter((concept) => (byConcept.get(concept.id) || []).length === 0);
                    const deletionJobs: Observable<boolean>[] = unblocked.map((concept) => this.conceptsService.deleteConcept(concept.id));

                    (deletionJobs.length > 0 ? forkJoin(deletionJobs) : of([])).subscribe((deletionJobResults) => {
                        const failedCount = deletionJobResults.filter((r) => r !== true).length;
                        if (blocked.length > 0 || failedCount > 0) {
                            this.reportBlockedDeletes(blocked, failedCount);
                        } else {
                            snackSuccess(this.snackBar, 'Concepts deleted successfully.');
                        }
                        this.reload();
                    });
                });
            });
    }
}
