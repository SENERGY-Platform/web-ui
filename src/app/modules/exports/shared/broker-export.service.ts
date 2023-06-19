/*
 * Copyright 2021 InfAI (CC SES)
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

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {environment} from '../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {ExportModel, ExportResponseModel} from './export.model';
import { AllowedMethods, PermissionTestResponse } from '../../admin/permissions/shared/permission.model';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class BrokerExportService {
    static ID_PREFIX = 'urn:infai:ses:broker-export:';
    authorizationObs: Observable<PermissionTestResponse> = new Observable()

    constructor(
        private http: HttpClient, 
        private errorHandlerService: ErrorHandlerService, 
        private ladonService: LadonService
    ) {
        this.authorizationObs = this.ladonService.getUserAuthorizationsForURI(environment.brokerExportServiceUrl, ["GET"])
    }

    getExports(
        search?: string,
        limit?: number,
        offset?: number,
        sort?: string,
        order?: string,
        generated?: boolean,
        searchField?: string,
    ): Observable<ExportResponseModel | null> {
        if (searchField === undefined || searchField === null) {
            searchField = 'name';
        }
        return this.http
            .get<ExportResponseModel>(
                environment.brokerExportServiceUrl +
                    '/instances?limit=' +
                    limit +
                    '&offset=' +
                    offset +
                    '&order=' +
                    sort +
                    ':' +
                    order +
                    (search ? '&search=' + searchField + ':' + search : '') +
                    (generated !== undefined ? '&generated=' + generated.valueOf() : ''),
            )
            .pipe(
                map((resp: ExportResponseModel) => resp || []),
                catchError(this.errorHandlerService.handleError(BrokerExportService.name, 'getExports: Error', null)),
            );
    }

    getExport(id: string): Observable<ExportModel | null> {
        return this.http.get<ExportModel>(environment.brokerExportServiceUrl + '/instances/' + id).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(BrokerExportService.name, 'getExport: Error', null)),
        );
    }

    startPipeline(exp: ExportModel): Observable<ExportModel> {
        return this.http
            .post<ExportModel>(environment.brokerExportServiceUrl + '/instances', exp)
            .pipe(catchError(this.errorHandlerService.handleError(BrokerExportService.name, 'startPipeline: Error', {} as ExportModel)));
    }

    editExport(id: string, exp: ExportModel): Observable<{ status: number }> {
        return this.http
            .put(environment.brokerExportServiceUrl + '/instances/' + id, exp, {
                responseType: 'text',
                observe: 'response',
            })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(BrokerExportService.name, 'editExport: Error', { status: 400 })),
            );
    }

    stopPipeline(exp: ExportModel): Observable<{ status: number }> {
        return this.stopPipelineById(exp.ID || '');
    }

    stopPipelineById(id: string): Observable<{ status: number }> {
        return this.http
            .delete(environment.brokerExportServiceUrl + '/instances/' + id, {
                responseType: 'text',
                observe: 'response',
            })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(BrokerExportService.name, 'stopPipelineById: Error', { status: 404 })),
            );
    }

    stopPipelines(exp: string[]): Observable<{ status: number }> {
        return this.http
            .request('DELETE', environment.brokerExportServiceUrl + '/instances', {
                body: exp,
                responseType: 'text',
                observe: 'response',
            })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(BrokerExportService.name, 'stopPipelines: Error', { status: 404 })),
            );
    }

    userHasReadAuthorization(): Observable<boolean> {
        return this.userHasAuthorization("GET")   
    }

    userHasAuthorization(method: AllowedMethods): Observable<boolean> {
        return new Observable(obs => {
            this.authorizationObs.subscribe(result => {
                obs.next(result[method])
                obs.complete()
            })
        })    
    }
}
