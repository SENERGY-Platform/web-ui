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
import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ImportInstancesModel } from './shared/import-instances.model';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { ImportInstancesService } from './shared/import-instances.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ImportDeployEditDialogComponent } from '../import-deploy-edit-dialog/import-deploy-edit-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { bulkDelete, countLabel } from '../../../core/services/delete-flows';
import { ImportInstanceExportDialogComponent } from './import-instance-export-dialog/import-instance-export-dialog.component';
import { ExportModel } from '../../exports/shared/export.model';
import { Router, ActivatedRoute } from '@angular/router';
import { EMPTY, Observable, map, concatMap, tap, catchError, forkJoin } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { PagedListState } from 'src/app/core/classes/paged-list-state';
import { UtilService } from 'src/app/core/services/util.service';
import { MatPaginator } from '@angular/material/paginator';
import { PermissionsV2RightsAndIdModel } from '../../permissions/shared/permissions-resource.model';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatChipSet, MatChip, MatChipRemove } from '@angular/material/chips';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { NgClass, DatePipe } from '@angular/common';
import { snackError } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-import-instances',
    templateUrl: './import-instances.component.html',
    styleUrls: ['./import-instances.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, MatIconButton, MatTooltip, MatIcon, MatChipSet, MatChip, MatChipRemove, SpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, NgClass, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, DatePipe]
})
export class ImportInstancesComponent implements OnInit, AfterViewInit {
    private importInstancesService = inject(ImportInstancesService);
    private destroyRef = inject(DestroyRef);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);
    private deleteDialog = inject(DialogsService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private searchbarService = inject(SearchbarService);
    utilsService = inject(UtilService);
    private permissionsDialogService = inject(PermissionsDialogService);
    private permissionsService = inject(PermissionsService);
    private userService = inject(AuthorizationService);
    private preferencesService = inject(PreferencesService);

    displayedColumns = ['select', 'status', 'name', 'image', 'created_at', 'updated_at', 'export'];
    dataSource = new MatTableDataSource<ImportInstancesModel>();
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    searchText = '';
    totalCount = 200;
    listSelection = new ListSelection<ImportInstancesModel>(
        () => this.dataSource.connect().value,
        { selectable: (row) => this.userHasAdministratePermission(row.id || '') },
    );
    selection = this.listSelection.model;
    dataReady = false;
    list = new PagedListState(this.preferencesService, () => this.loadList(), { sortBy: 'updated_at', sortDirection: 'desc' });
    excludeGenerated = localStorage.getItem('import.instances.excludeGenerated') === 'true';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    permissionsPerInstance: PermissionsV2RightsAndIdModel[] = [];
    userID = '';
    userRoles: string[] = [];
    instanceId: string | null = null;

    ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            this.instanceId = params.get('id');
            this.initSearch();
            this.getTotalNumberOfTypes();
        });
        const userIDResp = this.userService.getUserId();
        if(typeof(userIDResp) == 'string') {
            this.userID = userIDResp;
        }
        this.userRoles = this.userService.getUserRoles();
    }

    getTotalNumberOfTypes(): Observable<number> {
        if (this.instanceId) {
            this.totalCount = 1;
            return new Observable(observer => {
                observer.next(1);
                observer.complete();
            });
        }
        return this.importInstancesService.getTotalCountOfInstances(this.searchText, this.excludeGenerated).pipe(
            map((totalCount: number) => {
                this.totalCount = totalCount;
                return totalCount;
            })
        );
    }

    private initSearch() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.list.connect(this.paginator, this.destroyRef);
        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.selectionClear());
    }

    checkAuthorization() {
        this.userHasUpdateAuthorization = this.importInstancesService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.importInstancesService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
        this.displayedColumns.push('share');
        this.userHasCreateAuthorization = this.importInstancesService.userHasCreateAuthorization();
    }

    edit(m: ImportInstancesModel) {
        const config: MatDialogConfig = {
            data: m,
            minHeight: '400px',
            minWidth: '600px',
        };
        this.dialog
            .open(ImportDeployEditDialogComponent, config)
            .afterClosed()
            .subscribe((val) => {
                if (val !== undefined) {
                    this.reload();
                }
            });
    }

    delete(m: ImportInstancesModel) {
        this.deleteDialog
            .openDeleteDialog('import')
            .afterClosed()
            .subscribe((del) => {
                if (del === true) {
                    this.dataReady = false;
                    this.importInstancesService.deleteImportInstance(m.id).subscribe(
                        () => {
                            this.snackBar.open('Import deleted', 'OK', { duration: 3000 });
                        },
                        (err) => {
                            console.error(err);
                            snackError(this.snackBar, 'Error deleting');
                        },
                    );
                    this.reload();
                }
            });
    }

    matSortChange($event: Sort) {
        this.list.sortChanged($event);
        this.reload();
    }

    load(): Observable<any> {
        this.dataReady = false;
        const ids = this.instanceId ? [this.instanceId] : undefined;
        return this.importInstancesService
            .listImportInstances(this.searchText, this.list.pageSize, this.list.offset, this.list.sortBy + '.' + this.list.sortDirection, this.excludeGenerated, ids)
            .pipe(
                map((inst: ImportInstancesModel[]) => {
                    this.dataSource.data = inst;
                    return inst;
                }),
                concatMap((a) => this.permissionsService.getComputedResourcePermissionsV2('import-instances', this.dataSource.data.map(i => i.id)).pipe(
                    map(permissions => this.permissionsPerInstance = permissions),
                    map(_ => a)
                )),
            );
    }

    private withCount = false;

    // A reload waits for list and count together, a page change only for the list.
    private loadList(): Observable<unknown> {
        const request: Observable<unknown> = this.withCount ? forkJoin([this.load(), this.getTotalNumberOfTypes()]) : this.load();
        this.withCount = false;
        return request.pipe(
            tap(() => this.dataReady = true),
            catchError((err) => {
                this.handleLoadError(err);
                return EMPTY;
            }),
        );
    }

    reload() {
        this.selectionClear();
        this.dataReady = false;

        this.withCount = true;
        this.list.reload();
    }

    private handleLoadError(err: any) {
        console.error(err);
        snackError(this.snackBar, 'Error loading imports');
        this.dataReady = true;
    }


    export(m: ImportInstancesModel) {
        const config: MatDialogConfig = {
            data: m,
            minHeight: '300px',
            minWidth: '400px',
        };
        this.dialog
            .open(ImportInstanceExportDialogComponent, config)
            .afterClosed()
            .subscribe((val: ExportModel | undefined) => {
                if (val !== undefined) {
                    this.router.navigateByUrl('exports/details/' + val.ID);
                }
            });
    }

    toggleExcludeGenerated() {
        this.excludeGenerated = !this.excludeGenerated;
        localStorage.setItem('import.instances.excludeGenerated', '' + this.excludeGenerated);
        this.reload();
    }

    clearInstanceFilter() {
        this.router.navigate([], { 
            relativeTo: this.route,
            queryParams: { id: null },
            queryParamsHandling: 'merge'
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
        const text = countLabel(this.selection.selected.length, 'import instance', 'import instances');
        bulkDelete(this.deleteDialog, this.snackBar, {
            text,
            before: () => {
                this.dataReady = false;
            },
            jobs: () => this.selection.selected.map((importInstance: ImportInstancesModel) => this.importInstancesService.deleteImportInstance(importInstance.id)),
            successMessage: text + ' deleted successfully.',
            errorMessage: 'Error while deleting ' + text + '!',
            onError: (err) => console.error(err),
            after: () => this.reload(),
        });
    }

    userHasEditPermission(instanceId: string) {
        return this.permissionsPerInstance.find(e => e.id === instanceId)?.write || false;
    }


    userHasAdministratePermission(instanceId: string) {
        return this.permissionsPerInstance.find(e => e.id === instanceId)?.administrate || false;
    }

    shareInstance(instance: ImportInstancesModel): void {
        if(instance.id == null) {
            return;
        }
        this.permissionsDialogService.openPermissionV2Dialog('import-instances', instance.id, instance.name || '');
    }
}
