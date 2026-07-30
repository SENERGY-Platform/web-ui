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
import { TemplateListResponseModel, TemplateModel } from '../shared/reporting.model';
import { ReportingService } from '../shared/reporting.service';
import { MatTableDataSource } from '@angular/material/table';
import { saveAs } from 'file-saver';
import { Observable, Subscription, concatMap, map } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { reportFileName } from '../shared/report-file-name';

@Component({
    selector: 'senergy-reporting-templates',
    templateUrl: './templates.component.html',
    styleUrls: ['./templates.component.css'],
})
export class TemplatesComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort?: MatSort;

    templates: TemplateModel[] = [];
    templatesDataSource = new MatTableDataSource<TemplateModel>();
    displayedColumns: string[] = ['id', 'name', 'type'];
    pageSize = this.preferencesService.pageSize;
    ready = false;
    downloading = false;

    private searchSub?: Subscription;

    constructor(
        public snackBar: MatSnackBar,
        public utilsService: UtilService,
        private reportingService: ReportingService,
        private searchbarService: SearchbarService,
        private preferencesService: PreferencesService,
    ) {}

    ngOnInit() {
        if (this.reportingService.userHasCreateReportAuthorization()) {
            this.displayedColumns.push('preview');
            this.displayedColumns.push('create');
        }
        this.initSearch();
    }

    ngAfterViewInit() {
        if (this.sort !== undefined) {
            this.templatesDataSource.sort = this.sort;
        }
        if (this.paginator === undefined) {
            return;
        }
        this.templatesDataSource.paginator = this.paginator;
        this.paginator.page.subscribe((event) => {
            this.preferencesService.pageSize = event.pageSize;
            this.pageSize = event.pageSize;
        });
    }

    ngOnDestroy() {
        this.searchSub?.unsubscribe();
    }

    downloadPreview($event: Event, template: TemplateModel) {
        $event.stopPropagation();
        this.downloading = true;
        this.reportingService.getTemplatePreviewFile(template.id).subscribe((resp: Blob | null) => {
            this.downloading = false;
            if (resp !== null) {
                saveAs(resp, reportFileName('preview_' + (template.name || template.id), template.type));
            }
        });
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.pipe(
            concatMap((searchText: string) => this.reload().pipe(map(() => searchText))),
        ).subscribe((searchText: string) => this.filter(searchText));
    }

    private reload(): Observable<unknown> {
        this.ready = false;
        return this.reportingService.getTemplates().pipe(map((resp: TemplateListResponseModel | null) => {
            this.templates = resp?.data || [];
            this.ready = true;
        }));
    }

    private filter(searchText: string) {
        const search = searchText.toLowerCase();
        this.templatesDataSource.data = this.templates.filter((template: TemplateModel) =>
            search === ''
            || (template.name || '').toLowerCase().indexOf(search) !== -1
            || (template.id || '').toLowerCase().indexOf(search) !== -1
            || (template.type || '').toLowerCase().indexOf(search) !== -1
        );
    }
}
