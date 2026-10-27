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
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';
import {
    EngineActivityPage,
    EngineDebugState,
    EngineDeployment,
    EngineDeploymentInput,
    EngineDeploymentVersion,
    EngineEventReconstruction,
    EngineHistoryVariable,
    EngineSchedule,
    EngineScheduleInput,
    EngineVariable,
} from '../model/automation-engine.model';

/** the namespace of process deployments; smart services live in 'smart-services' */
export const PROCESSES_NAMESPACE = 'processes';
export const SMART_SERVICES_NAMESPACE = 'smart-services';

/** a step of the history: an activity sequence number, or the last step at or before a time; neither is the latest */
export interface EngineHistoryStep {
    seq?: number;
    time?: string;
}

/** The message of an error answer of the engine, or of the failed request if the answer carries none. */
export function engineErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
        if (err.error && typeof err.error === 'object' && typeof err.error.message === 'string') {
            return err.error.message;
        }
        return err.status === 0 ? 'the automation-engine is not reachable' : err.status + ' ' + err.statusText;
    }
    return String(err);
}

/**
 * Calls of the automation-engine API under /namespaces/{ns}/... . Errors are logged and answered with
 * null or a status, as in the other services of this app. The debugging calls are the exception: they
 * pass the error on, because the debugger shows the message of the engine (a step no longer
 * available, a gateway not reachable); engineErrorMessage reads it.
 */
@Injectable({
    providedIn: 'root',
})
export class AutomationEngineService {
    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
    ) {}

    createDeployment(input: EngineDeploymentInput, namespace: string = PROCESSES_NAMESPACE): Observable<EngineDeployment | null> {
        return this.http
            .post<EngineDeployment>(this.namespaceUrl(namespace) + '/deployments', input)
            .pipe(catchError(this.errorHandlerService.handleError(AutomationEngineService.name, 'createDeployment', null)));
    }

    deleteDeployment(id: string, namespace: string = PROCESSES_NAMESPACE): Observable<{ status: number }> {
        return this.http
            .delete(this.namespaceUrl(namespace) + '/deployments/' + encodeURIComponent(id), { observe: 'response', responseType: 'text' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(AutomationEngineService.name, 'deleteDeployment', { status: 500 })),
            );
    }

    createSchedule(input: EngineScheduleInput, namespace: string = PROCESSES_NAMESPACE): Observable<EngineSchedule | null> {
        return this.http
            .post<EngineSchedule>(this.namespaceUrl(namespace) + '/schedules', input)
            .pipe(catchError(this.errorHandlerService.handleError(AutomationEngineService.name, 'createSchedule', null)));
    }

    deleteSchedule(id: string, namespace: string = PROCESSES_NAMESPACE): Observable<{ status: number }> {
        return this.http
            .delete(this.namespaceUrl(namespace) + '/schedules/' + encodeURIComponent(id), { observe: 'response', responseType: 'text' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(AutomationEngineService.name, 'deleteSchedule', { status: 500 })),
            );
    }

    getDeploymentVersion(namespace: string, id: string, version: number): Observable<EngineDeploymentVersion> {
        return this.http.get<EngineDeploymentVersion>(this.namespaceUrl(namespace) + '/deployments/' + encodeURIComponent(id) + '/versions/' + version);
    }

    /** live state of an instance; with evaluateEvents the current value of waiting device events is evaluated */
    getDebugState(namespace: string, id: string, evaluateEvents = false): Observable<EngineDebugState> {
        let params = new HttpParams();
        if (evaluateEvents) {
            params = params.set('evaluate_events', 'true');
        }
        return this.http.get<EngineDebugState>(this.instanceUrl(namespace, id) + '/debug', { params });
    }

    /** state after a step of the history, reconstructed by the engine */
    getHistoryState(namespace: string, id: string, step: EngineHistoryStep = {}): Observable<EngineDebugState> {
        return this.http.get<EngineDebugState>(this.instanceUrl(namespace, id) + '/history', { params: stepParams(step) });
    }

    /** complete current value of a variable, with elementId the local variable of a token at that element */
    getVariable(namespace: string, id: string, name: string, elementId?: string): Observable<EngineVariable> {
        let params = new HttpParams();
        if (elementId) {
            params = params.set('element_id', elementId);
        }
        return this.http.get<EngineVariable>(this.instanceUrl(namespace, id) + '/variables/' + encodeURIComponent(name), { params });
    }

    /** complete value of a variable at a step of the history */
    getHistoryVariable(namespace: string, id: string, name: string, step: EngineHistoryStep, elementId?: string): Observable<EngineHistoryVariable> {
        let params = stepParams(step);
        if (elementId) {
            params = params.set('element_id', elementId);
        }
        return this.http.get<EngineHistoryVariable>(this.instanceUrl(namespace, id) + '/history/variables/' + encodeURIComponent(name), { params });
    }

    /** activity entries after afterSeq, in sequence order */
    getActivities(namespace: string, id: string, afterSeq: number, limit: number): Observable<EngineActivityPage> {
        const params = new HttpParams().set('after_seq', afterSeq).set('limit', limit);
        return this.http.get<EngineActivityPage>(this.instanceUrl(namespace, id) + '/activities', { params });
    }

    /** evaluations of a device event reconstructed from the time series; after continues with next of the previous page */
    getEventEvaluations(namespace: string, id: string, elementId: string, run?: number, after?: string): Observable<EngineEventReconstruction> {
        let params = new HttpParams().set('element_id', elementId);
        if (run) {
            params = params.set('run', run);
        }
        if (after) {
            params = params.set('after', after);
        }
        return this.http.get<EngineEventReconstruction>(this.instanceUrl(namespace, id) + '/event-evaluations', { params });
    }

    private instanceUrl(namespace: string, id: string): string {
        return this.namespaceUrl(namespace) + '/instances/' + encodeURIComponent(id);
    }

    private namespaceUrl(namespace: string): string {
        return environment.automationEngineUrl + '/namespaces/' + encodeURIComponent(namespace);
    }
}

function stepParams(step: EngineHistoryStep): HttpParams {
    let params = new HttpParams();
    if (step.seq) {
        params = params.set('seq', step.seq);
    }
    if (step.time) {
        params = params.set('time', step.time);
    }
    return params;
}
