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
import { LIST_DATE_FORMAT } from 'src/app/core/classes/list-date-format';
import { ImportInstancesModel } from './shared/import-instances.model';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { ImportInstancesService } from './shared/import-instances.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ImportDeployEditDialogComponent, ImportDeployEditDialogData } from '../import-deploy-edit-dialog/import-deploy-edit-dialog.component';
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
import { MatPaginator } from '@angular/material/paginator';
import { PermissionsV2RightsAndIdModel } from '../../permissions/shared/permissions-resource.model';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatChipSet, MatChip, MatChipRemove, MatChipListbox, MatChipOption } from '@angular/material/chips';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { DatePipe } from '@angular/common';
import { snackError } from 'src/app/core/services/snack-bar-messages';
import { UrlStateService } from '../../../core/services/url-state.service';
import { KeepPageInRangeDirective } from '../../../core/directives/keep-page-in-range.directive';

@Component({
    selector: 'senergy-import-instances',
    templateUrl: './import-instances.component.html',
    styleUrls: ['./import-instances.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatTooltip, MatIcon, MatChipSet, MatChip, MatChipRemove, MatChipListbox, MatChipOption, SpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, KeepPageInRangeDirective, DatePipe]
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
    readonly dateFormat = LIST_DATE_FORMAT;
    private permissionsDialogService = inject(PermissionsDialogService);
    private permissionsService = inject(PermissionsService);
    private userService = inject(AuthorizationService);
    private preferencesService = inject(PreferencesService);
    private urlState = inject(UrlStateService);

    displayedColumns: string[] = [];
    dataSource = new MatTableDataSource<ImportInstancesModel>();
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    searchText = '';
    // 0 until the first answer, so the paginator keeps a page from the URL until the real length is known
    totalCount = 0;
    listSelection = new ListSelection<ImportInstancesModel>(
        () => this.dataSource.connect().value,
        { selectable: (row) => this.userHasAdministratePermission(row.id || '') },
    );
    selection = this.listSelection.model;
    dataReady = false;
    list = new PagedListState(this.preferencesService, () => this.loadList(), { sortBy: 'updated_at', sortDirection: 'desc', urlState: this.urlState });
    excludeGenerated = localStorage.getItem('import.instances.excludeGenerated') === 'true';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    permissionsPerInstance: PermissionsV2RightsAndIdModel[] = [];
    userID = '';
    userRoles: string[] = [];
    instanceId: string | null = null;

    private paramsSeen = false;

    ngOnInit(): void {
        this.excludeGenerated = !this.urlState.getShown('generated', !this.excludeGenerated);
        this.checkAuthorization();
        this.initSearch();
        // The first emission only reads the filter; the search starts the first load.
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const instanceId = params.get('id');
            const changed = this.paramsSeen && instanceId !== this.instanceId;
            this.instanceId = instanceId;
            this.paramsSeen = true;
            if (changed) {
                this.reload();
            }
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
    }

    ngAfterViewInit(): void {
        this.list.connect(this.paginator, this.destroyRef);
        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.selectionClear());
    }

    checkAuthorization() {
        this.userHasUpdateAuthorization = this.importInstancesService.userHasUpdateAuthorization();
        this.userHasDeleteAuthorization = this.importInstancesService.userHasDeleteAuthorization();
        this.userHasCreateAuthorization = this.importInstancesService.userHasCreateAuthorization();
        // The selection column only exists for the bulk delete.
        this.displayedColumns = [
            ...(this.userHasDeleteAuthorization ? ['select'] : []),
            'name', 'status', 'image', 'created_at', 'updated_at', 'actions',
        ];
    }

    get filtered(): boolean {
        return this.searchText !== '' || this.excludeGenerated || this.instanceId !== null;
    }

    canEdit(m: ImportInstancesModel): boolean {
        return this.userHasUpdateAuthorization && this.userHasEditPermission(m.id);
    }

    /** Opens the edit dialog; read-only it only shows the import, for rows the user may not update. */
    edit(m: ImportInstancesModel, readOnly = false) {
        const data: ImportDeployEditDialogData = readOnly ? { ...m, readOnly: true } : m;
        const config: MatDialogConfig = {
            data,
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

    setExcludeGenerated(exclude: boolean) {
        if (exclude === this.excludeGenerated) {
            return;
        }
        this.excludeGenerated = exclude;
        localStorage.setItem('import.instances.excludeGenerated', '' + this.excludeGenerated);
        // written explicitly: the default is the stored value, which a removed parameter would not restore
        this.urlState.set({ generated: exclude ? 'hide' : 'show', page: null });
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
