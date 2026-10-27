/*
 * Copyright 2024 InfAI (CC SES)
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, Sort, SortDirection } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { UtilService } from 'src/app/core/services/util.service';
import {
    ReportListResponseModel,
    ReportModel,
} from '../shared/reporting.model';
import { ReportingService } from '../shared/reporting.service';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, Subscription, concatMap, map } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { UrlStateService } from '../../../core/services/url-state.service';

@Component({
    selector: 'senergy-reporting-reports',
    templateUrl: './reports.component.html',
    styleUrls: ['./reports.component.css'],
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort?: MatSort;

    reports: ReportModel[] = [];
    reportsDataSource = new MatTableDataSource<ReportModel>();
    displayedColumns: string[] = ['id', 'name', 'createdAt', 'updatedAt'];
    pageSize = this.preferencesService.pageSize;
    pageIndex = 0;
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    ready = false;

    private searchSub?: Subscription;

    constructor(
        public snackBar: MatSnackBar,
        public utilsService: UtilService,
        private reportingService: ReportingService,
        private searchbarService: SearchbarService,
        private dialogsService: DialogsService,
        private preferencesService: PreferencesService,
        private urlState: UrlStateService,
    ) {}

    ngOnInit() {
        const sort = this.urlState.getSort('name', 'asc');
        this.sortBy = sort.active;
        this.sortDirection = sort.direction;
        this.pageIndex = this.urlState.getPage();
        if (this.reportingService.userHasReadReportFileAuthorization()) {
            this.displayedColumns.push('files');
        }
        if (this.reportingService.userHasUpdateReportAuthorization()) {
            this.displayedColumns.push('edit');
        }
        if (this.reportingService.userHasDeleteReportAuthorization()) {
            this.displayedColumns.push('delete');
        }
        this.initSearch();
    }

    ngAfterViewInit() {
        if (this.sort !== undefined) {
            this.reportsDataSource.sort = this.sort;
        }
        if (this.paginator === undefined) {
            return;
        }
        this.paginator.pageIndex = this.pageIndex;
        this.reportsDataSource.paginator = this.paginator;
        this.paginator.page.subscribe((event) => {
            this.preferencesService.pageSize = event.pageSize;
            this.pageSize = event.pageSize;
            this.pageIndex = event.pageIndex;
            this.urlState.setPage(event.pageIndex);
        });
    }

    ngOnDestroy() {
        this.searchSub?.unsubscribe();
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.urlState.setSort($event, 'name', 'asc');
        this.paginator.firstPage();
    }

    deleteReport(report: ReportModel) {
        if (report.id === undefined) {
            return;
        }
        const id = report.id;
        this.dialogsService
            .openDeleteDialog('report ' + report.name)
            .afterClosed()
            .subscribe((deleteReport: boolean) => {
                if (!deleteReport) {
                    return;
                }
                this.reportingService.deleteReport(id).subscribe((resp) => {
                    if (resp === null) {
                        return;
                    }
                    this.snackBar.open('Report deleted', 'ReportDelete', {
                        duration: 3000,
                    });
                    this.reports = this.reports.filter((r: ReportModel) => r.id !== id);
                    this.reportsDataSource.data = this.reports;
                });
            });
    }

    private initSearch() {
        // the first search is the one the page was opened with, so it keeps the page from the URL
        let opening = true;
        this.searchSub = this.searchbarService.currentSearchText.pipe(
            concatMap((searchText: string) => this.reload().pipe(map(() => searchText))),
        ).subscribe((searchText: string) => {
            if (!opening) {
                this.pageIndex = 0;
                this.urlState.setPage(0);
            }
            opening = false;
            this.filter(searchText);
        });
    }

    private reload(): Observable<unknown> {
        this.ready = false;
        return this.reportingService.getReports().pipe(map((resp: ReportListResponseModel | null) => {
            this.reports = resp?.data || [];
            this.ready = true;
        }));
    }

    private filter(searchText: string) {
        const search = searchText.toLowerCase();
        const rows = this.reports.filter((report: ReportModel) =>
            search === ''
            || (report.name || '').toLowerCase().indexOf(search) !== -1
            || (report.id || '').toLowerCase().indexOf(search) !== -1
            || (report.templateName || '').toLowerCase().indexOf(search) !== -1
        );
        // the data source moves a page beyond the end back without a page event, so the page and the URL follow here
        const lastPage = Math.max(0, Math.ceil(rows.length / this.pageSize) - 1);
        if (this.pageIndex > lastPage) {
            this.pageIndex = lastPage;
            this.urlState.setPage(lastPage);
        }
        if (this.paginator !== undefined) {
            // set before the data, the data source pages from the index it has when the data arrives
            this.paginator.pageIndex = this.pageIndex;
        }
        this.reportsDataSource.data = rows;
    }
}
