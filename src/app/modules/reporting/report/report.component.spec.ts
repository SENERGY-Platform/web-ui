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
import { FormsModule } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import { ReportComponent } from './report.component';
import { ReportingService } from '../shared/reporting.service';
import {
    ReportCreateResponseModel,
    ReportModel,
    ReportResponseModel,
    TemplateResponseModel
} from '../shared/reporting.model';
import { CoreModule } from '../../../core/core.module';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';

class MockReportingService {
    createResponse: ReportCreateResponseModel | null = { id: 'r-new' };
    saved: ReportModel[] = [];
    updated: ReportModel[] = [];
    created: ReportModel[] = [];

    getTemplate(id: string): Observable<TemplateResponseModel | null> {
        return of({ data: { id, name: 'Template ' + id, type: 'pdf', data: undefined } });
    }

    getReport(id: string): Observable<ReportResponseModel | null> {
        return of({
            data: {
                id,
                name: 'Energy Report',
                templateId: 't1',
                templateName: 'Template t1',
                data: {} as any,
                cron: '0 0 1 * *',
                emailReceivers: ['a@b.c'],
                emailSubject: 'subject',
            } as ReportModel
        });
    }

    createReport(report: ReportModel): Observable<ReportCreateResponseModel | null> {
        this.created.push(report);
        return of(this.createResponse);
    }

    saveReport(report: ReportModel): Observable<HttpResponse<string> | null> {
        this.saved.push(report);
        return of(new HttpResponse<string>({ status: 200 }));
    }

    updateReport(report: ReportModel): Observable<HttpResponse<string> | null> {
        this.updated.push(report);
        return of(new HttpResponse<string>({ status: 200 }));
    }
}

class MockDeviceInstancesService {
    getDeviceInstances(): Observable<{ result: any[]; total: number }> {
        return of({ result: [], total: 0 });
    }
}

describe('ReportComponent', () => {
    let component: ReportComponent;
    let fixture: ComponentFixture<ReportComponent>;
    let reportingService: MockReportingService;
    let router: { navigateByUrl: jasmine.Spy };

    const configure = (params: { [key: string]: string }) => {
        router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ReportComponent],
            imports: [
                CommonModule,
                CoreModule,
                FormsModule,
                NoopAnimationsModule,
                MatIconModule,
                MatCardModule,
                MatExpansionModule,
                MatFormFieldModule,
                MatInputModule,
                MatDialogModule,
                MatSnackBarModule,
            ],
            providers: [
                { provide: ReportingService, useClass: MockReportingService },
                { provide: DeviceInstancesService, useClass: MockDeviceInstancesService },
                { provide: Router, useValue: router },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } },
            ]
        });
        fixture = TestBed.createComponent(ReportComponent);
        component = fixture.componentInstance;
        reportingService = TestBed.inject(ReportingService) as unknown as MockReportingService;
    };

    describe('for a new report', () => {
        beforeEach(waitForAsync(() => configure({ templateId: 't1' })));

        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should load the template', () => {
            fixture.detectChanges();

            expect(component.ready).toBe(true);
            expect(component.template.name).toBe('Template t1');
        });

        it('should require a report name', () => {
            fixture.detectChanges();

            expect(component.isValid()).toBe(false);
            component.reportName = '  ';
            expect(component.isValid()).toBe(false);
            component.reportName = 'My Report';
            expect(component.isValid()).toBe(true);
        });

        it('should save without an id', () => {
            fixture.detectChanges();
            component.reportName = 'My Report';

            component.save();

            expect(reportingService.saved.length).toBe(1);
            expect(reportingService.saved[0].id).toBeUndefined();
            expect(reportingService.saved[0].name).toBe('My Report');
            expect(reportingService.saved[0].templateId).toBe('t1');
        });

        it('should redirect to the edit route after creating the report', () => {
            fixture.detectChanges();
            component.reportName = 'My Report';

            component.create();

            expect(component.ready).toBe(true);
            expect(component.reportId).toBe('r-new');
            expect(router.navigateByUrl).toHaveBeenCalledWith('/reporting/edit/r-new');
        });

        it('should stay usable if creating the report fails', () => {
            fixture.detectChanges();
            reportingService.createResponse = null;

            component.create();

            expect(component.ready).toBe(true);
            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });
    });

    describe('for an existing report', () => {
        beforeEach(waitForAsync(() => {
            TestBed.resetTestingModule();
            configure({ reportId: 'r1' });
        }));

        it('should load the report and its template', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            expect(component.ready).toBe(true);
            expect(component.reportName).toBe('Energy Report');
            expect(component.templateId).toBe('t1');
            expect(component.template.name).toBe('Template t1');
            expect(component.cron).toBe('0 0 1 * *');
            expect(component.emailReceivers).toEqual(['a@b.c']);
        }));

        it('should update with the report id', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            component.update();

            expect(reportingService.updated.length).toBe(1);
            expect(reportingService.updated[0].id).toBe('r1');
            expect(reportingService.updated[0].templateId).toBe('t1');
            tick(2000);
        }));
    });

    describe('e-mail receivers', () => {
        beforeEach(waitForAsync(() => {
            TestBed.resetTestingModule();
            configure({ templateId: 't1' });
        }));

        it('should add and remove receivers', () => {
            fixture.detectChanges();

            component.addEmailAddress();
            component.addEmailAddress();
            expect(component.emailReceivers?.length).toBe(2);

            component.emailReceivers = ['a@b.c', 'd@e.f'];
            component.deleteEmailAddress(0);
            expect(component.emailReceivers).toEqual(['d@e.f']);
        });

        it('should ignore removing a receiver if there are none', () => {
            fixture.detectChanges();

            expect(() => component.deleteEmailAddress(0)).not.toThrow();
        });
    });
});
