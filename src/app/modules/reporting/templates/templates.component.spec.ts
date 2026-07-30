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
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import { TemplatesComponent } from './templates.component';
import { ReportingService } from '../shared/reporting.service';
import { TemplateModel } from '../shared/reporting.model';
import { CoreModule } from '../../../core/core.module';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';

const templates = [
    { id: 't1', name: 'Energy Template', type: 'pdf' },
    { id: 't2', name: 'Water Template', type: 'docx' },
] as TemplateModel[];

class MockReportingService {
    previewResponse: Observable<Blob | null> = of(null);

    getTemplates(): Observable<{ data: TemplateModel[] } | null> {
        return of({ data: templates });
    }

    getTemplatePreviewFile(_id: string): Observable<Blob | null> {
        return this.previewResponse;
    }

    userHasCreateReportAuthorization(): boolean {
        return true;
    }
}

describe('TemplatesComponent', () => {
    let component: TemplatesComponent;
    let fixture: ComponentFixture<TemplatesComponent>;
    let reportingService: MockReportingService;
    let searchbarService: SearchbarService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [TemplatesComponent],
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
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(TemplatesComponent);
        component = fixture.componentInstance;
        reportingService = TestBed.inject(ReportingService) as unknown as MockReportingService;
        searchbarService = TestBed.inject(SearchbarService);
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load the templates and connect sort and paginator', fakeAsync(() => {
        fixture.detectChanges();
        tick(300);

        expect(component.ready).toBe(true);
        expect(component.templatesDataSource.data.length).toBe(2);
        expect(component.templatesDataSource.sort).toBeTruthy();
        expect(component.templatesDataSource.paginator).toBeTruthy();
        component.ngOnDestroy();
    }));

    it('should filter the templates by the search text', fakeAsync(() => {
        fixture.detectChanges();
        tick(300);

        searchbarService.changeMessage('docx');
        tick(300);

        expect(component.templatesDataSource.data.length).toBe(1);
        expect(component.templatesDataSource.data[0].id).toBe('t2');
        component.ngOnDestroy();
    }));

    it('should stop the download indicator if the preview is unavailable', fakeAsync(() => {
        fixture.detectChanges();
        tick(300);

        component.downloadPreview(new MouseEvent('click'), templates[0]);
        tick();

        expect(component.downloading).toBe(false);
        expect(component.ready).toBe(true);
        component.ngOnDestroy();
    }));

    it('should keep the table usable if loading the templates fails', fakeAsync(() => {
        spyOn(reportingService, 'getTemplates').and.returnValue(of(null));
        fixture.detectChanges();
        tick(300);

        expect(component.ready).toBe(true);
        expect(component.templatesDataSource.data.length).toBe(0);
        component.ngOnDestroy();
    }));
});
