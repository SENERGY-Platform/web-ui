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

import { Injectable, inject } from '@angular/core';
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
    EngineDeploymentListOptions,
    EngineDeploymentVersion,
    EngineEventReconstruction,
    EngineHistoryVariable,
    EngineInstance,
    EngineInstanceListOptions,
    EngineNetwork,
    EnginePage,
    EngineSchedule,
    EngineScheduleInput,
    EngineVariable,
} from '../model/automation-engine.model';

/** the namespace of process deployments; smart services live in 'smart-services' */
export const PROCESSES_NAMESPACE = 'processes';
export const SMART_SERVICES_NAMESPACE = 'smart-services';

/** One module of a smart service instance as the automation-engine lists it. Only the fields the web-ui reads. */
export interface AutomationEngineModule {
    id: string;
    instance_id: string;
    module_type: string;
    /** keys the module was deployed under, e.g. `suggestion:<id>` */
    keys?: string[];
    module_data: {
        process_deployment_name?: string;
        export?: { ID?: string };
        [field: string]: unknown;
    };
}

export interface AutomationEngineModuleList {
    items: AutomationEngineModule[];
    total: number;
    limit: number;
    offset: number;
}

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
 * Calls of the automation-engine API under /namespaces/{ns}/... . Errors are reported through the
 * ErrorHandlerService and answered with null or a status, as in the other services of this app. The
 * debugging, list and network calls pass the error on: the debugger shows the engine's message
 * (engineErrorMessage), the services of the process pages answer it in their own format.
 */
@Injectable({
    providedIn: 'root',
})
export class AutomationEngineService {
    private http = inject(HttpClient);
    private errorHandlerService = inject(ErrorHandlerService);

    createDeployment(input: EngineDeploymentInput, namespace: string = PROCESSES_NAMESPACE): Observable<EngineDeployment | null> {
        return this.http
            .post<EngineDeployment>(this.namespaceUrl(namespace) + '/deployments', input)
            .pipe(catchError(this.errorHandlerService.handleError(AutomationEngineService.name, 'createDeployment', null)));
    }

    deleteDeployment(id: string, namespace: string = PROCESSES_NAMESPACE): Observable<{ status: number }> {
        return this.delete('/deployments/', id, namespace, 'deleteDeployment');
    }

    /**
     * For clean-ups: a 404 means the deployment is already gone (answered quietly); other failures answer their real
     * status. `quiet` logs such a failure without the error notice.
     */
    deleteDeploymentIfExists(id: string, quiet = false, namespace: string = PROCESSES_NAMESPACE): Observable<{ status: number }> {
        return this.deleteIfExists('/deployments/', id, quiet, namespace, 'deleteDeploymentIfExists');
    }

    createSchedule(input: EngineScheduleInput, namespace: string = PROCESSES_NAMESPACE): Observable<EngineSchedule | null> {
        return this.http
            .post<EngineSchedule>(this.namespaceUrl(namespace) + '/schedules', input)
            .pipe(catchError(this.errorHandlerService.handleError(AutomationEngineService.name, 'createSchedule', null)));
    }

    deleteSchedule(id: string, namespace: string = PROCESSES_NAMESPACE): Observable<{ status: number }> {
        return this.delete('/schedules/', id, namespace, 'deleteSchedule');
    }

    /** Like deleteDeploymentIfExists, for a schedule. */
    deleteScheduleIfExists(id: string, quiet = false, namespace: string = PROCESSES_NAMESPACE): Observable<{ status: number }> {
        return this.deleteIfExists('/schedules/', id, quiet, namespace, 'deleteScheduleIfExists');
    }

    private delete(path: string, id: string, namespace: string, method: string): Observable<{ status: number }> {
        return this.http
            .delete(this.namespaceUrl(namespace) + path + encodeURIComponent(id), { observe: 'response', responseType: 'text' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(AutomationEngineService.name, method, { status: 500 })),
            );
    }

