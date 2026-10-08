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

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { UtilService } from 'src/app/core/services/util.service';
import {
    ReportListResponseModel,
    ReportModel,
} from '../shared/reporting.model';
import { ReportingService } from '../shared/reporting.service';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Observable, concatMap, map } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'senergy-reporting-reports',
    templateUrl: './reports.component.html',
    styleUrls: ['./reports.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, SpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatIconButton, MatTooltip, RouterLink, MatIcon, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, DatePipe]
})
export class ReportsComponent implements OnInit, AfterViewInit {
    snackBar = inject(MatSnackBar);
    private destroyRef = inject(DestroyRef);
    utilsService = inject(UtilService);
    private reportingService = inject(ReportingService);
    private searchbarService = inject(SearchbarService);
    private dialogsService = inject(DialogsService);
    private preferencesService = inject(PreferencesService);

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort?: MatSort;

    reports: ReportModel[] = [];
    reportsDataSource = new MatTableDataSource<ReportModel>();
    displayedColumns: string[] = ['id', 'name', 'createdAt', 'updatedAt'];
    pageSize = this.preferencesService.pageSize;
    ready = false;

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
        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
            this.preferencesService.pageSize = event.pageSize;
            this.pageSize = event.pageSize;
        });
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
        this.searchbarService.currentSearchText.pipe(
            concatMap((searchText: string) => this.reload().pipe(map(() => searchText))),
            takeUntilDestroyed(this.destroyRef),
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
