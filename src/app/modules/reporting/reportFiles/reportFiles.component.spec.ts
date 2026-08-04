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
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import { ReportFilesComponent } from './reportFiles.component';
import { ReportingService } from '../shared/reporting.service';
import { ReportFileModel, ReportJobModel, ReportModel, ReportResponseModel } from '../shared/reporting.model';
import { CoreModule } from '../../../core/core.module';
import { DialogsService } from '../../../core/services/dialogs.service';

const reportFiles = [
    { id: 'f1', type: 'pdf', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'f2', type: 'pdf', createdAt: '2026-02-01T00:00:00Z' },
] as ReportFileModel[];

const runningJob = (): ReportJobModel => ({
    id: 'j1', reportId: 'r1', status: 'running', step: 'rendering', createdAt: '2026-01-01T00:00:00Z',
});

const doneJob = (): ReportJobModel => ({
    id: 'j1', reportId: 'r1', status: 'done', reportFileId: 'f3', createdAt: '2026-01-01T00:00:00Z',
});

const failedJob = (): ReportJobModel => ({
    id: 'j1', reportId: 'r1', status: 'failed', error: 'template not found', createdAt: '2026-01-01T00:00:00Z',
});

class MockReportingService {
    report: ReportModel | undefined = { id: 'r1', name: 'Energy Report', reportFiles } as ReportModel;
    deleted: string[] = [];
    unfinishedJob: ReportJobModel | null = null;
    jobUpdates: ReportJobModel[] = [];
    reportLoads = 0;

    getReport(_id: string): Observable<ReportResponseModel | null> {
        this.reportLoads++;
        return of(this.report === undefined ? null : { data: this.report });
    }

    getUnfinishedReportJob(_reportId: string): Observable<ReportJobModel | null> {
        return of(this.unfinishedJob);
    }

    pollReportJob(_jobId: string): Observable<ReportJobModel | null> {
        return of(...this.jobUpdates);
    }

    deleteReportFile(_reportId: string, fileId: string): Observable<HttpResponse<string> | null> {
        this.deleted.push(fileId);
        return of(new HttpResponse<string>({ status: 200 }));
    }

    getReportFile(): Observable<Blob | null> {
        return of(null);
    }

    userHasDeleteReportFileAuthorization(): boolean {
        return true;
    }
}

class MockDialogsService {
    confirmed = true;

    openDeleteDialog(_text: string): any {
        return { afterClosed: () => of(this.confirmed) };
    }
}

