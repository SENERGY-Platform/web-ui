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
import {DeviceTypeCharacteristicsModel} from '../device-types-overview/shared/device-type.model';
import {Navigation, Router} from '@angular/router';
import {CharacteristicsService} from './shared/characteristics.service';
import {Observable, map} from 'rxjs';
import {DialogsService} from '../../../core/services/dialogs.service';
import { bulkDelete, confirmDelete, countLabel, everyTrue } from '../../../core/services/delete-flows';
import {CharacteristicsPermSearchModel} from './shared/characteristics-perm-search.model';
import {CharacteristicsEditDialogComponent} from './dialogs/characteristics-edit-dialog.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ConceptsPermSearchModel} from '../concepts/shared/concepts-perm-search.model';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { PagedListState } from 'src/app/core/classes/paged-list-state';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { UsedInDeviceTypeQuery, UsedInDeviceTypeResponseElement } from '../device-types-overview/shared/used-in-device-type.model';
import {DeviceTypeService} from '../device-types-overview/shared/device-type.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { UrlStateService } from '../../../core/services/url-state.service';
import { KeepPageInRangeDirective } from '../../../core/directives/keep-page-in-range.directive';
import { ConceptsService } from '../concepts/shared/concepts.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatChipSet, MatChip, MatChipAvatar, MatChipRemove } from '@angular/material/chips';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';
import { dialogSize } from '../../../core/dialog-size';

