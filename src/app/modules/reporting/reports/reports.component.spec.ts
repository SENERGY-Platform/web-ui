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

import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import { ReportsComponent } from './reports.component';
import { ReportingService } from '../shared/reporting.service';
import { ReportModel } from '../shared/reporting.model';
import { CoreModule } from '../../../core/core.module';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { DialogsService } from '../../../core/services/dialogs.service';

const reports = [
    { id: 'r1', name: 'Energy Report', templateName: 'energy' },
    { id: 'r2', name: 'Water Report', templateName: 'water' },
] as ReportModel[];

class MockReportingService {
    deletedIds: string[] = [];
    authorized = true;

    getReports(): Observable<{ data: ReportModel[] } | null> {
        return of({ data: reports.filter((report: ReportModel) => this.deletedIds.indexOf(report.id || '') === -1) });
    }

    deleteReport(id: string): Observable<HttpResponse<string> | null> {
        this.deletedIds.push(id);
        return of(new HttpResponse<string>({ status: 200 }));
    }

    userHasReadReportFileAuthorization(): boolean {
        return this.authorized;
    }

    userHasUpdateReportAuthorization(): boolean {
        return this.authorized;
    }

    userHasDeleteReportAuthorization(): boolean {
        return this.authorized;
    }
}

class MockDialogsService {
    confirmed = true;

    openDeleteDialog(_text: string): any {
        return { afterClosed: () => of(this.confirmed) };
    }
}

describe('ReportsComponent', () => {
    let component: ReportsComponent;
    let fixture: ComponentFixture<ReportsComponent>;
    let reportingService: MockReportingService;
    let dialogsService: MockDialogsService;
    let searchbarService: SearchbarService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ReportsComponent],
            imports: [
                CommonModule,
                CoreModule,
                NoopAnimationsModule,
                MatTableModule,
                MatSortModule,
                MatPaginatorModule,
                MatIconModule,
                MatTooltipModule,
                MatDialogModule,
                MatSnackBarModule,
            ],
            providers: [
                { provide: ReportingService, useClass: MockReportingService },
                { provide: DialogsService, useClass: MockDialogsService },
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ReportsComponent);
        component = fixture.componentInstance;
        reportingService = TestBed.inject(ReportingService) as unknown as MockReportingService;
        dialogsService = TestBed.inject(DialogsService) as unknown as MockDialogsService;
        searchbarService = TestBed.inject(SearchbarService);
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load the reports and connect sort and paginator', fakeAsync(() => {
        fixture.detectChanges();
        tick(300);
        fixture.detectChanges();

        expect(component.ready).toBe(true);
        expect(component.reportsDataSource.data.length).toBe(2);
        expect(component.reportsDataSource.sort).toBeTruthy();
        expect(component.reportsDataSource.paginator).toBeTruthy();
        component.ngOnDestroy();
    }));

    it('should add the action columns according to the authorizations', fakeAsync(() => {
        fixture.detectChanges();
        tick(300);

        expect(component.displayedColumns).toContain('files');
        expect(component.displayedColumns).toContain('edit');
        expect(component.displayedColumns).toContain('delete');
        component.ngOnDestroy();
    }));

    it('should filter the reports by the search text', fakeAsync(() => {
        fixture.detectChanges();
        tick(300);

        searchbarService.changeMessage('water');
        tick(300);

        expect(component.reportsDataSource.data.length).toBe(1);
        expect(component.reportsDataSource.data[0].id).toBe('r2');
        component.ngOnDestroy();
    }));

    it('should delete a report after the deletion was confirmed', fakeAsync(() => {
        fixture.detectChanges();
        tick(300);

        component.deleteReport(reports[0]);
        tick();

        expect(reportingService.deletedIds).toEqual(['r1']);
        expect(component.reportsDataSource.data.length).toBe(1);
        component.ngOnDestroy();
        tick(3000);
    }));

    it('should keep the report if the deletion was not confirmed', fakeAsync(() => {
        fixture.detectChanges();
        tick(300);
        dialogsService.confirmed = false;

        component.deleteReport(reports[0]);
        tick();

        expect(reportingService.deletedIds).toEqual([]);
        expect(component.reportsDataSource.data.length).toBe(2);
        component.ngOnDestroy();
    }));
});
