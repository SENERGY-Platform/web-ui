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

import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ExportService } from './shared/export.service';
import { ExportModel, ExportResponseModel } from './shared/export.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../core/services/dialogs.service';
import { Subscription, map, Observable } from 'rxjs';
import { SearchbarService } from '../../core/components/searchbar/shared/searchbar.service';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { of } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { BrokerExportService } from './shared/broker-export.service';
import { ActivatedRoute } from '@angular/router';
import { UtilService } from 'src/app/core/services/util.service';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import { environment } from '../../../environments/environment';
import { PermissionsDialogService } from '../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../permissions/shared/permissions.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { PermissionsRightsModel } from '../permissions/shared/permissions-rights.model';
import { PermissionsV2RightsAndIdModel } from '../permissions/shared/permissions-resource.model';
import { PreferencesService } from 'src/app/core/services/preferences.service';

@Component({
    selector: 'senergy-export',
    templateUrl: './export.component.html',
    styleUrls: ['./export.component.css'],
})
export class ExportComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('sort', { static: false }) sort!: MatSort;

    selection = new SelectionModel<ExportModel>(true, []);
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
    private searchSub: Subscription = new Subscription();

    private exportSub: Subscription = new Subscription();

    public brokerMode = false;

    constructor(
        private exportService: ExportService,
        public snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private searchbarService: SearchbarService,
        private brokerExportService: BrokerExportService,
        private route: ActivatedRoute,
        public utilsService: UtilService,
        private exportDataService: ExportDataService,
        private permissionsDialogService: PermissionsDialogService,
        private permissionsService: PermissionsService,
        private userService: AuthorizationService,
        public preferencesService: PreferencesService,
    ) { }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(() => {
            this.reload();
        });

        this.sort.sortChange.subscribe(() => {
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
            concatMap((_) => this.getExports())
        ).subscribe({
            next: () => {
                this.ready = true;
            },
            error: () => {
                this.ready = true;
            }
        });
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
        this.exportSub.unsubscribe();
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
            .subscribe((deleteExport: boolean) => {
                if (deleteExport) {
                    this.ready = false;
                    const obs = this.brokerMode ? this.brokerExportService.stopPipeline(exp) : this.exportService.stopPipeline(exp);
                    obs.subscribe((response) => {
                        if (response.status === 204) {
                            this.snackBar.open('Export deleted', undefined, {
                                duration: 2000,
                            });
                            // do deletion on the client instead of reloading, because of caching/slow deletion
                            const index = this.exportsDataSource.data.findIndex(element => element.ID === exp.ID);
                            this.exportsDataSource.data.splice(index, 1);
                            this.exportsDataSource.data = this.exportsDataSource.data;
                        } else {
                            this.snackBar.open('Export could not be deleted', 'close', { panelClass: 'snack-bar-error' });
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
            );
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
                    if (this.exports !=null && this.exports !== undefined && this.exports.length > 0) {
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
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            localStorage.setItem('data.exports.search', this.searchText);
            this.reload();
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        return numSelected === this.getAllDeleteableExports().length;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.selection.select(...this.getAllDeleteableExports());
        }
    }

    private getAllDeleteableExports(): ExportModel[] {
        const res: ExportModel[] = [];
        this.exportsDataSource.connect().value.forEach((row) => {
            if (this.userHasAdministratePermission(row.ID || '')) {
                res.push(row);
            }
        });
        return res;
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
            .subscribe((deleteExports: boolean) => {
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
                    obs.subscribe(() => {
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
