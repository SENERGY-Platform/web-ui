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

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { ReportsComponent } from './reports.component';
import { ReportingService } from '../shared/reporting.service';
import { ReportModel } from '../shared/reporting.model';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { DialogsService } from '../../../core/services/dialogs.service';

describe('ReportsComponent list', () => {
    let fixture: ComponentFixture<ReportsComponent>;
    let component: ReportsComponent;
    let service: jasmine.SpyObj<ReportingService>;
    let router: Router;

    const withFiles = { id: 'r1', name: 'Energy', templateName: 'energy', reportFiles: [{ id: 'f1' }, { id: 'f2' }], createdAt: '2026-01-02T10:00:00Z', updatedAt: '2026-01-03T10:00:00Z' } as ReportModel;
    const withoutFiles = { id: 'r2', name: 'Water', templateName: 'water', reportFiles: [] } as unknown as ReportModel;

    function init(rights = { create: true, read: true, update: true, delete: true }) {
        service = jasmine.createSpyObj<ReportingService>('ReportingService', [
            'getReports', 'userHasCreateReportAuthorization', 'userHasReadReportFileAuthorization', 'userHasUpdateReportAuthorization', 'userHasDeleteReportAuthorization',
        ]);
        service.getReports.and.returnValue(of({ data: [withFiles, withoutFiles] }));
        service.userHasCreateReportAuthorization.and.returnValue(rights.create);
        service.userHasReadReportFileAuthorization.and.returnValue(rights.read);
        service.userHasUpdateReportAuthorization.and.returnValue(rights.update);
        service.userHasDeleteReportAuthorization.and.returnValue(rights.delete);
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, MatSnackBarModule, ReportsComponent],
            providers: [
                provideRouter([]),
                { provide: ReportingService, useValue: service },
                { provide: DialogsService, useValue: {} },
                { provide: SearchbarService, useValue: { currentSearchText: new BehaviorSubject(''), changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
            ],
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigateByUrl').and.resolveTo(true);
        fixture = TestBed.createComponent(ReportsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getReports.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);

        expect(service.getReports).toHaveBeenCalledTimes(1);
    }));

    it('opens the report editor on a row click with the update right', fakeAsync(() => {
        init();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();

        expect(router.navigateByUrl).toHaveBeenCalledWith('/reporting/edit/r1');
    }));

    it('opens the files without the update right, and only for a report that has files', fakeAsync(() => {
        init({ create: false, read: true, update: false, delete: false });

        const rows = Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]')) as HTMLElement[];
        expect(rows[1].classList).not.toContain('clickable-row');
        rows[0].click();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/reporting/files/r1');
    }));

    it('has no action menu and no create button without any right', fakeAsync(() => {
        init({ create: false, read: false, update: false, delete: false });

        expect(component.displayedColumns).not.toContain('actions');
        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
    }));

    it('shows the template, the number of files and the id under the name', fakeAsync(() => {
        init();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        expect(row.querySelector('.name-cell')?.textContent).toContain('Energy');
        expect(row.textContent).toContain('energy');
        expect(row.querySelector('.num')?.textContent).toContain('2');
        expect(row.querySelector('.muted')?.textContent).toContain('r1');
    }));

    it('offers the new report button with the create right', fakeAsync(() => {
        init();

        expect(fixture.nativeElement.querySelector('senergy-page-header button').textContent).toContain('New report');
    }));
});
