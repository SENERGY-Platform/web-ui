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
import {HttpClient, HttpResponse} from '@angular/common/http';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { environment } from '../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
    ReportCreateResponseModel,
    ReportListResponseModel, ReportModel,
    ReportResponseModel,
    TemplateListResponseModel,
    TemplateResponseModel
} from './reporting.model';

@Injectable({
    providedIn: 'root',
})
export class ReportingService {

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
    ) {}

    getTemplates(): Observable<TemplateListResponseModel | null> {
        return this.http.get<TemplateListResponseModel>(environment.reportEngineUrl + '/templates')
            .pipe(
                map((resp: TemplateListResponseModel) => resp || []),
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'getTemplates: Error', null)),
            );
    }

    getTemplate(id: string): Observable<TemplateResponseModel | null> {
        return this.http.get<TemplateResponseModel>(environment.reportEngineUrl + '/templates/'+id)
            .pipe(
                map((resp: TemplateResponseModel) => resp || []),
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'getTemplate: Error', null)),
            );
    }

    createReport(data: ReportModel = {} as ReportModel): Observable<ReportCreateResponseModel | null> {
        return this.http.post<ReportCreateResponseModel>(environment.reportEngineUrl + '/report/create', data)
            .pipe(
                map((resp: ReportCreateResponseModel) => resp || {}),
                catchError(this.errorHandlerService.handleErrorWithSnackBar('Error',ReportingService.name, 'createReport: Error', null)),
            );
    }

    saveReport(data: ReportModel = {} as ReportModel): Observable<HttpResponse<string> | null> {
        return this.http.post<any>(environment.reportEngineUrl + '/report', data, {observe: 'response'})
            .pipe(
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'saveReport: Error', null)),
            );
    }

    updateReport(data: ReportModel = {} as ReportModel): Observable<HttpResponse<string> | null> {
        return this.http.put<any>(environment.reportEngineUrl + '/report', data,{observe: 'response'} )
            .pipe(
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'updateReport: Error', null)),
            );
    }

    deleteReport(id: string): Observable<HttpResponse<string> | null> {
        return this.http.delete<any>(environment.reportEngineUrl + '/report/'+id)
            .pipe(
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'deleteReport: Error', null)),
            );
    }

    getReports(): Observable<ReportListResponseModel | null> {
        return this.http.get<ReportListResponseModel>(environment.reportEngineUrl + '/report')
            .pipe(
                map((resp: ReportListResponseModel) => resp || []),
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'getReports: Error', null)),
            );
    }

    getReport(id: string): Observable<ReportResponseModel | null> {
        return this.http.get<ReportResponseModel>(environment.reportEngineUrl + '/report/'+id)
            .pipe(
                map((resp: ReportResponseModel) => resp || []),
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'getReport: Error', null)),
            );
    }

    getReportFile(reportId: string, fileId: string): Observable<Blob | null> {
        return this.http.get(environment.reportEngineUrl + '/report/file/'+reportId+'/'+fileId, {responseType: 'blob'})
            .pipe(
                map((resp: Blob) => resp || null),
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'getReportFile: Error', null)),
            );
    }

    deleteReportFile(reportId: string, fileId: string): Observable<HttpResponse<string> | null> {
        return this.http.delete<any>(environment.reportEngineUrl + '/report/file/'+reportId+'/'+fileId)
            .pipe(
                catchError(this.errorHandlerService.handleError(ReportingService.name, 'deleteReportFile: Error', null)),
            );
    }
}
