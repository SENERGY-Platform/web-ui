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
import { Observable, of, TimeoutError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from '../../admin/permissions/shared/permission.model';
import {
    ApiError,
    CatalogDeviceType,
    DatasetMeta,
    Environment,
    EnvironmentShares,
    EnvironmentState,
    HistoryOccupiedDevice,
    HistoryPollResult,
    HistoryStartRefusal,
    HistoryStatus,
    isSharesFailure,
    isValidationError,
    SharesFailure,
    StateChange,
    ValidationError,
} from './environments.model';

const HISTORY_POLL_TIMEOUT_MS = 15000;
// Start and abort are single requests with no poll behind them; a socket that hangs would
// otherwise leave the tab's buttons disabled for as long as the OS keeps the connection.
const HISTORY_REQUEST_TIMEOUT_MS = 30 * 1000;

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

/**
 * Classifies a POST .../history failure. Moses answers a 409 in two shapes that only differ in
 * text: the occupied-window body always offers "force: true" on its first line, followed by one
 * "device <id> (<name>)" line per device (name omitted where the asset has none); a run or
 * backfill already in progress does not mention force at all. 503 means the occupied-window
 * check itself did not answer in time; 400 means the window is invalid (future, too long, too
 * dense).
 */
function classifyHistoryStartRefusal(error: HttpErrorResponse): HistoryStartRefusal {
    const body = describeHttpError(error);
    if (error.status === 409 && body.includes('force: true')) {
        const lines = body.split('\n');
        return { kind: 'occupied', message: lines[0], devices: parseOccupiedDevices(lines.slice(1)), status: error.status };
    }
    if (error.status === 409) {
        return { kind: 'running', message: body, status: error.status };
    }
    if (error.status === 503) {
        return { kind: 'timeout', message: body, status: error.status };
    }
    if (error.status === 400) {
        return { kind: 'window', message: body, status: error.status };
    }
    return { kind: 'other', message: body || 'Could not start the history run.', status: error.status };
}

/**
 * Parses "device <id>" / "device <id> (<name>)" lines -- see moses' OccupiedDevice.String. An
 * asset name may itself contain a newline, which breaks its "(<name>)" across two or more of
 * the body's lines; any line that does not start with "device " is folded into the previous
 * device's name instead of being treated as its own entry.
 */
function parseOccupiedDevices(lines: string[]): HistoryOccupiedDevice[] {
    const deviceStart = /^device (\S+)(?: \((.*))?$/;
    const devices: HistoryOccupiedDevice[] = [];
    let openName: { device: HistoryOccupiedDevice; parts: string[] } | undefined;

    const closeOpenName = () => {
        if (!openName) {
            return;
        }
        const name = openName.parts.join('\n');
        openName.device.name = name.endsWith(')') ? name.slice(0, -1) : name;
        openName = undefined;
    };

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        const match = deviceStart.exec(line);
        if (match) {
            closeOpenName();
            // name is set explicitly (even to undefined) so a nameless device's shape matches { id, name } in tests.
            const device: HistoryOccupiedDevice = { id: match[1], name: undefined };
            devices.push(device);
            if (match[2] !== undefined) {
                if (match[2].endsWith(')')) {
                    device.name = match[2].slice(0, -1);
                } else {
                    openName = { device, parts: [match[2]] };
                }
            }
        } else if (openName) {
            openName.parts.push(line);
            if (line.endsWith(')')) {
                closeOpenName();
            }
        }
    });
    closeOpenName();
    return devices;
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

    getShares(id: string): Observable<EnvironmentShares | null> {
        return this.http.get<EnvironmentShares>(this.environmentsUrl + '/' + encodeURIComponent(id) + '/shares').pipe(
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'getShares', null)),
        );
    }

    /**
     * PUT with a three-way result like updateEnvironmentChecked: the saved EnvironmentShares, a
     * SharesFailure (502, some devices could not be updated -- nothing was saved, retrying the
     * same PUT is safe), or an ApiError for anything else, including a 400's plain-text body.
     */
    setShares(id: string, shares: EnvironmentShares): Observable<EnvironmentShares | SharesFailure | ApiError> {
        return this.http.put<EnvironmentShares>(this.environmentsUrl + '/' + encodeURIComponent(id) + '/shares', shares).pipe(
            catchError((error: HttpErrorResponse) => {
                this.errorHandlerService.logError(EnvironmentsService.name, 'setShares', error);
                if (isSharesFailure(error.error)) {
                    return of(error.error as SharesFailure);
                }
                return of({ message: describeHttpError(error), status: error.status } as ApiError);
            }),
        );
    }

    deleteEnvironment(id: string): Observable<boolean> {
        return this.http.delete(this.environmentsUrl + '/' + encodeURIComponent(id), { observe: 'response' }).pipe(
            map(() => true),
            catchError(this.errorHandlerService.handleError(EnvironmentsService.name, 'deleteEnvironment', false)),
        );
    }

    /**
     * PATCH .../state with the same three-way result as updateEnvironmentChecked: `true` on
     * success (the endpoint answers 204, nothing to return), a structured ValidationError (400
     * with a problems array -- e.g. a timeline-governed context key rejected unchanged-only), or
     * an ApiError for anything else, status included, so a 404 (not running/not migrated) can be
     * told apart from a 409 or a plain-text 400 the way updateEnvironmentChecked's caller can.
     */
    setStateChecked(id: string, change: StateChange): Observable<true | ValidationError | ApiError> {
        return this.http.patch(this.environmentsUrl + '/' + encodeURIComponent(id) + '/state', change, { observe: 'response' }).pipe(
            map(() => true as const),
            catchError((error: HttpErrorResponse) => {
                this.errorHandlerService.logError(EnvironmentsService.name, 'setStateChecked', error);
                if (isValidationError(error.error)) {
                    return of(error.error as ValidationError);
                }
                return of({ message: describeHttpError(error), status: error.status } as ApiError);
            }),
        );
    }

    /**
     * The environment's history run, if any is known, discriminated so the poller can tell "no
     * run known" (404) apart from a failed request -- see HistoryPollResult. A 404 is the
     * ordinary steady state while nothing has run yet, so it is not logged as an error; every
     * other failure, including a request stuck past HISTORY_POLL_TIMEOUT_MS, is.
     */
    getHistory(id: string): Observable<HistoryPollResult> {
        return this.http.get<HistoryStatus>(this.environmentsUrl + '/' + encodeURIComponent(id) + '/history').pipe(
            timeout(HISTORY_POLL_TIMEOUT_MS),
            map((status) => ({ kind: 'status', status } as HistoryPollResult)),
            catchError((error: unknown) => {
                if (error instanceof TimeoutError) {
                    return of({ kind: 'error', message: 'Request timed out.' } as HistoryPollResult);
                }
                const httpError = error as HttpErrorResponse;
                if (httpError.status === 404) {
                    return of({ kind: 'none' } as HistoryPollResult);
                }
                this.errorHandlerService.logError(EnvironmentsService.name, 'getHistory', httpError);
                return of({ kind: 'error', message: describeHttpError(httpError), status: httpError.status } as HistoryPollResult);
            }),
        );
    }

    /**
     * Starts a history run from `from` to now, replacing the live state for the duration. A
     * refusal (already running, an occupied window, a check timeout, or an invalid window) comes
     * back as a HistoryStartRefusal instead of throwing -- see classifyHistoryStartRefusal.
     */
    startHistory(id: string, from: string, force: boolean): Observable<HistoryStatus | HistoryStartRefusal> {
        return this.http.post<HistoryStatus>(this.environmentsUrl + '/' + encodeURIComponent(id) + '/history', { from, force }).pipe(
            timeout(HISTORY_REQUEST_TIMEOUT_MS),
            catchError((error: unknown) => {
                if (error instanceof TimeoutError) {
                    return of({ kind: 'other', message: 'Request timed out.', status: 0 } as HistoryStartRefusal);
                }
                const httpError = error as HttpErrorResponse;
                // 409, 503 and 400 are answers the tab explains to the user, not failures worth a console entry.
                if (![400, 409, 503].includes(httpError.status)) {
                    this.errorHandlerService.logError(EnvironmentsService.name, 'startHistory', httpError);
                }
                return of(classifyHistoryStartRefusal(httpError));
            }),
        );
    }

    /**
     * Accepts the abort of a history run (202 with the run as it stood; a run moses closed itself
     * comes back as cancelled) -- it does not wait for the run to stop. Discriminated like
     * getHistory, so a failed DELETE is never mistaken for "no run known".
     */
    cancelHistory(id: string): Observable<HistoryPollResult> {
        return this.http.delete<HistoryStatus>(this.environmentsUrl + '/' + encodeURIComponent(id) + '/history').pipe(
            timeout(HISTORY_REQUEST_TIMEOUT_MS),
            map((status) => ({ kind: 'status', status } as HistoryPollResult)),
            catchError((error: unknown) => {
                if (error instanceof TimeoutError) {
                    return of({ kind: 'error', message: 'Request timed out.' } as HistoryPollResult);
                }
                const httpError = error as HttpErrorResponse;
                if (httpError.status === 404) {
                    return of({ kind: 'none' } as HistoryPollResult);
                }
                this.errorHandlerService.logError(EnvironmentsService.name, 'cancelHistory', httpError);
                return of({ kind: 'error', message: describeHttpError(httpError), status: httpError.status } as HistoryPollResult);
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
