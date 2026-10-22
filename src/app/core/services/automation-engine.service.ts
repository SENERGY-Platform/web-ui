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
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';
import { EngineDeployment, EngineDeploymentInput, EngineSchedule, EngineScheduleInput } from '../model/automation-engine.model';

/** the namespace of process deployments; smart services live in 'smart-services' */
export const PROCESSES_NAMESPACE = 'processes';

/**
 * Calls of the automation-engine API under /namespaces/{ns}/... . Errors are reported through the
 * ErrorHandlerService and answered with null or a status, as in the other services of this app.
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

    private namespaceUrl(namespace: string): string {
        return environment.automationEngineUrl + '/namespaces/' + encodeURIComponent(namespace);
    }
}
