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
import { MatSort } from '@angular/material/sort';
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
    ready = false;

    private searchSub?: Subscription;

    constructor(
        public snackBar: MatSnackBar,
        public utilsService: UtilService,
        private reportingService: ReportingService,
        private searchbarService: SearchbarService,
        private dialogsService: DialogsService,
        private preferencesService: PreferencesService,
    ) {}

    ngOnInit() {
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
        this.reportsDataSource.paginator = this.paginator;
        this.paginator.page.subscribe((event) => {
            this.preferencesService.pageSize = event.pageSize;
            this.pageSize = event.pageSize;
        });
    }

    ngOnDestroy() {
        this.searchSub?.unsubscribe();
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
        this.searchSub = this.searchbarService.currentSearchText.pipe(
            concatMap((searchText: string) => this.reload().pipe(map(() => searchText))),
        ).subscribe((searchText: string) => this.filter(searchText));
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
        this.reportsDataSource.data = this.reports.filter((report: ReportModel) =>
            search === ''
            || (report.name || '').toLowerCase().indexOf(search) !== -1
            || (report.id || '').toLowerCase().indexOf(search) !== -1
            || (report.templateName || '').toLowerCase().indexOf(search) !== -1
        );
    }
}
