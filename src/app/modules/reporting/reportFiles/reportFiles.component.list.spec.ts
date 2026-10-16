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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ReportFilesComponent } from './reportFiles.component';
import { ReportingService } from '../shared/reporting.service';
import { ReportModel } from '../shared/reporting.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from '../../../core/services/preferences.service';

describe('ReportFilesComponent list', () => {
    let fixture: ComponentFixture<ReportFilesComponent>;
    let service: jasmine.SpyObj<ReportingService>;

    const report = { id: 'r1', name: 'Energy Report', reportFiles: [{ id: 'f1', type: 'pdf', createdAt: '2026-01-02T10:00:00Z' }] } as ReportModel;

    async function init(mayDelete = true) {
        service = jasmine.createSpyObj<ReportingService>('ReportingService', [
            'getReport', 'getUnfinishedReportJob', 'pollReportJob', 'getReportFile', 'userHasDeleteReportFileAuthorization',
        ]);
        service.getReport.and.returnValue(of({ data: report }));
        service.getUnfinishedReportJob.and.returnValue(of(null));
        service.getReportFile.and.returnValue(of(null));
        service.userHasDeleteReportFileAuthorization.and.returnValue(mayDelete);
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, MatSnackBarModule, ReportFilesComponent],
            providers: [
                provideRouter([]),
                { provide: ReportingService, useValue: service },
                { provide: DialogsService, useValue: {} },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ reportId: 'r1' }) } } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ReportFilesComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    it('reloads the report exactly once when the refresh button is clicked', async () => {
        await init();
        service.getReport.calls.reset();

        (fixture.nativeElement.querySelector('.toolbar-refresh') as HTMLButtonElement).click();

        expect(service.getReport).toHaveBeenCalledTimes(1);
    });

    it('names the report in the header and links back to the reports', async () => {
        await init();

        const header = fixture.nativeElement.querySelector('senergy-page-header') as HTMLElement;
        expect(header.querySelector('.page-title')?.textContent).toContain('Energy Report');
        expect(header.querySelector('.page-back')?.textContent).toContain('Reports');
    });

    it('downloads the file on a row click', async () => {
        await init();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();

        expect(service.getReportFile).toHaveBeenCalledWith('r1', 'f1');
    });

    it('shows the creation date first with the id muted and the type as a chip', async () => {
        await init();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        expect(row.querySelector('.name-cell')?.textContent).toContain('02.01.2026');
        expect(row.querySelector('.muted')?.textContent).toContain('f1');
        expect(row.querySelector('.type-chip')?.textContent).toContain('pdf');
    });
});
