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

import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { REPORT_JOB_POLL_MAX_FAILURES, ReportingService } from './reporting.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../environments/environment';
import {
    ReportJobModel,
    ReportJobResponseModel,
    ReportListResponseModel,
    ReportModel
} from './reporting.model';

class MockLadonService {
    authorizations: { [key: string]: { [method: string]: boolean } } = {};

    getUserAuthorizationsForURI(uri: string): any {
        return this.authorizations[uri];
    }
}

describe('ReportingService', () => {
    let service: ReportingService;
    let httpMock: HttpTestingController;
    let ladonService: MockLadonService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule],
            providers: [
                ReportingService,
                { provide: LadonService, useClass: MockLadonService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ]
        });
        service = TestBed.inject(ReportingService);
        httpMock = TestBed.inject(HttpTestingController);
        ladonService = TestBed.inject(LadonService) as unknown as MockLadonService;
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should load the reports', (done) => {
        const reports: ReportModel[] = [{ id: 'r1', name: 'Report 1' } as ReportModel];
        service.getReports().subscribe((resp: ReportListResponseModel | null) => {
            expect(resp?.data).toEqual(reports);
            done();
        });
        const req = httpMock.expectOne(environment.reportEngineUrl + '/report');
        expect(req.request.method).toBe('GET');
        req.flush({ data: reports });
    });

    it('should return null if loading the reports fails', (done) => {
        service.getReports().subscribe((resp: ReportListResponseModel | null) => {
            expect(resp).toBeNull();
            done();
        });
        httpMock.expectOne(environment.reportEngineUrl + '/report')
            .flush('error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should delete a report file by report and file id', (done) => {
        service.deleteReportFile('r1', 'f1').subscribe(() => done());
        const req = httpMock.expectOne(environment.reportEngineUrl + '/report/file/r1/f1');
        expect(req.request.method).toBe('DELETE');
        req.flush('');
    });

    it('should request the report file as blob', (done) => {
        service.getReportFile('r1', 'f1').subscribe(() => done());
        const req = httpMock.expectOne(environment.reportEngineUrl + '/report/file/r1/f1');
        expect(req.request.responseType).toBe('blob');
        req.flush(new Blob(['content']));
    });

    it('should request a single report job', (done) => {
        const job = { id: 'j1', reportId: 'r1', status: 'running' } as ReportJobModel;
        service.getReportJob('j1').subscribe((resp: ReportJobResponseModel | null) => {
            expect(resp?.data).toEqual(job);
            done();
        });
        const req = httpMock.expectOne(environment.reportEngineUrl + '/report/job/j1');
        expect(req.request.method).toBe('GET');
        req.flush({ data: job });
    });

    it('should return null if the report job is gone', (done) => {
        service.getReportJob('j1').subscribe((resp: ReportJobResponseModel | null) => {
            expect(resp).toBeNull();
            done();
        });
        httpMock.expectOne(environment.reportEngineUrl + '/report/job/j1')
            .flush('not found', { status: 404, statusText: 'Not Found' });
    });

    it('should request the report jobs of a report', (done) => {
        service.getReportJobs('r1', 5).subscribe(() => done());
        const req = httpMock.expectOne(environment.reportEngineUrl + '/report/job?reportId=r1&limit=5');
        expect(req.request.method).toBe('GET');
        req.flush({ data: [] });
    });

    it('should request the report jobs without filters', (done) => {
        service.getReportJobs().subscribe(() => done());
        httpMock.expectOne(environment.reportEngineUrl + '/report/job').flush({ data: [] });
    });

    it('should poll a report job until it is done', fakeAsync(() => {
        const seen: (ReportJobModel | null)[] = [];
        let completed = false;
        service.pollReportJob('j1', 10).subscribe({
            next: (job: ReportJobModel | null) => seen.push(job),
            complete: () => completed = true,
        });
        tick();

        httpMock.expectOne(environment.reportEngineUrl + '/report/job/j1')
            .flush({ data: { id: 'j1', reportId: 'r1', status: 'running' } });
        tick(10);
        httpMock.expectOne(environment.reportEngineUrl + '/report/job/j1')
            .flush({ data: { id: 'j1', reportId: 'r1', status: 'done', reportFileId: 'f1' } });

        expect(seen.length).toBe(2);
        expect(seen[0]?.status).toBe('running');
        expect(seen[1]?.status).toBe('done');
        expect(completed).toBe(true);
        discardPeriodicTasks();
    }));

    it('should stop polling a report job that failed', fakeAsync(() => {
        let completed = false;
        service.pollReportJob('j1', 10).subscribe({ complete: () => completed = true });
        tick();

        httpMock.expectOne(environment.reportEngineUrl + '/report/job/j1')
            .flush({ data: { id: 'j1', reportId: 'r1', status: 'failed', error: 'boom' } });

        expect(completed).toBe(true);
        discardPeriodicTasks();
    }));

    // A single failed request must not make the ui give up on a running report.
    it('should keep polling through a single failed request', fakeAsync(() => {
        const seen: (ReportJobModel | null)[] = [];
        service.pollReportJob('j1', 10).subscribe((job: ReportJobModel | null) => seen.push(job));
        tick();

        httpMock.expectOne(environment.reportEngineUrl + '/report/job/j1')
            .flush('error', { status: 500, statusText: 'Internal Server Error' });
        expect(seen.length).toBe(0);

        tick(10);
        httpMock.expectOne(environment.reportEngineUrl + '/report/job/j1')
            .flush({ data: { id: 'j1', reportId: 'r1', status: 'done' } });

        expect(seen.length).toBe(1);
        expect(seen[0]?.status).toBe('done');
        discardPeriodicTasks();
    }));

    it('should give up polling after repeated failures', fakeAsync(() => {
        const seen: (ReportJobModel | null)[] = [];
        let completed = false;
        service.pollReportJob('j1', 10).subscribe({
            next: (job: ReportJobModel | null) => seen.push(job),
            complete: () => completed = true,
        });
        tick();

        for (let i = 0; i < REPORT_JOB_POLL_MAX_FAILURES; i++) {
            httpMock.expectOne(environment.reportEngineUrl + '/report/job/j1')
                .flush('error', { status: 500, statusText: 'Internal Server Error' });
            tick(10);
        }

        expect(seen).toEqual([null]);
        expect(completed).toBe(true);
        discardPeriodicTasks();
    }));

    it('should report an unfinished report job of a report', (done) => {
        service.getUnfinishedReportJob('r1').subscribe((job: ReportJobModel | null) => {
            expect(job?.id).toBe('j1');
            done();
        });
        httpMock.expectOne(environment.reportEngineUrl + '/report/job?reportId=r1&limit=1')
            .flush({ data: [{ id: 'j1', reportId: 'r1', status: 'running' }] });
    });

    it('should report no unfinished report job when the newest one is done', (done) => {
        service.getUnfinishedReportJob('r1').subscribe((job: ReportJobModel | null) => {
            expect(job).toBeNull();
            done();
        });
        httpMock.expectOne(environment.reportEngineUrl + '/report/job?reportId=r1&limit=1')
            .flush({ data: [{ id: 'j1', reportId: 'r1', status: 'done' }] });
    });

    it('should report no unfinished report job for a report without any', (done) => {
        service.getUnfinishedReportJob('r1').subscribe((job: ReportJobModel | null) => {
            expect(job).toBeNull();
            done();
        });
        httpMock.expectOne(environment.reportEngineUrl + '/report/job?reportId=r1&limit=1')
            .flush({ data: [] });
    });

    it('should report missing authorizations as false', () => {
        expect(service.userHasCreateReportAuthorization()).toBe(false);
        expect(service.userHasUpdateReportAuthorization()).toBe(false);
        expect(service.userHasDeleteReportAuthorization()).toBe(false);
        expect(service.userHasReadReportFileAuthorization()).toBe(false);
        expect(service.userHasDeleteReportFileAuthorization()).toBe(false);
    });

    it('should read the authorizations per endpoint and method', () => {
        ladonService.authorizations[environment.reportEngineUrl + '/report'] = { PUT: true, DELETE: false };
        ladonService.authorizations[environment.reportEngineUrl + '/report/create'] = { POST: true };
        ladonService.authorizations[environment.reportEngineUrl + '/report/file'] = { GET: true, DELETE: true };

        expect(service.userHasUpdateReportAuthorization()).toBe(true);
        expect(service.userHasDeleteReportAuthorization()).toBe(false);
        expect(service.userHasCreateReportAuthorization()).toBe(true);
        expect(service.userHasReadReportFileAuthorization()).toBe(true);
        expect(service.userHasDeleteReportFileAuthorization()).toBe(true);
    });
});
