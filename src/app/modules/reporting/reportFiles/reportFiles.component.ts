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

import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { UtilService } from 'src/app/core/services/util.service';
import {
    ReportFileModel,
    ReportListResponseModel,
    ReportModel, ReportObjectModel, ReportResponseModel,
    TemplateListResponseModel,
    TemplateModel, TemplateResponseModel
} from '../shared/reporting.model';
import {ReportingService} from '../shared/reporting.service';
import {MatTableDataSource} from '@angular/material/table';
import {ActivatedRoute} from '@angular/router';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {environment} from '../../../../environments/environment';
import {saveAs} from 'file-saver';

@Component({
    selector: 'senergy-reporting-report-files',
    templateUrl: './reportFiles.component.html',
    styleUrls: ['./reportFiles.component.css'],
})
export class ReportFilesComponent implements OnInit {
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('sort', { static: false }) sort!: MatSort;

    reportId: string | null = null;

    report: ReportModel = {} as ReportModel;
    reportsDataSource = new MatTableDataSource<ReportFileModel>();
    displayedColumns: string[] = ['id', 'download', 'delete'];
    ready = false;

    constructor(
        private route: ActivatedRoute,
        public snackBar: MatSnackBar,
        private errorHandlerService: ErrorHandlerService,
        public utilsService: UtilService,
        private reportingService: ReportingService,
    ) {
        this.reportId = this.route.snapshot.paramMap.get('reportId');
    }

    ngOnInit() {
        if (this.reportId != null) {
            this.reportingService.getReport(this.reportId).subscribe((resp: ReportResponseModel | null) => {
                if (resp !== null) {
                    this.report = resp.data;
                    this.reportsDataSource.data = this.report.reportFiles;
                }
                this.ready = true;
            });
        }
    }

    async download($event: Event, fileId: string) {
        $event.stopPropagation();
        try {
            if (this.reportId != null) {
                this.reportingService.getReportFile(this.reportId, fileId).subscribe((resp: Blob | null) => {
                    if (resp !== null) {
                        saveAs(resp);
                    }
                });
            }
        } catch (e) {
            this.errorHandlerService.handleErrorWithSnackBar('Failed to download', 'ReportingFileDownload', 'download', null)(undefined);
            return;
        }
    }

    protected readonly environment = environment;
}
