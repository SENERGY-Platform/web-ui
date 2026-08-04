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
import { ReactiveFormsModule } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import { ReportComponent } from './report.component';
import { ReportingService } from '../shared/reporting.service';
import {
    ReportCreateResponseModel,
    ReportJobModel,
    ReportModel,
    ReportObjectModel,
    ReportResponseModel,
    TemplateResponseModel
} from '../shared/reporting.model';
import { CoreModule } from '../../../core/core.module';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { ReportObjectViewService } from '../shared/report-object-view.service';
import { findNode } from '../shared/report-object-node';

const completeObjects = (): { [key: string]: ReportObjectModel } => ({
    consumption: {
        name: 'consumption', valueType: 'float64',
        query: { columns: [{ name: 'root.value' }], deviceId: 'd1', serviceId: 's1' },
    } as ReportObjectModel,
});

const incompleteObjects = (): { [key: string]: ReportObjectModel } => ({
    consumption: {
        name: 'consumption', valueType: 'float64',
        query: { columns: [{ name: '' }], deviceId: '', serviceId: '' },
    } as ReportObjectModel,
});

const runningJob = (): ReportJobModel => ({
    id: 'j1', reportId: 'r1', status: 'running', step: 'collecting_data', createdAt: '2026-01-01T00:00:00Z',
});

const failedJob = (): ReportJobModel => ({
    id: 'j1', reportId: 'r1', status: 'failed', error: 'template not found', createdAt: '2026-01-01T00:00:00Z',
});

const doneJob = (): ReportJobModel => ({
    id: 'j1', reportId: 'r1', status: 'done', reportFileId: 'f1', createdAt: '2026-01-01T00:00:00Z',
});

class MockReportingService {
    createResponse: ReportCreateResponseModel | null = { id: 'r-new', jobId: 'j-new' };
    templateObjects: { [key: string]: ReportObjectModel } = completeObjects();
    reportObjects: { [key: string]: ReportObjectModel } = completeObjects();
    saved: ReportModel[] = [];
    updated: ReportModel[] = [];
    created: ReportModel[] = [];
    unfinishedJob: ReportJobModel | null = null;
    jobUpdates: ReportJobModel[] = [];
    polledJobIds: string[] = [];

    getUnfinishedReportJob(_reportId: string): Observable<ReportJobModel | null> {
        return of(this.unfinishedJob);
    }

    pollReportJob(jobId: string): Observable<ReportJobModel | null> {
        this.polledJobIds.push(jobId);
        return of(...this.jobUpdates);
    }

    getTemplate(id: string): Observable<TemplateResponseModel | null> {
        return of({
            data: {
                id, name: 'Template ' + id, type: 'pdf',
                data: { id, name: 'Template ' + id, dataJsonString: '', dataStructured: this.templateObjects },
            }
        });
    }

