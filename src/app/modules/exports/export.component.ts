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
import { ExportService } from './shared/export.service';
import { ExportModel, ExportResponseModel } from './shared/export.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../core/services/dialogs.service';
import { map, Observable } from 'rxjs';
import { SearchbarService } from '../../core/components/searchbar/shared/searchbar.service';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { of } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { BrokerExportService } from './shared/broker-export.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UtilService } from 'src/app/core/services/util.service';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import { environment } from '../../../environments/environment';
import { PermissionsDialogService } from '../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../permissions/shared/permissions.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { PermissionsRightsModel } from '../permissions/shared/permissions-rights.model';
import { PermissionsV2RightsAndIdModel } from '../permissions/shared/permissions-resource.model';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { SearchbarComponent } from '../../core/components/searchbar/searchbar.component';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { FormsModule } from '@angular/forms';
import { MatErrorMessagesDirective } from '../../core/directives/matError.directive';
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { NgClass, DatePipe } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { SpinnerComponent } from '../../core/components/spinner/spinner.component';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

/** The bulk DELETE deletes one export after the other and keeps going after a gateway timeout. */
export function bulkDeleteOutcome(status: number, count: number): { message: string; failed: boolean; pending: boolean } {
    const exports = count === 1 ? 'export' : 'exports';
    if (status === 200 || status === 204) {
        return { message: count + ' ' + exports + ' deleted', failed: false, pending: false };
    }
    if (status === 207) {
        return { message: 'Not all ' + exports + ' could be deleted', failed: true, pending: false };
    }
    if (status === 504 || status === 0) {
        return {
            message: 'Deleting takes longer than expected and continues in the background. Reload later to see the result.',
            failed: false,
            pending: true,
        };
    }
    return { message: 'The ' + exports + ' could not be deleted', failed: true, pending: false };
}

