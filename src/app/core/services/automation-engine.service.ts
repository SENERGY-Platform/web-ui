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
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';
import { EngineDeployment, EngineDeploymentInput, EngineSchedule, EngineScheduleInput } from '../model/automation-engine.model';

/** the namespace of process deployments; smart services live in 'smart-services' */
export const PROCESSES_NAMESPACE = 'processes';

/**
 * Calls of the automation-engine API under /namespaces/{ns}/... . Errors are logged and answered with
 * null or a status, as in the other services of this app.
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

    private namespaceUrl(namespace: string): string {
        return environment.automationEngineUrl + '/namespaces/' + encodeURIComponent(namespace);
    }
}
