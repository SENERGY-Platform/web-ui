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
import { Sort, SortDirection, MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { UsedInDeviceTypeQuery, UsedInDeviceTypeResponseElement } from '../device-types-overview/shared/used-in-device-type.model';
import {DeviceTypeService} from '../device-types-overview/shared/device-type.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { NgClass } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-characteristic',
    templateUrl: './characteristics.component.html',
    styleUrls: ['./characteristics.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, SpinnerComponent, NgClass, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatTooltip, MatIconButton, MatIcon, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, MatFabButton]
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

    displayedColumns = ['select', 'name'];
    pageSize = this.preferencesService.pageSize;
    ready = false;
    dataSource = new MatTableDataSource<DeviceTypeCharacteristicsModel>();
    listSelection = new ListSelection<DeviceTypeCharacteristicsModel>(() => this.dataSource.connect().value);
    selection = this.listSelection.model;
    totalCount = 200;
    offset = 0;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    routerConcept: ConceptsPermSearchModel | null = null;
    selectedTag = '';
    searchText = '';
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    userHasUsedInAuthorization = false;
    usedIn: Map<string,UsedInDeviceTypeResponseElement> = new Map<string, UsedInDeviceTypeResponseElement>();

    constructor() {
        this.getRouterParams();
    }

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.reload();
    }


    checkAuthorization() {
        this.userHasUsedInAuthorization = this.deviceTypeService.userHasUsedInAuthorization();
        if(this.userHasUsedInAuthorization) {
            this.displayedColumns.push('useCount');
        }

        this.displayedColumns.push('info');

        this.userHasUpdateAuthorization = this.characteristicsService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.characteristicsService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }

        this.userHasCreateAuthorization = this.characteristicsService.userHasCreateAuthorization();
    }

    ngAfterViewInit(): void {
        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e)=>{
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getCharacteristics().subscribe();
        });
    }

    private initSearch() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    newCharacteristic() {
        const dialogConfig = new MatDialogConfig();
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

    tagRemoved(): void {
        this.routerConcept = null;
        this.selectedTag = '';
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
            .getCharacteristics(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection, this.routerConcept?.characteristic_ids || [])
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
        this.offset = 0;
        this.selectionClear();

        this.getCharacteristics().subscribe(_ => {
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
