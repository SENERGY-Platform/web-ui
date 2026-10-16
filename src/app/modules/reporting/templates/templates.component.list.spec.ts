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

import { TemplatesComponent } from './templates.component';
import { ReportingService } from '../shared/reporting.service';
import { TemplateModel } from '../shared/reporting.model';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from '../../../core/services/preferences.service';

describe('TemplatesComponent list', () => {
    let fixture: ComponentFixture<TemplatesComponent>;
    let component: TemplatesComponent;
    let service: jasmine.SpyObj<ReportingService>;
    let router: Router;

    const templates = [{ id: 't1', name: 'Energy', type: 'pdf' }, { id: 't2', name: 'Water', type: 'docx' }] as TemplateModel[];

    function init(mayCreate = true) {
        service = jasmine.createSpyObj<ReportingService>('ReportingService', ['getTemplates', 'getTemplatePreviewFile', 'userHasCreateReportAuthorization']);
        service.getTemplates.and.returnValue(of({ data: templates }));
        service.userHasCreateReportAuthorization.and.returnValue(mayCreate);
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, MatSnackBarModule, TemplatesComponent],
            providers: [
                provideRouter([]),
                { provide: ReportingService, useValue: service },
                { provide: SearchbarService, useValue: { currentSearchText: new BehaviorSubject(''), changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
            ],
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigateByUrl').and.resolveTo(true);
        fixture = TestBed.createComponent(TemplatesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getTemplates.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);

        expect(service.getTemplates).toHaveBeenCalledTimes(1);
    }));

    it('starts a new report from the template on a row click', fakeAsync(() => {
        init();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();

        expect(router.navigateByUrl).toHaveBeenCalledWith('/reporting/new/t1');
    }));

    it('has neither clickable rows nor a menu without the create right', fakeAsync(() => {
        init(false);

        expect(fixture.nativeElement.querySelector('tr.clickable-row')).toBeNull();
        expect(component.displayedColumns).toEqual(['name', 'type']);
    }));

    it('shows the id muted under the name and the type as a chip', fakeAsync(() => {
        init();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        expect(row.querySelector('.name-cell')?.textContent).toContain('Energy');
        expect(row.querySelector('.muted')?.textContent).toContain('t1');
        expect(row.querySelector('.type-chip')?.textContent).toContain('pdf');
    }));
});
