/*
 * Copyright 2024 InfAI (CC SES)
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

import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { environment } from '../../../../environments/environment';
import { catchError, concatMap, filter, map, takeWhile } from 'rxjs/operators';
import { Observable, defer, timer } from 'rxjs';
import {
    ReportCreateResponseModel,
    ReportJobListResponseModel,
    ReportJobModel,
    ReportJobResponseModel,
    ReportListResponseModel, ReportModel,
    ReportResponseModel,
    TemplateListResponseModel,
    TemplateResponseModel
} from './reporting.model';
import { reportJobDone } from './report-job';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';

/** How often a running report job is asked for its status. */
export const REPORT_JOB_POLL_INTERVAL_MS = 2000;

/**
 * How many failed status requests in a row end the polling. A single hiccup must
 * not make the ui give up on a report that is still being built.
 */
export const REPORT_JOB_POLL_MAX_FAILURES = 3;

@Injectable({
    providedIn: 'root',
})
export class ReportingService {

    private readonly reportUrl = environment.reportEngineUrl + '/report';
    private readonly reportFileUrl = environment.reportEngineUrl + '/report/file';
    private readonly reportCreateUrl = environment.reportEngineUrl + '/report/create';
    private readonly reportJobUrl = environment.reportEngineUrl + '/report/job';
    private readonly templateUrl = environment.reportEngineUrl + '/templates';

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService,
    ) {}

    getTemplates(): Observable<TemplateListResponseModel | null> {
        return this.http.get<TemplateListResponseModel>(this.templateUrl)
            .pipe(
                catchError(this.errorHandlerService.handleErrorWithSnackBar('Templates could not be loaded', ReportingService.name, 'getTemplates: Error', null)),
            );
    }

    getTemplate(id: string): Observable<TemplateResponseModel | null> {
        return this.http.get<TemplateResponseModel>(this.templateUrl + '/' + id)
            .pipe(
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'getTemplate: Error', null)),
            );
    }

    createReport(data: ReportModel = {} as ReportModel): Observable<ReportCreateResponseModel | null> {
        return this.http.post<ReportCreateResponseModel>(this.reportCreateUrl, data)
            .pipe(
                catchError(this.errorHandlerService.handleErrorWithSnackBar('Report could not be created', ReportingService.name, 'createReport: Error', null)),
            );
    }

    /**
     * Gets the status of a single report file creation.
     */
    getReportJob(jobId: string): Observable<ReportJobResponseModel | null> {
        return this.http.get<ReportJobResponseModel>(this.reportJobUrl + '/' + jobId)
            .pipe(
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'getReportJob: Error', null)),
            );
    }

    /**
     * Gets the most recent report file creations, newest first.
     */
    getReportJobs(reportId?: string, limit?: number): Observable<ReportJobListResponseModel | null> {
        const params: string[] = [];
        if (reportId !== undefined) {
            params.push('reportId=' + encodeURIComponent(reportId));
        }
        if (limit !== undefined) {
            params.push('limit=' + limit);
        }
        const url = this.reportJobUrl + (params.length > 0 ? '?' + params.join('&') : '');
        return this.http.get<ReportJobListResponseModel>(url)
            .pipe(
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'getReportJobs: Error', null)),
            );
    }

    /**
     * Emits the status of a report job until it is done or failed, then completes.
     * Emits null and completes when the status could not be read repeatedly.
     */
    pollReportJob(jobId: string, intervalMs: number = REPORT_JOB_POLL_INTERVAL_MS): Observable<ReportJobModel | null> {
        return defer(() => {
            let failures = 0;
            return timer(0, intervalMs).pipe(
                concatMap(() => this.getReportJob(jobId)),
                map((resp: ReportJobResponseModel | null) => {
                    failures = resp === null ? failures + 1 : 0;
                    return resp === null ? null : resp.data;
                }),
                // keep polling through the odd failed request, give up after a few
                filter((job: ReportJobModel | null) => job !== null || failures >= REPORT_JOB_POLL_MAX_FAILURES),
                takeWhile((job: ReportJobModel | null) => job !== null && !reportJobDone(job), true),
            );
        });
    }

    /**
     * Emits the report job that is currently building a file for the given report,
     * or null when none is in progress.
     */
    getUnfinishedReportJob(reportId: string): Observable<ReportJobModel | null> {
        return this.getReportJobs(reportId, 1).pipe(
            map((resp: ReportJobListResponseModel | null) => {
                const job = resp?.data?.[0];
                return job !== undefined && !reportJobDone(job) ? job : null;
            }),
        );
    }

    saveReport(data: ReportModel = {} as ReportModel): Observable<HttpResponse<string> | null> {
        return this.http.post<string>(this.reportUrl, data, {observe: 'response'})
            .pipe(
                catchError(this.errorHandlerService.handleErrorWithSnackBar('Report could not be saved', ReportingService.name, 'saveReport: Error', null)),
            );
    }

    updateReport(data: ReportModel = {} as ReportModel): Observable<HttpResponse<string> | null> {
        return this.http.put<string>(this.reportUrl, data, {observe: 'response'})
            .pipe(
                catchError(this.errorHandlerService.handleErrorWithSnackBar('Report could not be updated', ReportingService.name, 'updateReport: Error', null)),
            );
    }

    deleteReport(id: string): Observable<HttpResponse<string> | null> {
        return this.http.delete<string>(this.reportUrl + '/' + id, {observe: 'response'})
            .pipe(
                catchError(this.errorHandlerService.handleErrorWithSnackBar('Report could not be deleted', ReportingService.name, 'deleteReport: Error', null)),
            );
    }

    getReports(): Observable<ReportListResponseModel | null> {
        return this.http.get<ReportListResponseModel>(this.reportUrl)
            .pipe(
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'getReports: Error', null)),
            );
    }

    getReport(id: string): Observable<ReportResponseModel | null> {
        return this.http.get<ReportResponseModel>(this.reportUrl + '/' + id)
            .pipe(
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'getReport: Error', null)),
            );
    }

    getReportFile(reportId: string, fileId: string): Observable<Blob | null> {
        return this.http.get(this.reportFileUrl + '/' + reportId + '/' + fileId, {responseType: 'blob'})
            .pipe(
                catchError(this.errorHandlerService.handleErrorWithSnackBar('Report file could not be downloaded', ReportingService.name, 'getReportFile: Error', null)),
            );
    }

    getTemplatePreviewFile(id: string): Observable<Blob | null> {
        return this.http.get(this.templateUrl + '/preview/' + id, {responseType: 'blob'})
            .pipe(
                catchError(this.errorHandlerService.handleErrorWithSnackBar('Template preview could not be downloaded', ReportingService.name, 'getTemplatePreviewFile: Error', null)),
            );
    }

    deleteReportFile(reportId: string, fileId: string): Observable<HttpResponse<string> | null> {
        return this.http.delete<string>(this.reportFileUrl + '/' + reportId + '/' + fileId, {observe: 'response'})
            .pipe(
                catchError(this.errorHandlerService.handleErrorWithSnackBar('Report file could not be deleted', ReportingService.name, 'deleteReportFile: Error', null)),
            );
    }

    userHasCreateReportAuthorization(): boolean {
        return this.ladonService.getUserAuthorizationsForURI(this.reportCreateUrl)?.POST === true;
    }

    userHasUpdateReportAuthorization(): boolean {
        return this.ladonService.getUserAuthorizationsForURI(this.reportUrl)?.PUT === true;
    }

    userHasDeleteReportAuthorization(): boolean {
        return this.ladonService.getUserAuthorizationsForURI(this.reportUrl)?.DELETE === true;
    }

    userHasReadReportFileAuthorization(): boolean {
        return this.ladonService.getUserAuthorizationsForURI(this.reportFileUrl)?.GET === true;
    }

    userHasDeleteReportFileAuthorization(): boolean {
        return this.ladonService.getUserAuthorizationsForURI(this.reportFileUrl)?.DELETE === true;
    }
}
