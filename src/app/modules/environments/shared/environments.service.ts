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
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from '../../admin/permissions/shared/permission.model';
import {
    ApiError,
    CatalogDeviceType,
    DatasetMeta,
    Environment,
    EnvironmentState,
    isValidationError,
    StateChange,
    ValidationError,
} from './environments.model';

/**
 * Best-effort human message for an endpoint with no structured error body of its own.
 * The dataset upload and live-state endpoints answer with a plain-text or loosely
 * shaped JSON error (e.g. "line 12: ..."), and that text is the point of showing the
 * error at all -- handleError's generic snackbar would throw it away.
 */
function describeHttpError(error: HttpErrorResponse): string {
    const body = error.error;
    if (typeof body === 'string' && body.trim().length > 0) {
        return body;
    }
    if (body && typeof body === 'object') {
        const withMessage = body as { message?: string; error?: string };
        if (withMessage.message) {
            return withMessage.message;
        }
        if (withMessage.error) {
            return withMessage.error;
        }
    }
    return error.message || 'Request failed with status ' + error.status;
}

@Injectable({
    providedIn: 'root',
})
export class EnvironmentsService {
    // Undefined when the endpoint is not part of ladon's startup authorization sweep.
    authorizations: PermissionTestResponse | undefined;
    datasetAuthorizations: PermissionTestResponse | undefined;

    private readonly environmentsUrl = environment.mosesUrl + '/environments';
    private readonly datasetsUrl = environment.mosesUrl + '/datasets';
    private readonly deviceTypesUrl = environment.mosesUrl + '/device-types';
    private readonly devicesUrl = environment.mosesUrl + '/devices';

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

    createEnvironment(env: Environment): Observable<Environment | ValidationError | ApiError> {
        return this.http.post<Environment>(this.environmentsUrl, env).pipe(
            catchError((error: HttpErrorResponse) => {
                this.errorHandlerService.logError(EnvironmentsService.name, 'createEnvironment', error);
                if (isValidationError(error.error)) {
                    return of(error.error as ValidationError);
                }
                return of({ message: describeHttpError(error) } as ApiError);
            }),
        );
    }

    /**
     * PUT with a three-way result: the saved Environment, a structured ValidationError (400
     * with a problems array the editor can place in the tree), or an ApiError for anything
     * else -- including a 400 whose body is plain text (e.g. a Go json.Unmarshal message
     * like "cannot unmarshal number 900.5 into ... int64"). Never falls back to null/true:
     * a caller that only checks "is this a ValidationError" and otherwise assumes success
     * would treat that plain-text 400 as a save that worked. The ApiError carries the HTTP
     * status too -- the editor needs to tell a 409 (optimistic-locking conflict, see
     * Environment.version) apart from any other failure.
     */
    updateEnvironmentChecked(id: string, env: Environment): Observable<Environment | ValidationError | ApiError> {
        return this.http.put<Environment>(this.environmentsUrl + '/' + encodeURIComponent(id), env).pipe(
            catchError((error: HttpErrorResponse) => {
                this.errorHandlerService.logError(EnvironmentsService.name, 'updateEnvironmentChecked', error);
                if (isValidationError(error.error)) {
                    return of(error.error as ValidationError);
                }
                return of({ message: describeHttpError(error), status: error.status } as ApiError);
            }),
        );
    }

    /**
     * The simulation's actual current values, for the Live state tab's live view: null on any
     * failure (including a 404 for one that has not been migrated/is not running), same as
     * getEnvironment -- distinguishing failure reasons is not worth it for a value polled
     * every 10s, it just means the tab keeps showing whatever it showed before.
     */
    getEnvironmentState(id: string): Observable<EnvironmentState | null> {
        return this.http.get<EnvironmentState>(this.environmentsUrl + '/' + encodeURIComponent(id) + '/state').pipe(
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'getEnvironmentState', null)),
        );
    }

    deleteEnvironment(id: string): Observable<boolean> {
        return this.http.delete(this.environmentsUrl + '/' + encodeURIComponent(id), { observe: 'response' }).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'deleteEnvironment', false)),
        );
    }

    /**
     * Same PATCH as setState, but keeps the error message instead of collapsing every
     * failure to `false` -- a 404 here means the environment is not running or has not
     * been migrated yet, and that reason is what the live-state panel needs to show.
     */
    setStateChecked(id: string, change: StateChange): Observable<true | ApiError> {
        return this.http.patch(this.environmentsUrl + '/' + encodeURIComponent(id) + '/state', change, { observe: 'response' }).pipe(
            map(() => true as const),
            catchError((error: HttpErrorResponse) => {
                this.errorHandlerService.logError(EnvironmentsService.name, 'setStateChecked', error);
                return of({ message: describeHttpError(error) });
            }),
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

    /**
     * A 400 for this endpoint usually names the broken CSV line -- that text is the entire
     * value of the error, so the upload dialog needs it verbatim instead of a bare failure.
     */
    uploadDatasetChecked(name: string, content: string, tz?: string): Observable<DatasetMeta | ApiError> {
        return this.http.post<DatasetMeta>(this.datasetsUrl + '?' + this.datasetQuery(name, tz), content, {
            headers: new HttpHeaders({ 'Content-Type': 'text/plain' }),
        }).pipe(
            catchError((error: HttpErrorResponse) => {
                this.errorHandlerService.logError(EnvironmentsService.name, 'uploadDatasetChecked', error);
                return of({ message: describeHttpError(error) });
            }),
        );
    }

    /**
     * HttpParams' default codec leaves ';' unescaped, which the server's query parser
     * treats as a separator and drops the pair entirely. Build the query string ourselves
     * so every character in name/tz is percent-encoded.
     */
    private datasetQuery(name: string, tz?: string): string {
        const query = ['name=' + encodeURIComponent(name)];
        if (tz !== undefined) {
            query.push('tz=' + encodeURIComponent(tz));
        }
        return query.join('&');
    }

    deleteDataset(id: string): Observable<boolean> {
        return this.http.delete(this.datasetsUrl + '/' + encodeURIComponent(id), { observe: 'response' }).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'deleteDataset', false)),
        );
    }

    /** Every device type an asset can be built from, with readable service names -- see CatalogDeviceType. */
    listDeviceTypes(): Observable<CatalogDeviceType[]> {
        return this.http.get<CatalogDeviceType[]>(this.deviceTypesUrl).pipe(
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'listDeviceTypes', [])),
        );
    }

    /** Deleting one that does not exist is not an error -- see the swagger description. */
    deleteDevice(id: string): Observable<boolean> {
        return this.http.delete(this.devicesUrl + '/' + encodeURIComponent(id), { observe: 'response' }).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'deleteDevice', false)),
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

    userHasDatasetReadAuthorization(): boolean {
        return this.datasetAuthorizations?.GET ?? false;
    }

    userHasDatasetCreateAuthorization(): boolean {
        return this.datasetAuthorizations?.POST ?? false;
    }

    userHasDatasetDeleteAuthorization(): boolean {
        return this.datasetAuthorizations?.DELETE ?? false;
    }
}