describe('ReportFilesComponent', () => {
    let component: ReportFilesComponent;
    let fixture: ComponentFixture<ReportFilesComponent>;
    let reportingService: MockReportingService;
    let dialogsService: MockDialogsService;

    const configure = (reportId: string | null) => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ReportFilesComponent],
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
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap(reportId === null ? {} : { reportId }) } }
                },
            ]
        });
        fixture = TestBed.createComponent(ReportFilesComponent);
        component = fixture.componentInstance;
        reportingService = TestBed.inject(ReportingService) as unknown as MockReportingService;
        dialogsService = TestBed.inject(DialogsService) as unknown as MockDialogsService;
    };

    beforeEach(waitForAsync(() => configure('r1')));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load the report files and connect sort and paginator', () => {
        fixture.detectChanges();

        expect(component.ready).toBe(true);
        expect(component.reportsDataSource.data.length).toBe(2);
        expect(component.reportsDataSource.sort).toBeTruthy();
        expect(component.reportsDataSource.paginator).toBeTruthy();
    });

    it('should render without a report without failing', () => {
        reportingService.report = undefined;

        expect(() => fixture.detectChanges()).not.toThrow();
        expect(component.ready).toBe(true);
        expect(component.reportsDataSource.data.length).toBe(0);
    });

    it('should tolerate a report without files', () => {
        reportingService.report = { id: 'r1', name: 'Energy Report' } as ReportModel;

        expect(() => fixture.detectChanges()).not.toThrow();
        expect(component.reportsDataSource.data.length).toBe(0);
    });

    it('should delete a file after the deletion was confirmed', fakeAsync(() => {
        fixture.detectChanges();

        component.delete(new MouseEvent('click'), reportFiles[0]);
        tick();

        expect(reportingService.deleted).toEqual(['f1']);
        expect(component.reportsDataSource.data.length).toBe(1);
        expect(component.reportsDataSource.data[0].id).toBe('f2');
        tick(3000);
    }));

    it('should keep the file if the deletion was not confirmed', fakeAsync(() => {
        fixture.detectChanges();
        dialogsService.confirmed = false;

        component.delete(new MouseEvent('click'), reportFiles[0]);
        tick();

        expect(reportingService.deleted).toEqual([]);
        expect(component.reportsDataSource.data.length).toBe(2);
    }));

    it('should reset the download indicator if no file was returned', fakeAsync(() => {
        fixture.detectChanges();

        component.download(new MouseEvent('click'), reportFiles[0]);
        tick();

        expect(component.downloading).toBe(false);
    }));

    it('should show no status when no report file is being built', fakeAsync(() => {
        fixture.detectChanges();
        tick();

        expect(component.reportJob).toBeNull();
        expect(component.reportJobRunning).toBe(false);
    }));

    it('should show the progress of a report file that is still being built', fakeAsync(() => {
        reportingService.unfinishedJob = runningJob();
        reportingService.jobUpdates = [runningJob()];

        fixture.detectChanges();
        tick();

        expect(component.reportJob?.id).toBe('j1');
        expect(component.reportJobRunning).toBe(true);
        expect(component.reportJobLabel).toBe('Rendering report');
    }));

    // The new file only shows up in the report model, so the list has to be read again.
    it('should reload the file list once the report file is done', fakeAsync(() => {
        reportingService.unfinishedJob = runningJob();
        reportingService.jobUpdates = [runningJob(), doneJob()];
        reportingService.report = {
            id: 'r1', name: 'Energy Report',
            reportFiles: [...reportFiles, { id: 'f3', type: 'pdf', createdAt: '2026-03-01T00:00:00Z' }],
        } as ReportModel;

        fixture.detectChanges();
        tick();

        expect(reportingService.reportLoads).toBe(2);
        expect(component.reportsDataSource.data.length).toBe(3);
        expect(component.reportJobRunning).toBe(false);
    }));

    it('should render the status of a report file that is being built', fakeAsync(() => {
        reportingService.unfinishedJob = runningJob();
        reportingService.jobUpdates = [runningJob()];

        fixture.detectChanges();
        tick();
        fixture.detectChanges();

        const status = (fixture.nativeElement as HTMLElement).querySelector('.job-status');
        expect(status).not.toBeNull();
        expect(status?.textContent).toContain('Rendering report');
    }));

    it('should render no status strip when nothing is being built', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelector('.job-status')).toBeNull();
    }));

    it('should not reload the file list when the report file failed', fakeAsync(() => {
        reportingService.unfinishedJob = runningJob();
        reportingService.jobUpdates = [runningJob(), failedJob()];

        fixture.detectChanges();
        tick();

        expect(reportingService.reportLoads).toBe(1);
        expect(component.reportJobFailed).toBe(true);
        expect(component.reportJobLabel).toBe('Report creation failed: template not found');
    }));

    describe('without a report id in the route', () => {
        beforeEach(waitForAsync(() => {
            TestBed.resetTestingModule();
            configure(null);
        }));

        it('should be ready without loading a report', () => {
            fixture.detectChanges();

            expect(component.ready).toBe(true);
            expect(component.reportsDataSource.data.length).toBe(0);
        });

        it('should not look for report jobs', () => {
            fixture.detectChanges();

            expect(component.reportJob).toBeNull();
        });
    });
});
