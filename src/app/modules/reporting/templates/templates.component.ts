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
import {TemplateListResponseModel, TemplateModel} from '../shared/reporting.model';
import {ReportingService} from '../shared/reporting.service';
import {MatTableDataSource} from '@angular/material/table';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { environment } from 'src/environments/environment';
import {saveAs} from 'file-saver';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';

@Component({
    selector: 'senergy-reporting-templates',
    templateUrl: './templates.component.html',
    styleUrls: ['./templates.component.css'],
})
export class TemplatesComponent implements OnInit {
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('sort', { static: false }) sort!: MatSort;

    templates: TemplateModel[] = [] as TemplateModel[];
    templatesDataSource = new MatTableDataSource<TemplateModel>();
    displayedColumns: string[] = ['id', 'name', 'type'];
    ready = false;

    constructor(
        public snackBar: MatSnackBar,
        public utilsService: UtilService,
        private reportingService: ReportingService,
        private ladonService: LadonService,
        private errorHandlerService: ErrorHandlerService,
    ) {}

    ngOnInit() {
        if (this.ladonService.getUserAuthorizationsForURI(environment.reportEngineUrl + '/report/create').POST) {
            this.displayedColumns.push('preview');
            this.displayedColumns.push('create');
        }
        this.reportingService.getTemplates().subscribe((resp: TemplateListResponseModel | null) => {
            if (resp !== null) {
                this.templates = resp.data || [];
                this.templatesDataSource.data = this.templates;
            }
            this.ready = true;
        });
    }

    async downloadPreview($event: Event, id: string) {
        this.ready = false;
        $event.stopPropagation();
        try {
            if (id != null) {
                this.reportingService.getTemplatePreviewFile(id).subscribe((resp: Blob | null) => {
                    if (resp !== null) {
                        saveAs(resp, 'preview');
                        this.ready = true;
                    }
                });
            }
        } catch (_) {
            this.errorHandlerService.handleErrorWithSnackBar('Failed to download', 'downloadPreview', 'download', null)(undefined);
            return;
        }
    }

}
