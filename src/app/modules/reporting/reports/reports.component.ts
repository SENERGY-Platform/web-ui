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
    ReportListResponseModel,
    ReportModel,
} from '../shared/reporting.model';
import {ReportingService} from '../shared/reporting.service';
import {MatTableDataSource} from '@angular/material/table';

@Component({
    selector: 'senergy-reporting-reports',
    templateUrl: './reports.component.html',
    styleUrls: ['./reports.component.css'],
})
export class ReportsComponent implements OnInit {
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('sort', { static: false }) sort!: MatSort;

    reports: ReportModel[] = [] as ReportModel[];
    reportsDataSource = new MatTableDataSource<ReportModel>();
    displayedColumns: string[] = ['id', 'name','createdAt','updatedAt', 'files', 'edit', 'delete'];
    ready = false;

    constructor(
        public snackBar: MatSnackBar,
        public utilsService: UtilService,
        private reportingService: ReportingService,
    ) {}

    ngOnInit() {
        this.reportingService.getReports().subscribe((resp: ReportListResponseModel | null) => {
            if (resp !== null) {
                this.reports = resp.data || [];
                this.reportsDataSource.data = this.reports;
            }
            this.ready = true;
        });
    }

    deleteReport(id: string){
        this.reportingService.deleteReport(id).subscribe(() => {
            this.snackBar.open('Report deleted', 'ReportDelete', {
                duration: 3000,
            });
            this.reportsDataSource.data = this.reportsDataSource.data.filter((report: ReportModel) => report.id !== id);
        });
    }

}
