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

import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortHeader, Sort, SortDirection } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Subject, takeUntil } from 'rxjs';
import { UtilService } from 'src/app/core/services/util.service';
import {
    ReportFileModel,
    ReportJobModel,
    ReportModel, ReportResponseModel,
} from '../shared/reporting.model';
import { reportJobDone, reportJobFailed, reportJobLabel } from '../shared/report-job';
import { ReportingService } from '../shared/reporting.service';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { saveAs } from 'file-saver';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { reportFileName } from '../shared/report-file-name';
import { UrlStateService } from '../../../core/services/url-state.service';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { LIST_DATE_FORMAT } from '../../../core/classes/list-date-format';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIconButton } from '@angular/material/button';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'senergy-reporting-report-files',
    templateUrl: './reportFiles.component.html',
    styleUrls: ['./reportFiles.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, SpinnerComponent, MatIcon, MatProgressBar, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, DatePipe]
})
export class ReportFilesComponent implements OnInit, AfterViewInit, OnDestroy {
    private route = inject(ActivatedRoute);
    snackBar = inject(MatSnackBar);
    utilsService = inject(UtilService);
    private reportingService = inject(ReportingService);
    private dialogsService = inject(DialogsService);
    private preferencesService = inject(PreferencesService);
    private urlState = inject(UrlStateService);

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort?: MatSort;

    reportId: string | null = null;

    report: ReportModel = {} as ReportModel;
    reportsDataSource = new MatTableDataSource<ReportFileModel>();
    displayedColumns: string[] = ['createdAt', 'type', 'actions'];
    readonly dateFormat = LIST_DATE_FORMAT;
    userMayDelete = false;
    pageSize = this.preferencesService.pageSize;
    pageIndex = 0;
    sortBy = 'createdAt';
    sortDirection: SortDirection = 'desc';
    ready = false;
    downloading = false;
    reportJob: ReportJobModel | null = null;

    private destroy = new Subject<void>();

    constructor() {
        this.reportId = this.route.snapshot.paramMap.get('reportId');
    }

    ngOnInit() {
        const sort = this.urlState.getSort('createdAt', 'desc');
        // the header cannot be cleared, so a sort without a direction is the default sort
        if (sort.direction !== '') {
            this.sortBy = sort.active;
            this.sortDirection = sort.direction;
        }
        this.pageIndex = this.urlState.getPage();
        this.userMayDelete = this.reportingService.userHasDeleteReportFileAuthorization();
        if (this.reportId === null) {
            this.ready = true;
            return;
        }
        this.loadReport(this.reportId);
        this.resumeReportJob(this.reportId);
    }

    ngOnDestroy() {
        this.destroy.next();
        this.destroy.complete();
    }

    get reportJobLabel(): string {
        return this.reportJob === null ? '' : reportJobLabel(this.reportJob);
    }

    get reportJobFailed(): boolean {
        return this.reportJob !== null && reportJobFailed(this.reportJob);
    }

    get reportJobRunning(): boolean {
        return this.reportJob !== null && !reportJobDone(this.reportJob);
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
        this.paginator.page.pipe(takeUntil(this.destroy)).subscribe((event) => {
            this.preferencesService.pageSize = event.pageSize;
            this.pageSize = event.pageSize;
            this.pageIndex = event.pageIndex;
            this.urlState.setPage(event.pageIndex);
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction || 'desc';
        this.urlState.setSort($event, 'createdAt', 'desc');
        this.paginator.firstPage();
    }

    /** The refresh button of the toolbar: loads the report and its files again. */
    refresh() {
        if (this.reportId !== null) {
            this.loadReport(this.reportId);
        }
    }

    download($event: Event, reportFile: ReportFileModel) {
        $event.stopPropagation();
        if (this.reportId === null) {
            return;
        }
        this.downloading = true;
        this.reportingService.getReportFile(this.reportId, reportFile.id).subscribe((resp: Blob | null) => {
            this.downloading = false;
            if (resp !== null) {
                saveAs(resp, reportFileName((this.report.name || 'report') + '_' + reportFile.id, reportFile.type));
            }
        });
    }

    delete($event: Event, reportFile: ReportFileModel) {
        $event.stopPropagation();
        if (this.reportId === null) {
            return;
        }
        const reportId = this.reportId;
        this.dialogsService
            .openDeleteDialog('report file ' + reportFile.id)
            .afterClosed()
            .subscribe((deleteFile: boolean | undefined) => {
                if (!deleteFile) {
                    return;
                }
                this.reportingService.deleteReportFile(reportId, reportFile.id).subscribe((resp) => {
                    if (resp === null) {
                        return;
                    }
                    this.snackBar.open('File deleted', 'ReportingFileDelete', {
                        duration: 3000,
                    });
                    this.report.reportFiles = (this.report.reportFiles || []).filter((file: ReportFileModel) => file.id !== reportFile.id);
                    this.showRows(this.report.reportFiles);
                });
            });
    }

    /**
     * Shows the rows on the page of the list. The data source moves a page beyond the end back without a page event, so
     * it is corrected here, with the URL, also for an answer that arrives before the paginator exists.
     */
    private showRows(rows: ReportFileModel[]) {
        const lastPage = Math.max(0, Math.ceil(rows.length / this.pageSize) - 1);
        if (this.pageIndex > lastPage) {
            this.pageIndex = lastPage;
            this.urlState.setPage(lastPage);
        }
        if (this.paginator !== undefined) {
            this.paginator.pageIndex = this.pageIndex;
        }
        this.reportsDataSource.data = rows;
    }

    private loadReport(reportId: string) {
        this.reportingService.getReport(reportId).subscribe((resp: ReportResponseModel | null) => {
            if (resp !== null) {
                this.report = resp.data;
                this.showRows(this.report.reportFiles || []);
            }
            this.ready = true;
        });
    }

    /**
     * Shows the progress of a report file that is still being built and reloads the
     * list once it is there, so the user does not have to refresh the page.
     */
    private resumeReportJob(reportId: string) {
        this.reportingService.getUnfinishedReportJob(reportId).pipe(takeUntil(this.destroy))
            .subscribe((job: ReportJobModel | null) => {
                if (job === null) {
                    return;
                }
                this.reportJob = job;
                this.reportingService.pollReportJob(job.id).pipe(takeUntil(this.destroy))
                    .subscribe((polled: ReportJobModel | null) => {
                        this.reportJob = polled;
                        if (polled !== null && polled.status === 'done') {
                            this.loadReport(reportId);
                        }
                    });
            });
    }
}
