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

import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {forkJoin, Observable, Subscription, map, skip} from 'rxjs';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogConfig} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {DialogsService} from '../../../core/services/dialogs.service';
import {FunctionsService} from './shared/functions.service';
import {DeviceTypeFunctionModel} from '../device-types-overview/shared/device-type.model';
import {FunctionsEditDialogComponent} from './dialog/functions-edit-dialog.component';
import {FunctionsCreateDialogComponent} from './dialog/functions-create-dialog.component';
import {AuthorizationService} from '../../../core/services/authorization.service';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Sort, SortDirection, MatSort, MatSortHeader } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import {ConceptsService} from '../concepts/shared/concepts.service';
import {DeviceTypeService} from '../device-types-overview/shared/device-type.service';
import {
    UsedInDeviceTypeQuery,
    UsedInDeviceTypeResponseElement
} from '../device-types-overview/shared/used-in-device-type.model';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { MatChipSet, MatChip, MatChipAvatar, MatChipRemove } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { NgClass } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton, MatFabButton } from '@angular/material/button';

@Component({
    selector: 'senergy-functions',
    templateUrl: './functions.component.html',
    styleUrls: ['./functions.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, MatChipSet, MatChip, MatIcon, MatChipAvatar, MatChipRemove, MatTooltip, SpinnerComponent, NgClass, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatIconButton, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, MatFabButton]
})
export class FunctionsComponent implements OnInit, OnDestroy, AfterViewInit {
    displayedColumns = ['select', 'name'];
    pageSize = this.preferencesService.pageSize;
    dataSource = new MatTableDataSource<DeviceTypeFunctionModel>();
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    selection = new SelectionModel<DeviceTypeFunctionModel>(true, []);
    totalCount = 200;
    offset = 0;
    ready = false;
    userIsAdmin = false;
    private searchSub: Subscription = new Subscription();
    private routeSub: Subscription = new Subscription();
    // one listing in flight at a time: a slower, superseded answer must not overwrite a newer one
    private loadSub: Subscription = new Subscription();
    searchText = '';
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    userHasUsedInAuthorization = false;
    usedIn: Map<string,UsedInDeviceTypeResponseElement> = new Map<string, UsedInDeviceTypeResponseElement>();
    conceptIds: string[] = [];
    conceptNames: string[] = [];

    constructor(
        private dialog: MatDialog,
        private searchbarService: SearchbarService,
        private functionsService: FunctionsService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private authService: AuthorizationService,
        private deviceTypeService: DeviceTypeService,
        private preferencesService: PreferencesService,
        private route: ActivatedRoute,
        private router: Router,
        private conceptsService: ConceptsService,
    ) {}

    ngOnInit() {
        this.userIsAdmin = this.authService.userIsAdmin();
        this.readConceptFilter(this.route.snapshot.queryParamMap);
        this.initSearch();
        this.routeSub = this.route.queryParamMap.pipe(skip(1)).subscribe((params) => {
            if (this.readConceptFilter(params)) {
                this.reload();
            }
        });
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((e)=> {
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.load();
        });
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
        this.routeSub.unsubscribe();
        this.loadSub.unsubscribe();
    }

    /** Takes the `concept_ids` query parameter as the active filter and reports whether it changed. */
    private readConceptFilter(params: ParamMap): boolean {
        const ids = (params.get('concept_ids') || '').split(',').filter((id) => id !== '');
        if (ids.join(',') === this.conceptIds.join(',')) {
            return false;
        }
        this.conceptIds = ids;
        this.conceptNames = ids;
        if (ids.length > 0) {
            forkJoin(ids.map((id) => this.conceptsService.getConceptWithoutCharacteristics(id))).subscribe((concepts) => {
                // a newer filter may have replaced this one while the names were loading
                if (this.conceptIds === ids) {
                    this.conceptNames = concepts.map((c, i) => c?.name || ids[i]);
                }
            });
        }
        return true;
    }

    clearConceptFilter(): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {concept_ids: null},
            queryParamsHandling: 'merge',
        });
    }

    checkAuthorization() {
        this.userHasUsedInAuthorization = this.deviceTypeService.userHasUsedInAuthorization();
        if(this.userHasUsedInAuthorization) {
            this.displayedColumns.push('useCount');
        }

        this.displayedColumns.push('info');

        this.userHasUpdateAuthorization = this.functionsService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }
        this.userHasDeleteAuthorization = this.functionsService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
        this.userHasCreateAuthorization = this.functionsService.userHasCreateAuthorization();
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    editFunction(inputFunction: DeviceTypeFunctionModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            function: JSON.parse(JSON.stringify(inputFunction)), // create copy of object
        };

        const editDialogRef = this.dialog.open(FunctionsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newFunction: DeviceTypeFunctionModel) => {
            if (newFunction !== undefined) {
                this.functionsService.updateFunction(newFunction).subscribe((func: DeviceTypeFunctionModel | null) => {
                    this.reloadAndShowSnackbar(func, 'updat');
                });
            }
        });
    }

    showFunction(inputFunction: DeviceTypeFunctionModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            function: JSON.parse(JSON.stringify(inputFunction)), // create copy of object
            disabled: true,
        };

        const editDialogRef = this.dialog.open(FunctionsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newFunction: DeviceTypeFunctionModel) => {
            if (newFunction !== undefined) {
                this.functionsService.updateFunction(newFunction).subscribe((func: DeviceTypeFunctionModel | null) => {
                    this.reloadAndShowSnackbar(func, 'updat');
                });
            }
        });
    }

    newFunction(): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;

        const editDialogRef = this.dialog.open(FunctionsCreateDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newFunction: DeviceTypeFunctionModel) => {
            console.log(newFunction);
            if (newFunction !== undefined) {
                this.functionsService.createFunction(newFunction).subscribe((func: DeviceTypeFunctionModel | null) => {
                    this.reloadAndShowSnackbar(func, 'sav');
                });
            }
        });
    }

    deleteFunction(func: DeviceTypeFunctionModel): void {
        this.dialogsService
            .openDeleteDialog('function ' + func.name)
            .afterClosed()
            .subscribe((deleteFunction: boolean) => {
                if (deleteFunction) {
                    this.ready = false;
                    this.functionsService.deleteFunction(func.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.snackBar.open('Function deleted successfully.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting the function!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        this.reload();
                    });
                }
            });
    }

    private getFunctions(): Observable<DeviceTypeFunctionModel[]> {
        return this.functionsService
            .getFunctions(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection, this.conceptIds)
            .pipe(
                map(functions => {
                    this.totalCount = functions.total;
                    this.dataSource = new MatTableDataSource(functions.result);
                    this.updateFunctionUsedInDeviceTypes(functions.result);
                    return functions.result;
                })
            );
    }

    reload() {
        this.ready = false;
        this.offset = 0;
        // reload starts at the first page, so the paginator has to say so too
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.selectionClear();
        this.load(() => {
            this.ready = true;
        });
    }

    private load(done?: () => void): void {
        this.loadSub.unsubscribe();
        this.loadSub = this.getFunctions().subscribe(() => done?.());
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.reload();
    }

    private reloadAndShowSnackbar(func: DeviceTypeFunctionModel | null, text: string) {
        if (func === null) {
            this.snackBar.open('Error while ' + text + 'ing the function!', 'close', { panelClass: 'snack-bar-error' });
            this.reload();
        } else {
            this.snackBar.open('Function ' + text + 'ed successfully.', undefined, { duration: 2000 });
            this.reload();
        }
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
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' functions' : ' function'))
            .afterClosed()
            .subscribe((deleteExports: boolean) => {
                if (deleteExports) {
                    this.ready = false;
                    this.selection.selected.forEach((func: DeviceTypeFunctionModel) => {
                        deletionJobs.push(this.functionsService.deleteFunction(func.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.every((r: boolean) => r === true);
                    if (ok) {
                        this.snackBar.open('Functions deleted successfully.', undefined, {duration: 2000});
                    } else {
                        this.snackBar.open('Error while deleting functions!', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.reload();
                });
            });
    }

    private updateFunctionUsedInDeviceTypes(functions: DeviceTypeFunctionModel[]) {
        if (!this.userHasUsedInAuthorization) {
            return;
        }
        const query: UsedInDeviceTypeQuery = {
            resource: 'functions',
            ids: functions.map(f => f.id)
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
