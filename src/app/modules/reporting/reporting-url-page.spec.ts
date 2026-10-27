/*
 * Copyright 2026 InfAI (CC SES)
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

import { discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NEVER, of } from 'rxjs';

import { ReportsComponent } from './reports/reports.component';
import { ReportFilesComponent } from './reportFiles/reportFiles.component';
import { TemplatesComponent } from './templates/templates.component';
import { ReportingService } from './shared/reporting.service';
import { DialogsService } from '../../core/services/dialogs.service';
import { UtilService } from '../../core/services/util.service';

/** The client-side tables keep the page of the URL in range themselves: the data source moves a page beyond the end back without telling anyone. */
describe('reporting tables with a page in the URL', () => {
    // three pages of 20
    const rows = (prefix: string) => Array.from({ length: 45 }, (_, i) => ({ id: prefix + i, name: prefix + i, templateName: 't', type: 'pdf', createdAt: '2026-01-01T00:00:00Z' }));

    function configure(component: typeof ReportsComponent | typeof TemplatesComponent | typeof ReportFilesComponent, extra: object = {}) {
        localStorage.removeItem('PreferencesService/pageSize');
        const reporting = {
            userHasReadReportFileAuthorization: () => false,
            userHasUpdateReportAuthorization: () => false,
            userHasDeleteReportAuthorization: () => false,
            userHasCreateReportAuthorization: () => false,
            userHasDeleteReportFileAuthorization: () => false,
            getReports: () => of({ data: rows('report') }),
            getTemplates: () => of({ data: rows('template') }),
            getReport: () => of({ data: { id: 'r1', name: 'r', reportFiles: rows('file') } }),
            getUnfinishedReportJob: () => NEVER,
            ...extra,
        };
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [component],
            imports: [NoopAnimationsModule, MatTableModule, MatSortModule, MatPaginatorModule, MatSnackBarModule],
            providers: [
                { provide: ReportingService, useValue: reporting },
                { provide: DialogsService, useValue: {} },
                { provide: UtilService, useValue: {} },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'r1' } } } },
            ],
        });
    }

    function open(component: typeof ReportsComponent | typeof TemplatesComponent | typeof ReportFilesComponent, url: string) {
        const router = TestBed.inject(Router);
        router.navigateByUrl(url);
        tick();
        const fixture = TestBed.createComponent(component as typeof ReportsComponent);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();
        flush();
        return { fixture, router };
    }

    [
        { name: 'ReportsComponent', component: ReportsComponent },
        { name: 'TemplatesComponent', component: TemplatesComponent },
        { name: 'ReportFilesComponent', component: ReportFilesComponent },
    ].forEach(({ name, component }) => {
        it(name + ' moves a page beyond the end to the last page, in the table and in the URL', fakeAsync(() => {
            configure(component);

            const { fixture, router } = open(component, '/?page=50');

            const list = fixture.componentInstance as { pageIndex: number; paginator: { pageIndex: number } };
            expect(list.paginator.pageIndex).toBe(2);
            expect(list.pageIndex).toBe(2);
            expect(router.url).toBe('/?page=2');
        }));

        it(name + ' keeps a page inside the range', fakeAsync(() => {
            configure(component);

            const { fixture, router } = open(component, '/?page=1');

            const list = fixture.componentInstance as { pageIndex: number; paginator: { pageIndex: number } };
            expect(list.paginator.pageIndex).toBe(1);
            expect(list.pageIndex).toBe(1);
            expect(router.url).toBe('/?page=1');
        }));
    });
});
