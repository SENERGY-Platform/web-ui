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
import { ExportService } from './shared/export.service';
import { ExportModel, ExportResponseModel } from './shared/export.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../core/services/dialogs.service';
import { catchError, map, Observable, Subject, switchMap, tap } from 'rxjs';
import { SearchbarService } from '../../core/components/searchbar/shared/searchbar.service';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatSort, MatSortHeader, Sort, SortDirection } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { of } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { BrokerExportService } from './shared/broker-export.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import { environment } from '../../../environments/environment';
import { PermissionsDialogService } from '../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../permissions/shared/permissions.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { PermissionsRightsModel } from '../permissions/shared/permissions-rights.model';
import { PermissionsV2RightsAndIdModel } from '../permissions/shared/permissions-resource.model';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { PageHeaderComponent } from '../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../core/components/empty-state/empty-state.component';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { SpinnerComponent } from '../../core/components/spinner/spinner.component';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';
import { UrlStateService } from '../../core/services/url-state.service';
import { KeepPageInRangeDirective } from '../../core/directives/keep-page-in-range.directive';

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
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, MatFormField, MatLabel, MtxSelect, FormsModule, MtxOption, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatChipListbox, MatChipOption, MatTooltip, MatIcon, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, RouterLink, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, KeepPageInRangeDirective, SpinnerComponent, DatePipe]
})
export class ExportComponent implements OnInit, AfterViewInit {
    private exportService = inject(ExportService);
    private destroyRef = inject(DestroyRef);
    snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private searchbarService = inject(SearchbarService);
    private brokerExportService = inject(BrokerExportService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    readonly dateFormat = LIST_DATE_FORMAT;
    private exportDataService = inject(ExportDataService);
    private permissionsDialogService = inject(PermissionsDialogService);
    private permissionsService = inject(PermissionsService);
    private userService = inject(AuthorizationService);
    preferencesService = inject(PreferencesService);
    private urlState = inject(UrlStateService);

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('sort', { static: false }) sort!: MatSort;

    listSelection = new ListSelection<ExportModel>(
        () => this.exportsDataSource.connect().value,
        { selectable: (row) => this.userHasAdministratePermission(row.ID || '') },
    );
    selection = this.listSelection.model;
    displayedColumns: string[] = [];
    totalCount = 0;
    pageIndex = 0;
    initialSort: { active: string; direction: SortDirection } = { active: 'created_at', direction: 'desc' };
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
    private loadRequests = new Subject<void>();

    ngAfterViewInit(): void {
        // set up once: every reload only triggers this pipeline, and a newer request drops the answer of an older one
        this.loadRequests.pipe(
            tap(() => this.ready = false),
            switchMap(() => this.getExports().pipe(catchError(() => of(null)))),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe(() => this.ready = true);

        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e: PageEvent) => {
            this.pageIndex = e.pageIndex;
            this.urlState.setPage(e.pageIndex);
            this.loadRequests.next();
        });

        this.sort.sortChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((sort: Sort) => {
            this.resetToFirstPage();
            this.selectionClear();
            this.urlState.setSort(sort, 'created_at', 'desc');
            this.loadRequests.next();
        });
    }

    private resetToFirstPage() {
        this.pageIndex = 0;
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.urlState.setPage(0);
    }

    /**
     * The one reload path: search, search field, generated filter and the refresh button all end here, on page one.
     * The opening search keeps the page from the URL.
     */
    reload(keepPage = false) {
        if (!keepPage) {
            this.resetToFirstPage();
        }
        this.selectionClear();
        this.loadRequests.next();
    }

    get filtered(): boolean {
        return this.searchText !== '' || this.showGenerated;
    }

    ngOnInit() {
        this.initialSort = this.urlState.getSort('created_at', 'desc');
        this.pageIndex = this.urlState.getPage();
        this.showGenerated = this.urlState.getShown('generated', this.showGenerated);
        this.initSearchAndGetExports();
        this.getUserData();
        this.checkAuthorization();

        this.route.url.pipe(
            map((url) => {
                if (url[url.length - 1]?.toString() === 'broker') {
                    this.brokerMode = true;
                } else {
                    this.brokerMode = false;
                }

                // The selection column only exists for the bulk delete.
                this.displayedColumns = [
                    ...(this.userHasDeleteAuthorization ? ['select'] : []),
                    'name',
                    'filter_type',
                    ...(!this.brokerMode && this.userHasReadUsageAuthorization ? ['usage'] : []),
                    'created_at',
                    'updated_at',
                    'actions',
                ];
                // the searchbar takes a search from the URL itself, so the stored one only applies without it
                if (localStorage.getItem('data.exports.search') !== null && this.urlState.get('search') === null) {
                    this.initSearchText = localStorage.getItem('data.exports.search') as string;
                }
                if (localStorage.getItem('data.exports.searchField') !== null) {
                    this.searchField = localStorage.getItem('data.exports.searchField') as string;
                }
                // the field ends up in the request's query string, so only one of the offered fields is taken
                const urlSearchField = this.urlState.get('search-field');
                if (urlSearchField !== null && this.searchFields.some((field) => field[1] === urlSearchField)) {
                    this.searchField = urlSearchField;
                }
            }),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe();
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
                            this.reload();
                        } else {
                            snackError(this.snackBar, 'Export could not be deleted');
                            this.ready = true;
                        }
                    });
                }
            });
    }

    searchFieldChanged() {
        localStorage.setItem('data.exports.searchField', String(this.searchField));
        // written explicitly: the default is the stored value, which a removed parameter would not restore
        this.urlState.set({ 'search-field': String(this.searchField) });
        this.reload();
    }

    setShowGenerated(show: boolean) {
        if (show === this.showGenerated) {
            return;
        }
        this.showGenerated = show;
        localStorage.setItem('data.exports.showGenerated', String(this.showGenerated));
        // written explicitly for the same reason as the search field
        this.urlState.set({ generated: this.showGenerated ? 'show' : 'hide' });
        this.reload();
    }

    /** The row click and the first menu entry. */
    openDetails(exp: ExportModel) {
        this.router.navigate(['/exports/details', exp.ID]);
    }

    editExport(exp: ExportModel) {
        this.router.navigate(['/exports/edit', exp.ID]);
    }

    /** What the export reads from: a device, a pipeline or an import. */
    sourceLabel(exp: ExportModel): string {
        switch (exp.FilterType) {
            case 'deviceId':
                return 'Device';
            case 'operatorId':
                return 'Pipeline';
            case 'import_id':
                return 'Import';
            default:
                return '';
        }
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
        // the first search is the one the page was opened with, so it keeps the page from the URL
        let opening = true;
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            localStorage.setItem('data.exports.search', this.searchText);
            this.reload(opening);
            opening = false;
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
                        this.reload();
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