    getReport(id: string): Observable<ReportResponseModel | null> {
        return of({
            data: {
                id,
                name: 'Energy Report',
                templateId: 't1',
                templateName: 'Template t1',
                data: this.reportObjects,
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
                ReactiveFormsModule,
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

        it('should load the template and build the form of its report objects', () => {
            fixture.detectChanges();

            expect(component.ready).toBe(true);
            expect(component.template.name).toBe('Template t1');
            expect(component.dataForm.controls['consumption']).toBeDefined();
        });

        it('should require a report name', () => {
            fixture.detectChanges();

            expect(component.isValid()).toBe(false);
            expect(component.validationErrors[0].field).toBe('Report Name');

            component.form.controls.name.setValue('My Report');

            expect(component.isValid()).toBe(true);
            expect(component.validationErrors).toEqual([]);
        });

        it('should block saving while a query is incomplete', () => {
            reportingService.templateObjects = incompleteObjects();
            fixture.detectChanges();
            component.form.controls.name.setValue('My Report');

            expect(component.isValid()).toBe(false);
            expect(component.validationErrors.map((error) => error.field)).toEqual(['Device', 'Service', 'Path']);
            expect(component.validationErrors[0].path).toBe('consumption');
        });

        it('should save the form values without an id', () => {
            fixture.detectChanges();
            component.form.controls.name.setValue('My Report');
            findNode(component.nodes, 'consumption')!.form.get('query.path')?.setValue('root.other');

            component.save();

            expect(reportingService.saved.length).toBe(1);
            expect(reportingService.saved[0].id).toBeUndefined();
            expect(reportingService.saved[0].name).toBe('My Report');
            expect(reportingService.saved[0].templateId).toBe('t1');
            expect(reportingService.saved[0].data['consumption'].query?.columns[0].name).toBe('root.other');
        });

        it('should not change the loaded report objects before saving', () => {
            fixture.detectChanges();
            findNode(component.nodes, 'consumption')!.form.get('query.path')?.setValue('root.other');

            expect(component.template.data?.dataStructured['consumption'].query?.columns[0].name).toBe('root.value');
        });

        it('should reveal the object of a validation error', () => {
            fixture.detectChanges();
            const reveal = spyOn(fixture.debugElement.injector.get(ReportObjectViewService), 'reveal');

            component.revealObject('consumption');
            component.revealObject('');

            expect(reveal).toHaveBeenCalledTimes(1);
            expect(reveal).toHaveBeenCalledWith('consumption');
        });

        it('should build a tree node per report object', () => {
            fixture.detectChanges();

            expect(component.nodes.map((node) => node.path)).toEqual(['consumption']);
        });

        it('should show the report settings until an object is selected', () => {
            fixture.detectChanges();

            expect(component.settingsSelected).toBe(true);
            expect(component.selectedNode).toBeUndefined();

            component.revealObject('consumption');

            expect(component.settingsSelected).toBe(false);
            expect(component.selectedNode?.path).toBe('consumption');
        });

        it('should expand and collapse all containers', () => {
            fixture.detectChanges();
            const viewService = fixture.debugElement.injector.get(ReportObjectViewService);

            component.expandAll();
            expect(viewService.isExpanded('consumption')).toBe(false);

            component.collapseAll();
            expect(viewService.isExpanded('consumption')).toBe(false);
        });

        it('should redirect to the edit route after queueing the report', () => {
            fixture.detectChanges();
            component.form.controls.name.setValue('My Report');

            component.create();

            expect(component.creating).toBe(false);
            expect(component.reportId).toBe('r-new');
            expect(router.navigateByUrl).toHaveBeenCalledWith('/reporting/edit/r-new');
        });

        // The redirect recreates the component, which picks the job up again on init.
        it('should leave watching the job to the edit route it redirects to', () => {
            fixture.detectChanges();
            component.form.controls.name.setValue('My Report');

            component.create();

            expect(reportingService.polledJobIds).toEqual([]);
        });

        it('should stay usable if queueing the report fails', () => {
            fixture.detectChanges();
            reportingService.createResponse = null;

            component.create();

            expect(component.creating).toBe(false);
            expect(component.ready).toBe(true);
            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        // The editor must stay usable while the report file is being built.
        it('should not block the editor while the report is being created', () => {
            fixture.detectChanges();
            component.form.controls.name.setValue('My Report');

            component.create();

            expect(component.ready).toBe(true);
        });

        it('should add and remove e-mail receivers', () => {
            fixture.detectChanges();

            component.addEmailAddress();
            component.addEmailAddress();
            expect(component.emailReceivers.length).toBe(2);

            component.emailReceivers.at(0).setValue('a@b.c');
            component.deleteEmailAddress(1);

            expect(component.emailReceivers.length).toBe(1);
            expect(component.emailReceivers.at(0).value).toBe('a@b.c');
        });
    });

    describe('for an existing report', () => {
        beforeEach(waitForAsync(() => {
            TestBed.resetTestingModule();
            configure({ reportId: 'r1' });
        }));

        it('should load the report into the form', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            expect(component.ready).toBe(true);
            expect(component.form.controls.name.value).toBe('Energy Report');
            expect(component.form.controls.cron.value).toBe('0 0 1 * *');
            expect(component.emailReceivers.length).toBe(1);
            expect(component.emailReceivers.at(0).value).toBe('a@b.c');
            expect(component.templateId).toBe('t1');
            expect(component.template.name).toBe('Template t1');
            expect(component.dataForm.controls['consumption']).toBeDefined();
        }));

        it('should update with the report id', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            component.update();

            expect(reportingService.updated.length).toBe(1);
            expect(reportingService.updated[0].id).toBe('r1');
            expect(reportingService.updated[0].templateId).toBe('t1');
            expect(reportingService.updated[0].emailReceivers).toEqual(['a@b.c']);
            tick(2000);
        }));

        it('should show the progress of the queued report file', fakeAsync(() => {
            fixture.detectChanges();
            tick();
            reportingService.createResponse = { id: 'r1', jobId: 'j1' };
            reportingService.jobUpdates = [runningJob()];

            component.create();

            expect(reportingService.polledJobIds).toEqual(['j1']);
            expect(component.reportJobRunning).toBe(true);
            expect(component.reportJobLabel).toBe('Collecting data');
            tick(2000);
        }));

        it('should report that the report file is ready', fakeAsync(() => {
            fixture.detectChanges();
            tick();
            reportingService.createResponse = { id: 'r1', jobId: 'j1' };
            reportingService.jobUpdates = [runningJob(), doneJob()];

            component.create();

            expect(component.reportJobRunning).toBe(false);
            expect(component.reportJobFinished).toBe(true);
            expect(component.reportJobFailed).toBe(false);
            expect(component.reportJobLabel).toBe('Report created');
            tick(2000);
        }));

        it('should show why the report file could not be created', fakeAsync(() => {
            fixture.detectChanges();
            tick();
            reportingService.createResponse = { id: 'r1', jobId: 'j1' };
            reportingService.jobUpdates = [failedJob()];

            component.create();

            expect(component.reportJobFailed).toBe(true);
            expect(component.reportJobLabel).toBe('Report creation failed: template not found');
            tick(2000);
        }));

        it('should let the status be dismissed once it is finished', fakeAsync(() => {
            fixture.detectChanges();
            tick();
            reportingService.createResponse = { id: 'r1', jobId: 'j1' };
            reportingService.jobUpdates = [doneJob()];
            component.create();

            component.dismissReportJob();

            expect(component.reportJob).toBeNull();
            tick(2000);
        }));

        // Without this the status would be lost on a reload and after the redirect
        // that follows creating a brand new report.
        it('should pick up a report file that is still being built on init', fakeAsync(() => {
            reportingService.unfinishedJob = runningJob();
            reportingService.jobUpdates = [runningJob()];

            fixture.detectChanges();
            tick();

            expect(component.reportJob?.id).toBe('j1');
            expect(reportingService.polledJobIds).toEqual(['j1']);
        }));

        it('should render the status next to the create button', fakeAsync(() => {
            reportingService.unfinishedJob = runningJob();
            reportingService.jobUpdates = [runningJob()];

            fixture.detectChanges();
            tick();
            fixture.detectChanges();

            const status = (fixture.nativeElement as HTMLElement).querySelector('.job-status');
            expect(status).not.toBeNull();
            expect(status?.textContent).toContain('Collecting data');
        }));

        it('should render no status strip when nothing is being built', fakeAsync(() => {
            fixture.detectChanges();
            tick();
            fixture.detectChanges();

            expect((fixture.nativeElement as HTMLElement).querySelector('.job-status')).toBeNull();
        }));

        it('should show no status when nothing is being built', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            expect(component.reportJob).toBeNull();
            expect(reportingService.polledJobIds).toEqual([]);
        }));
    });
});