@Component({
    selector: 'senergy-characteristic',
    templateUrl: './characteristics.component.html',
    styleUrls: ['./characteristics.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, SpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatTooltip, MatButton, MatIconButton, MatIcon, MatChipSet, MatChip, MatChipAvatar, MatChipRemove, MatMenu, MatMenuItem, MatMenuTrigger, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, KeepPageInRangeDirective]
})
export class CharacteristicsComponent implements OnInit, AfterViewInit {
    private dialog = inject(MatDialog);
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private characteristicsService = inject(CharacteristicsService);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private dialogsService = inject(DialogsService);
    private deviceTypeService = inject(DeviceTypeService);
    private preferencesService = inject(PreferencesService);
    private urlState = inject(UrlStateService);
    private conceptsService = inject(ConceptsService);

    displayedColumns: string[] = [];
    ready = false;
    dataSource = new MatTableDataSource<DeviceTypeCharacteristicsModel>();
    listSelection = new ListSelection<DeviceTypeCharacteristicsModel>(() => this.dataSource.connect().value);
    selection = this.listSelection.model;
    // 0 until the first answer, so the paginator keeps a page from the URL until the real length is known
    totalCount = 0;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    routerConcept: Pick<ConceptsPermSearchModel, 'name' | 'characteristic_ids'> | null = null;
    selectedTag = '';
    searchText = '';
    list = new PagedListState(this.preferencesService, () => this.getCharacteristics(), { sortBy: 'name', sortDirection: 'asc', urlState: this.urlState });
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    userHasUsedInAuthorization = false;
    usedIn: Map<string,UsedInDeviceTypeResponseElement> = new Map<string, UsedInDeviceTypeResponseElement>();

    constructor() {
        this.getRouterParams();
    }

    ngOnInit() {
        const conceptId = this.urlState.get('concept_id');
        if (this.routerConcept === null && conceptId !== null) {
            // a reload carries no navigation state, so the concept filter is looked up by the id the URL kept
            this.conceptsService.getConceptWithoutCharacteristics(conceptId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((concept) => {
                this.routerConcept = concept;
                this.initSearch();
            });
        } else {
            this.initSearch();
        }
        this.checkAuthorization();
    }

    matSortChange($event: Sort) {
        this.list.sortChanged($event);
        this.reload();
    }


    checkAuthorization() {
        this.userHasUsedInAuthorization = this.deviceTypeService.userHasUsedInAuthorization();
        this.userHasUpdateAuthorization = this.characteristicsService.userHasUpdateAuthorization();
        this.userHasDeleteAuthorization = this.characteristicsService.userHasDeleteAuthorization();
        this.userHasCreateAuthorization = this.characteristicsService.userHasCreateAuthorization();

        // The selection column only exists for the bulk delete.
        this.displayedColumns = [
            ...(this.userHasDeleteAuthorization ? ['select'] : []),
            'name',
            'type',
            'unit',
            ...(this.userHasUsedInAuthorization ? ['useCount'] : []),
            'actions',
        ];
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

    newCharacteristic() {
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('l'));
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(CharacteristicsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((resp: { characteristic: DeviceTypeCharacteristicsModel }) => {
            if (resp !== undefined) {
                this.characteristicsService.createCharacteristic(resp.characteristic).subscribe((characteristic) => {
                    if (characteristic === null) {
                        snackError(this.snackBar, 'Error while creating the characteristic!');
                    } else {
                        snackSuccess(this.snackBar, 'Characteristic created successfully.');
                    }
                    this.reload();
                });
            }
        });
    }

    /** Row click: the edit dialog, or the read-only view of the same dialog without update permission. */
    openCharacteristic(characteristic: CharacteristicsPermSearchModel): void {
        if (this.userHasUpdateAuthorization) {
            this.editCharacteristic(characteristic);
        } else {
            this.showCharacteristic(characteristic);
        }
    }

    /** The schema.org type without its namespace, e.g. `Float`. */
    typeLabel(type: string | undefined): string {
        return (type || '').replace('https://schema.org/', '');
    }

    get filtered(): boolean {
        return this.searchText !== '' || this.routerConcept !== null;
    }

    tagRemoved(): void {
        this.routerConcept = null;
        this.selectedTag = '';
        this.urlState.set({ concept_id: null, page: null });
        this.reload();
    }

    deleteCharacteristic(characteristic: CharacteristicsPermSearchModel): void {
        confirmDelete(this.dialogsService, 'characteristic ' + characteristic.name).subscribe(() => {
            this.ready = false;
            this.characteristicsService
                .deleteCharacteristic(characteristic.id)
                .subscribe((resp: boolean) => {
                    if (resp === true) {
                        snackSuccess(this.snackBar, 'Characteristic deleted successfully.');
                    } else {
                        snackError(this.snackBar, 'Error while deleting the characteristic!');
                    }
                    this.reload();
                });
        });
    }

    editCharacteristic(inputCharacteristic: CharacteristicsPermSearchModel): void {
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('l'));
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            characteristic: JSON.parse(JSON.stringify(inputCharacteristic)), // create copy of object
        };

        const editDialogRef = this.dialog.open(CharacteristicsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((resp: {
            conceptId: string;
            characteristic: DeviceTypeCharacteristicsModel;
        }) => {
            if (resp !== undefined) {
                const newCharacteristic = resp.characteristic;
                this.characteristicsService
                    .updateConcept(newCharacteristic)
                    .subscribe((characteristic: DeviceTypeCharacteristicsModel | null) => {
                        if (characteristic === null) {
                            snackError(this.snackBar, 'Error while updating the characteristic!');
                        } else {
                            snackSuccess(this.snackBar, 'Characteristic updated successfully.');
                        }
                        this.reload();
                    });
            }
        });
    }

    showCharacteristic(inputCharacteristic: CharacteristicsPermSearchModel): void {
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('l'));
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            characteristic: JSON.parse(JSON.stringify(inputCharacteristic)), // create copy of object
            disabled: true
        };

        const editDialogRef = this.dialog.open(CharacteristicsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((resp: {
            conceptId: string;
            characteristic: DeviceTypeCharacteristicsModel;
        }) => {
            if (resp !== undefined) {
                const newCharacteristic = resp.characteristic;
                this.characteristicsService
                    .updateConcept(newCharacteristic)
                    .subscribe((characteristic: DeviceTypeCharacteristicsModel | null) => {
                        if (characteristic === null) {
                            snackError(this.snackBar, 'Error while updating the characteristic!');
                        } else {
                            snackSuccess(this.snackBar, 'Characteristic updated successfully.');
                        }
                        this.reload();
                    });
            }
        });
    }

    private getCharacteristics(): Observable<DeviceTypeCharacteristicsModel[]> {
        if (this.routerConcept !== null) {
            this.selectedTag = this.routerConcept.name;
        }
        return this.characteristicsService
            .getCharacteristics(this.searchText, this.list.pageSize, this.list.offset, this.list.sortBy, this.list.sortDirection, this.routerConcept?.characteristic_ids || [])
            .pipe(
                map((characteristics) => {
                    this.totalCount = characteristics.total;
                    this.setCharacteristics(characteristics.result);
                    this.updateCharacteristicInDeviceTypes(characteristics.result);
                    return characteristics.result;
                })
            );
    }

    private setCharacteristics(characteristics: DeviceTypeCharacteristicsModel[]) {
        this.dataSource.data = characteristics;
    }

    private getRouterParams(): void {
        const navigation: Navigation | null = this.router.getCurrentNavigation();
        if (navigation !== null) {
            if (navigation.extras.state !== undefined) {
                const concept = navigation.extras.state as ConceptsPermSearchModel;
                this.routerConcept = concept;
            }
        }
    }

    reload() {
        this.ready = false;
        this.selectionClear();

        this.list.reload(() => {
            this.ready = true;
        });
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
        bulkDelete(this.dialogsService, this.snackBar, {
            text: countLabel(this.selection.selected.length, 'characteristic', 'characteristics'),
            before: () => {
                this.ready = false;
            },
            jobs: () => this.selection.selected.map((characteristic: DeviceTypeCharacteristicsModel) => this.characteristicsService.deleteCharacteristic(characteristic.id || '')),
            isSuccess: everyTrue,
            successMessage: 'Characteristics deleted successfully.',
            errorMessage: 'Error while deleting characteristics!',
            after: () => this.reload(),
        });
    }

    private updateCharacteristicInDeviceTypes(list: DeviceTypeCharacteristicsModel[]) {
        if (!this.userHasUsedInAuthorization) {
            return;
        }
        const query: UsedInDeviceTypeQuery = {
            resource: 'characteristics',
            ids: list.map(f => f.id || '')
        };
        this.deviceTypeService.getUsedInDeviceType(query).subscribe(result => {
            result?.forEach((value, key) => {
                this.usedIn.set(key, value);
            });
        });
    }

    public showUsedInDialog(usedIn: UsedInDeviceTypeResponseElement | undefined) {
        if (usedIn) {
            this.deviceTypeService.openUsedInDeviceTypeDialog(usedIn);
        }
    }
}
