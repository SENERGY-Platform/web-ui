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

import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { UtilService } from 'src/app/core/services/util.service';
import {
    ReportFileModel,
    ReportModel, ReportResponseModel,
} from '../shared/reporting.model';
import { ReportingService } from '../shared/reporting.service';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { saveAs } from 'file-saver';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { reportFileName } from '../shared/report-file-name';

@Component({
    selector: 'senergy-reporting-report-files',
    templateUrl: './reportFiles.component.html',
    styleUrls: ['./reportFiles.component.css'],
})
export class ReportFilesComponent implements OnInit, AfterViewInit {
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort?: MatSort;

    reportId: string | null = null;

    report: ReportModel = {} as ReportModel;
    reportsDataSource = new MatTableDataSource<ReportFileModel>();
    displayedColumns: string[] = ['id', 'type', 'createdAt', 'download'];
    pageSize = this.preferencesService.pageSize;
    ready = false;
    downloading = false;

    constructor(
        private route: ActivatedRoute,
        public snackBar: MatSnackBar,
        public utilsService: UtilService,
        private reportingService: ReportingService,
        private dialogsService: DialogsService,
        private preferencesService: PreferencesService,
    ) {
        this.reportId = this.route.snapshot.paramMap.get('reportId');
    }

    ngOnInit() {
        if (this.reportingService.userHasDeleteReportFileAuthorization()) {
            this.displayedColumns.push('delete');
        }
        if (this.reportId === null) {
            this.ready = true;
            return;
        }
        this.reportingService.getReport(this.reportId).subscribe((resp: ReportResponseModel | null) => {
            if (resp !== null) {
                this.report = resp.data;
                this.reportsDataSource.data = this.report.reportFiles || [];
            }
            this.ready = true;
        });
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
            .subscribe((deleteFile: boolean) => {
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
                    this.reportsDataSource.data = this.report.reportFiles;
                });
            });
    }

}
