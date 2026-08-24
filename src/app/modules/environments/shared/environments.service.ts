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

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from '../../admin/permissions/shared/permission.model';
import { DatasetMeta, Environment, StateChange } from './environments.model';

@Injectable({
    providedIn: 'root',
})
export class EnvironmentsService {
    // Undefined when the endpoint is not part of ladon's startup authorization sweep.
    authorizations: PermissionTestResponse | undefined;
    datasetAuthorizations: PermissionTestResponse | undefined;

    private readonly environmentsUrl = environment.mosesUrl + '/environments';
    private readonly datasetsUrl = environment.mosesUrl + '/datasets';

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService,
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(this.environmentsUrl);
        this.datasetAuthorizations = this.ladonService.getUserAuthorizationsForURI(this.datasetsUrl);
    }

    listEnvironments(): Observable<Environment[]> {
        return this.http.get<Environment[]>(this.environmentsUrl).pipe(
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'listEnvironments', [])),
        );
    }

    getEnvironment(id: string): Observable<Environment | null> {
        return this.http.get<Environment>(this.environmentsUrl + '/' + encodeURIComponent(id)).pipe(
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'getEnvironment', null)),
        );
    }

    createEnvironment(env: Environment): Observable<Environment | null> {
        return this.http.post<Environment>(this.environmentsUrl, env).pipe(
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'createEnvironment', null)),
        );
    }

    updateEnvironment(id: string, env: Environment): Observable<Environment | null> {
        return this.http.put<Environment>(this.environmentsUrl + '/' + encodeURIComponent(id), env).pipe(
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'updateEnvironment', null)),
        );
    }

    deleteEnvironment(id: string): Observable<boolean> {
        return this.http.delete(this.environmentsUrl + '/' + encodeURIComponent(id), { observe: 'response' }).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'deleteEnvironment', false)),
        );
    }

    setState(id: string, change: StateChange): Observable<boolean> {
        return this.http.patch(this.environmentsUrl + '/' + encodeURIComponent(id) + '/state', change, { observe: 'response' }).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'setState', false)),
        );
    }

    listDatasets(): Observable<DatasetMeta[]> {
        return this.http.get<DatasetMeta[]>(this.datasetsUrl).pipe(
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'listDatasets', [])),
        );
    }

    getDataset(id: string): Observable<DatasetMeta | null> {
        return this.http.get<DatasetMeta>(this.datasetsUrl + '/' + encodeURIComponent(id)).pipe(
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'getDataset', null)),
        );
    }

    uploadDataset(name: string, content: string, tz?: string): Observable<DatasetMeta | null> {
        // HttpParams' default codec leaves ';' unescaped, which the server's query parser
        // treats as a separator and drops the pair entirely. Build the query string
        // ourselves so every character in name/tz is percent-encoded.
        const query = ['name=' + encodeURIComponent(name)];
        if (tz !== undefined) {
            query.push('tz=' + encodeURIComponent(tz));
        }
        return this.http.post<DatasetMeta>(this.datasetsUrl + '?' + query.join('&'), content, {
            headers: new HttpHeaders({ 'Content-Type': 'text/plain' }),
        }).pipe(
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'uploadDataset', null)),
        );
    }

    deleteDataset(id: string): Observable<boolean> {
        return this.http.delete(this.datasetsUrl + '/' + encodeURIComponent(id), { observe: 'response' }).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'deleteDataset', false)),
        );
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations?.GET ?? false;
    }

    userHasCreateAuthorization(): boolean {
        return this.authorizations?.POST ?? false;
    }

    userHasUpdateAuthorization(): boolean {
        return this.authorizations?.PUT ?? false;
    }

    userHasDeleteAuthorization(): boolean {
        return this.authorizations?.DELETE ?? false;
    }
}