@Component({
    selector: 'senergy-export',
    templateUrl: './export.component.html',
    styleUrls: ['./export.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, MatFormField, MatLabel, MtxSelect, FormsModule, MtxOption, MatError, MatErrorMessagesDirective, MatIconButton, MatTooltip, MatIcon, NgClass, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, RouterLink, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, MatFabButton, SpinnerComponent, DatePipe]
})
export class ExportComponent implements OnInit, AfterViewInit {
    private exportService = inject(ExportService);
    private destroyRef = inject(DestroyRef);
    snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private searchbarService = inject(SearchbarService);
    private brokerExportService = inject(BrokerExportService);
    private route = inject(ActivatedRoute);
    utilsService = inject(UtilService);
    private exportDataService = inject(ExportDataService);
    private permissionsDialogService = inject(PermissionsDialogService);
    private permissionsService = inject(PermissionsService);
    private userService = inject(AuthorizationService);
    preferencesService = inject(PreferencesService);

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('sort', { static: false }) sort!: MatSort;

    listSelection = new ListSelection<ExportModel>(
        () => this.exportsDataSource.connect().value,
        { selectable: (row) => this.userHasAdministratePermission(row.ID || '') },
    );
    selection = this.listSelection.model;
    displayedColumns: string[] = [
        'select',
        'filter_type',
        'name',
        'description'
    ];
    totalCount = 0;
    userHasCreateAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasReadUsageAuthorization = false;


    exports: ExportModel[] = [] as ExportModel[];
    exportsDataSource = new MatTableDataSource<ExportModel>();
    showGenerated = localStorage.getItem('data.exports.showGenerated') === 'true';
    usage: {
        exportId: string;
        updateAt: Date;
        bytes: number;
        bytesPerDay: number;
    }[] = [];
    ready = false;

    permissionsPerExports: PermissionsV2RightsAndIdModel[] = [];
    userID = '';
    userRoles: string[] = [];

    public searchText = '';
    public initSearchText = '';
    public searchField = 'name';
    public searchFields = [
        ['Name', 'name'],
        ['Gerätename', 'entity_name'],
        ['Beschreibung', 'description'],
        ['Service', 'service_name'],
    ];
    public brokerMode = false;

    ngAfterViewInit(): void {
        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.reload();
        });

        this.sort.sortChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.paginator.pageIndex = 0;
            this.selectionClear();
            this.reload();
        });
    }

    reload() {
        this.ready = false;
        this.getExports().subscribe({
            next: () => this.ready = true
        });
    }

    ngOnInit() {
        this.initSearchAndGetExports();
        this.getUserData();
        this.checkAuthorization();

        this.route.url.pipe(
            map((url) => {
                if (url[url.length - 1]?.toString() === 'broker') {
                    this.brokerMode = true;
                } else {
                    this.brokerMode = false;
                    if (this.userHasReadUsageAuthorization) {
                        this.displayedColumns.push('usage');
                    }
                }

                this.displayedColumns.push(...[
                    'created_at',
                    'updated_at',
                    'info'
                ]);

                if (this.userHasUpdateAuthorization) {
                    this.displayedColumns.push('edit');
                }
                if (this.userHasDeleteAuthorization) {
                    this.displayedColumns.push('delete');
                }
                this.displayedColumns.push('share');
                if (localStorage.getItem('data.exports.search') !== null) {
                    this.initSearchText = localStorage.getItem('data.exports.search') as string;
                }
                if (localStorage.getItem('data.exports.searchField') !== null) {
                    this.searchField = localStorage.getItem('data.exports.searchField') as string;
                }
                return null;
            }),
            concatMap((_) => this.getExports()),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            next: () => {
                this.ready = true;
            },
            error: () => {
                this.ready = true;
            }
        });
    }

    checkAuthorization() {
        this.userHasCreateAuthorization = this.exportService.userHasCreateAuthorization();
        this.userHasUpdateAuthorization = this.exportService.userHasUpdateAuthorization();
        this.userHasDeleteAuthorization = this.exportService.userHasDeleteAuthorization();
        this.userHasReadUsageAuthorization = this.exportDataService.userHasUsageAuthroization();
    }

    deleteExport(exp: ExportModel) {
        this.dialogsService
            .openDeleteDialog('export')
            .afterClosed()
            .subscribe((deleteExport: boolean | undefined) => {
                if (deleteExport) {
                    this.ready = false;
                    const obs = this.brokerMode ? this.brokerExportService.stopPipeline(exp) : this.exportService.stopPipeline(exp);
                    obs.subscribe((response) => {
                        if (response.status === 204) {
                            snackSuccess(this.snackBar, 'Export deleted');
                            // do deletion on the client instead of reloading, because of caching/slow deletion
                            const index = this.exportsDataSource.data.findIndex(element => element.ID === exp.ID);
                            const data = this.exportsDataSource.data.slice();
                            data.splice(index, 1);
                            this.exportsDataSource.data = data;
                        } else {
                            snackError(this.snackBar, 'Export could not be deleted');
                        }
                        this.ready = true;
                    });
                }
            });
    }

    searchFieldChanged() {
        this.ready = false;
        localStorage.setItem('data.exports.searchField', String(this.searchField));
        this.getExports().subscribe(_ => this.ready = true);
    }

    showGeneratedChanged() {
        this.ready = false;
        this.showGenerated = !this.showGenerated;
        localStorage.setItem('data.exports.showGenerated', String(this.showGenerated));
        this.getExports().subscribe(_ => this.ready = true);
    }

    private getExports(): Observable<any> {
        this.exportsDataSource.sort = this.sort;
        let obs: Observable<any>;
        if (this.brokerMode) {
            obs = this.brokerExportService.getExports(
                this.searchText,
                this.paginator.pageSize,
                this.paginator.pageSize * this.paginator.pageIndex,
                this.sort.active,
                this.sort.direction,
                this.showGenerated ? undefined : false,
                this.searchField,
            ).pipe(
                map((resp: ExportResponseModel | null) => {
                    if (resp !== null) {
                        this.exports = resp.instances || [];
                        if (this.exports === undefined) {
                            this.exports = [];
                        }
                        this.totalCount = resp.total || 0;
                        this.exportsDataSource.data = this.exports;
                    }
                    return resp;
                }));
        } else {
            obs = this.exportService.getExports(
                false,
                this.searchText,
                this.paginator.pageSize,
                this.paginator.pageSize * this.paginator.pageIndex,
                this.sort.active,
                this.sort.direction,
                this.showGenerated ? undefined : false,
                this.searchField,
            ).pipe(
                map((resp: ExportResponseModel | null) => {
                    if (resp !== null) {
                        this.exports = resp.instances || [];
                        if (this.exports === undefined) {
                            this.exports = [];
                        }
                        this.totalCount = resp.total || 0;
                        this.exportsDataSource.data = this.exports;
                    }
                    return resp;
                }),
                concatMap(_ => this.loadExportPermissions()),
                concatMap(_ => {
                    if (this.exports != null && this.exports !== undefined && this.exports.length > 0) {
                        const exportIds = this.exports.filter(e => e.ExportDatabaseID === environment.exportDatabaseIdInternalTimescaleDb && e.ID !== undefined && this.permissionsPerExports.find(x => x.id === e.ID)?.execute === true).map(e => e.ID) as string[];
                        return this.exportDataService.getTimescaleExportUsage(exportIds).pipe(map(usage => {
                            this.usage = usage;
                        }));
                    }
                    return of(null);
                })
            );
        }
        return obs;
    }

    private initSearchAndGetExports() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            localStorage.setItem('data.exports.search', this.searchText);
            this.reload();
        });
    }

    isAllSelected() {
        return this.listSelection.isAllSelected();
    }

    masterToggle() {
        this.listSelection.masterToggle();
    }

    selectionClear($event: PageEvent | undefined = undefined): void {
        if ($event !== undefined) {
            this.preferencesService.pageSize = $event.pageSize;
        }
        this.selection.clear();
    }

    deleteMultipleItems(): void {
        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' exports' : ' export'))
            .afterClosed()
            .subscribe((deleteExports: boolean | undefined) => {
                if (deleteExports) {
                    this.ready = false;

                    const exportIDs: string[] = [];

                    this.selection.selected.forEach((exp: ExportModel) => {
                        if (exp.ID !== undefined) {
                            exportIDs.push(exp.ID);
                        }
                    });
                    const obs = this.brokerMode
                        ? this.brokerExportService.stopPipelines(exportIDs)
                        : this.exportService.stopPipelines(exportIDs);
                    obs.subscribe((response) => {
                        const outcome = bulkDeleteOutcome(response.status, exportIDs.length);
                        if (outcome.failed) {
                            snackError(this.snackBar, outcome.message);
                        } else {
                            this.snackBar.open(outcome.message, 'close', { duration: outcome.pending ? undefined : 2000 });
                        }
                        this.paginator.pageIndex = 0;
                        this.selectionClear();
                        this.getExports().subscribe(_ => this.ready = true);
                    });
                }
            });
    }

    getUsage(e: ExportModel) {
        return this.usage.find(u => u.exportId === e.ID);
    }

    formatBytes(bytes: number, decimals = 2) {
        if (bytes === -1) {
            return '';
        }
        if (!+bytes) {
            return '0 Bytes';
        }

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    getUsageTooltip(d: ExportModel): string {
        const usage = this.getUsage(d);
        if (usage === undefined) {
            return '';
        }
        return this.formatBytes(usage?.bytesPerDay || 0) + '/day, ' + this.formatBytes((usage?.bytesPerDay || 0) * 30) + '/month';
    }

    shareExport(exp: ExportModel): void {
        if (exp.ID == null) {
            return;
        }
        this.permissionsDialogService.openPermissionV2Dialog('export-instances', exp.ID, exp.Name || '');
    }

    loadExportPermissions(): Observable<PermissionsRightsModel[]> {
        return this.permissionsService.getComputedResourcePermissionsV2('export-instances', this.exports.map(e => e.ID || '')).pipe(
            map(perms => this.permissionsPerExports = perms)
        );
    }

    getUserData() {
        const userIDResp = this.userService.getUserId();
        if (typeof (userIDResp) == 'string') {
            this.userID = userIDResp;
        }
        this.userRoles = this.userService.getUserRoles();
    }

    userHasAdministratePermission(id: string): boolean {
        return this.permissionsPerExports.find(e => e.id === id)?.administrate || false;
    }

    userHasWritePermission(id: string): boolean {
        return this.permissionsPerExports.find(e => e.id === id)?.write || false;
    }
}
