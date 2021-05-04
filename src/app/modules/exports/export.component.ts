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

import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ExportService} from './shared/export.service';
import {ExportModel, ExportResponseModel} from './shared/export.model';
import {environment} from '../../../environments/environment';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogsService} from '../../core/services/dialogs.service';
import {ResponsiveService} from '../../core/services/responsive.service';
import {ClipboardService} from 'ngx-clipboard';
import {merge, Subscription} from 'rxjs';
import {SearchbarService} from '../../core/components/searchbar/shared/searchbar.service';
import {SelectionModel} from '@angular/cdk/collections';
import {MatTableDataSource} from '@angular/material/table';
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {startWith, switchMap} from 'rxjs/internal/operators';
import {BrokerExportService} from './shared/broker-export.service';
import {ActivatedRoute} from '@angular/router';

@Component({
    selector: 'senergy-export',
    templateUrl: './export.component.html',
    styleUrls: ['./export.component.css']
})

export class ExportComponent implements OnInit, OnDestroy {

    @ViewChild('paginator', {static: false}) paginator!: MatPaginator;
    @ViewChild('sort', {static: false}) sort!: MatSort;

    selection = new SelectionModel<ExportModel>(true, []);
    displayedColumns: string[] = ['select', 'filter_type', 'name', 'description', 'created_at', 'updated_at', 'info', 'edit', 'copy', 'delete'];
    totalCount = 0;

    exports: ExportModel[] = [] as ExportModel[];
    exportsDataSource = new MatTableDataSource<ExportModel>();
    showGenerated = localStorage.getItem('data.exports.showGenerated') === 'true';
    ready = false;
    url = environment.influxAPIURL;

    public searchText = '';
    public searchField = 'name';
    public searchFields = [['Name', 'name'], ['Gerätename', 'entity_name'], ['Beschreibung', 'description'], ['Service', 'service_name']];
    private searchSub: Subscription = new Subscription();

    private exportSub: Subscription = new Subscription();

    public brokerMode = false;

    constructor(private exportService: ExportService,
                public snackBar: MatSnackBar,
                private dialogsService: DialogsService,
                private searchbarService: SearchbarService,
                private responsiveService: ResponsiveService,
                private brokerExportService: BrokerExportService,
                private route: ActivatedRoute,
                private clipboardService: ClipboardService) {
    }

    ngOnInit() {
        this.route.url.subscribe(url => {
            if (url[url.length - 1]?.toString() === 'broker') {
                this.brokerMode = true;
                this.displayedColumns = ['select', 'filter_type', 'name', 'description', 'created_at', 'updated_at', 'info', 'edit', 'delete'];
            }
            if (localStorage.getItem('data.exports.search') !== null) {
                this.searchText = <string>localStorage.getItem('data.exports.search');
            }
            if (localStorage.getItem('data.exports.searchField') !== null) {
                this.searchField = <string>localStorage.getItem('data.exports.searchField');
            }

            this.initSearchAndGetExports();
        });
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
        this.exportSub.unsubscribe();
    }

    deleteExport(exp: ExportModel) {
        this.dialogsService.openDeleteDialog('export').afterClosed().subscribe((deleteExport: boolean) => {
            if (deleteExport) {
                this.ready = false;
                const obs = this.brokerMode ? this.brokerExportService.stopPipeline(exp) : this.exportService.stopPipeline(exp);
                obs.subscribe((response) => {
                    if (response.status === 204) {
                        this.snackBar.open('Export deleted', undefined, {
                            duration: 2000,
                        });
                        this.getExports(true);
                    } else {
                        this.snackBar.open('Export could not be deleted', undefined, {
                            duration: 2000,
                        });
                    }
                    this.ready = true;
                });
            }
        });
    }

    copyEndpoint(endpoint: string) {
        this.clipboardService.copyFromContent(endpoint);
        this.snackBar.open('Endpoint copied to clipboard.', undefined, {
            duration: 2000,
        });
    }

    searchFieldChanged() {
        localStorage.setItem('data.exports.searchField', String(this.searchField));
        this.getExports(true);
    }

    showGeneratedChanged() {
        this.showGenerated = !this.showGenerated;
        localStorage.setItem('data.exports.showGenerated', String(this.showGenerated));
        this.getExports(true);
    }

    private getExports(reset: boolean) {
        if (reset) {
            this.reset();
        }
        this.exportsDataSource.sort = this.sort;
        this.sort.sortChange.subscribe(() => {
                this.paginator.pageIndex = 0;
                this.selectionClear();
            }
        );

        this.exportSub = merge(this.sort.sortChange, this.paginator.page).pipe(startWith({}), switchMap(() => {
            this.ready = false;
            return this.brokerMode ? this.brokerExportService.getExports(
                this.searchText,
                this.paginator.pageSize, this.paginator.pageSize * this.paginator.pageIndex,
                this.sort.active,
                this.sort.direction,
                (this.showGenerated ? undefined : false),
                this.searchField
            ) : this.exportService.getExports(
                this.searchText,
                this.paginator.pageSize, this.paginator.pageSize * this.paginator.pageIndex,
                this.sort.active,
                this.sort.direction,
                (this.showGenerated ? undefined : false),
                this.searchField
            );
        })).subscribe(
            (resp: ExportResponseModel | null) => {
                if (resp !== null) {
                    this.exports = resp.instances;
                    if (this.exports === undefined) {
                        this.exports = [];
                    }
                    this.totalCount = resp.total;
                    this.exportsDataSource.data = this.exports;
                }
                this.ready = true;
            });
    }

    private initSearchAndGetExports() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            localStorage.setItem('data.exports.search', this.searchText);
            this.getExports(true);
        });
    }

    private reset() {
        this.exports = [];
        this.ready = false;
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.exportsDataSource.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.exportsDataSource.connect().value.forEach(row => this.selection.select(row));
        }
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems(): void {
        this.dialogsService.openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' exports' : ' export')).afterClosed().subscribe(
            (deleteExports: boolean) => {

                if (deleteExports) {
                    this.ready = false;

                    const exportIDs: string[] = [];

                    this.selection.selected.forEach((exp: ExportModel) => {
                            if (exp.ID !== undefined) {
                                exportIDs.push(exp.ID);
                            }
                        }
                    );
                    const obs = this.brokerMode ? this.brokerExportService.stopPipelines(exportIDs) : this.exportService.stopPipelines(exportIDs);
                    obs.subscribe(() => {
                        this.paginator.pageIndex = 0;
                        this.getExports(true);
                        this.selectionClear();

                        this.ready = true;
                    });
                }
            });
    }
}
