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
import { MatSort, MatSortHeader, Sort, SortDirection } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { UtilService } from 'src/app/core/services/util.service';
import { TemplateListResponseModel, TemplateModel } from '../shared/reporting.model';
import { ReportingService } from '../shared/reporting.service';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { saveAs } from 'file-saver';
import { Observable, concatMap, map, tap } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { reportFileName } from '../shared/report-file-name';
import { UrlStateService } from '../../../core/services/url-state.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

@Component({
    selector: 'senergy-reporting-templates',
    templateUrl: './templates.component.html',
    styleUrls: ['./templates.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, SpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatIconButton, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator]
})
export class TemplatesComponent implements OnInit, AfterViewInit {
    snackBar = inject(MatSnackBar);
    private destroyRef = inject(DestroyRef);
    utilsService = inject(UtilService);
    private reportingService = inject(ReportingService);
    private searchbarService = inject(SearchbarService);
    private preferencesService = inject(PreferencesService);
    private router = inject(Router);
    private urlState = inject(UrlStateService);

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort?: MatSort;

    templates: TemplateModel[] = [];
    templatesDataSource = new MatTableDataSource<TemplateModel>();
    displayedColumns: string[] = ['name', 'type'];
    userMayCreate = false;
    searchText = '';
    pageSize = this.preferencesService.pageSize;
    pageIndex = 0;
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    ready = false;
    downloading = false;

    ngOnInit() {
        const sort = this.urlState.getSort('name', 'asc');
        // the header cannot be cleared, so a sort without a direction is the default sort
        if (sort.direction !== '') {
            this.sortBy = sort.active;
            this.sortDirection = sort.direction;
        }
        this.pageIndex = this.urlState.getPage();
        // Preview and creating a report are both behind the create right, so the menu only exists with it.
        this.userMayCreate = this.reportingService.userHasCreateReportAuthorization();
        if (this.userMayCreate) {
            this.displayedColumns.push('actions');
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
        this.paginator.pageIndex = this.pageIndex;
        this.templatesDataSource.paginator = this.paginator;
        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
            this.preferencesService.pageSize = event.pageSize;
            this.pageSize = event.pageSize;
            this.pageIndex = event.pageIndex;
            this.urlState.setPage(event.pageIndex);
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction || 'asc';
        this.urlState.setSort($event, 'name', 'asc');
        this.paginator.firstPage();
    }

    create(template: TemplateModel) {
        this.router.navigateByUrl('/reporting/new/' + template.id);
    }

    /** The refresh button of the toolbar: loads the templates again and keeps the search. */
    refresh() {
        this.reload().subscribe(() => this.filter(this.searchText));
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
        // the first search is the one the page was opened with, so it keeps the page from the URL
        let opening = true;
        this.searchbarService.currentSearchText.pipe(
            tap((searchText: string) => this.searchText = searchText),
            concatMap((searchText: string) => this.reload().pipe(map(() => searchText))),
            takeUntilDestroyed(this.destroyRef),
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
        return this.reportingService.getTemplates().pipe(map((resp: TemplateListResponseModel | null) => {
            this.templates = resp?.data || [];
            this.ready = true;
        }));
    }

    private filter(searchText: string) {
        const search = searchText.toLowerCase();
        this.showRows(this.templates.filter((template: TemplateModel) =>
            search === ''
            || (template.name || '').toLowerCase().indexOf(search) !== -1
            || (template.id || '').toLowerCase().indexOf(search) !== -1
            || (template.type || '').toLowerCase().indexOf(search) !== -1
        ));
    }

    /**
     * Shows the rows on the page the paginator is on. The data source moves a page beyond the end back without a page
     * event, so it is corrected here, with the URL.
     */
    private showRows(rows: TemplateModel[]) {
        if (this.paginator !== undefined) {
            const lastPage = Math.max(0, Math.ceil(rows.length / this.paginator.pageSize) - 1);
            this.paginator.pageIndex = Math.min(this.pageIndex, lastPage);
            if (this.paginator.pageIndex !== this.pageIndex) {
                this.pageIndex = this.paginator.pageIndex;
                this.urlState.setPage(this.pageIndex);
            }
        }
        this.templatesDataSource.data = rows;
    }

}