    private deleteIfExists(path: string, id: string, quiet: boolean, namespace: string, method: string): Observable<{ status: number }> {
        return this.http
            .delete(this.namespaceUrl(namespace) + path + encodeURIComponent(id), { observe: 'response', responseType: 'text' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError((error: HttpErrorResponse) => {
                    const handlers = this.errorHandlerService;
                    if (error?.status === 404) {
                        return handlers.handleErrorQuietly(AutomationEngineService.name, method + ': already gone', { status: 404 })(error);
                    }
                    // bound, because the handlers use the service's own members
                    const handle = quiet ? handlers.handleErrorQuietly.bind(handlers) : handlers.handleError.bind(handlers);
                    return handle(AutomationEngineService.name, method, { status: error?.status >= 400 ? error.status : 500 })(error);
                }),
            );
    }

    listDeployments(options: EngineDeploymentListOptions, namespace: string = PROCESSES_NAMESPACE): Observable<EnginePage<EngineDeployment>> {
        return this.http.get<EnginePage<EngineDeployment>>(this.namespaceUrl(namespace) + '/deployments', { params: listParams(options) });
    }

    getDeployment(id: string, namespace: string = PROCESSES_NAMESPACE): Observable<EngineDeployment> {
        return this.http.get<EngineDeployment>(this.namespaceUrl(namespace) + '/deployments/' + encodeURIComponent(id));
    }

    listInstances(options: EngineInstanceListOptions, namespace: string = PROCESSES_NAMESPACE): Observable<EnginePage<EngineInstance>> {
        return this.http.get<EnginePage<EngineInstance>>(this.namespaceUrl(namespace) + '/instances', { params: listParams(options) });
    }

    /** a gateway with the desired and applied state of its deployments and instances */
    getNetwork(id: string): Observable<EngineNetwork> {
        return this.http.get<EngineNetwork>(environment.automationEngineUrl + '/networks/' + encodeURIComponent(id));
    }

    /**
     * Starts a maintenance procedure of a smart service instance. All variables are strings.
     * Errors are not caught: the caller shows them, a 403 in particular has to reach the user.
     */
    startMaintenanceProcedure(
        instanceId: string,
        procedure: string,
        variables: Record<string, string>,
        namespace: string = SMART_SERVICES_NAMESPACE,
    ): Observable<{ status: number }> {
        const url = this.namespaceUrl(namespace) + '/instances/' + encodeURIComponent(instanceId) +
            '/maintenance-procedures/' + encodeURIComponent(procedure) + '/start';
        return this.http
            .post(url, { variables }, { observe: 'response', responseType: 'text' })
            .pipe(map((resp) => ({ status: resp.status })));
    }

    /**
     * Lists the modules of an instance, optionally by module type and by one deployment key.
     * Errors are not caught: the caller shows them, a 403 in particular has to reach the user.
     */
    listModules(
        query: { instanceId: string; moduleType?: string; key?: string },
        namespace: string = SMART_SERVICES_NAMESPACE,
    ): Observable<AutomationEngineModuleList> {
        let params = new HttpParams().set('instance_id', query.instanceId);
        if (query.moduleType) {
            params = params.set('module_type', query.moduleType);
        }
        if (query.key) {
            params = params.set('key', query.key);
        }
        return this.http.get<AutomationEngineModuleList>(this.namespaceUrl(namespace) + '/modules', { params });
    }

    /** Removes one module and its deployment. Errors are not caught, see listModules. */
    deleteModule(moduleId: string, namespace: string = SMART_SERVICES_NAMESPACE): Observable<{ status: number }> {
        return this.http
            .delete(this.namespaceUrl(namespace) + '/modules/' + encodeURIComponent(moduleId), { observe: 'response', responseType: 'text' })
            .pipe(map((resp) => ({ status: resp.status })));
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

/** query of a list call; empty values and lists are left out, lists are sent comma separated */
function listParams(options: EngineDeploymentListOptions | EngineInstanceListOptions): HttpParams {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
            return;
        }
        params = params.set(key, Array.isArray(value) ? value.join(',') : value);
    });
    return params;
}
