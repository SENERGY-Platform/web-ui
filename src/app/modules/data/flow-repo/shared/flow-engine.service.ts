/*
 * Copyright 2020 InfAI (CC SES)
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
import { HttpClient } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { PipelineRequestModel } from '../deploy-flow/shared/pipeline-request.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { PipelineStatus } from '../../pipeline-registry/shared/pipeline.model';

@Injectable({
    providedIn: 'root',
})
export class FlowEngineService {
    private http = inject(HttpClient);
    private errorHandlerService = inject(ErrorHandlerService);
    private ladonService = inject(LadonService);

    authorizations: PermissionTestResponse;

    constructor() {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.flowEngineUrl);
    }

    /** Answers null when the request failed. */
    startPipeline(data: PipelineRequestModel): Observable<unknown | null> {
        return this.http.post<unknown>(environment.flowEngineUrl + '/pipeline', data).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(FlowEngineService.name, 'startPipeline: Error', null)),
        );
    }

    getPipelineStatus(pipelineId: string): Observable<PipelineStatus> {
        return this.http.get<PipelineStatus>(environment.flowEngineUrl + '/pipeline/' + pipelineId).pipe(
            map((resp) => resp || []),
            catchError((err) => {
                this.errorHandlerService.handleError(FlowEngineService.name, 'getPipelineStatus: Error', undefined)(err);
                return throwError(() => err);
            }),
        );
    }

    getPipelinesStatus(req: {ids: []} = {ids: []}): Observable<PipelineStatus[]> {
        return this.http.post<PipelineStatus[]>(environment.flowEngineUrl + '/pipelines', req).pipe(
            map((resp) => resp || []),
            catchError((err) => {
                this.errorHandlerService.handleError(FlowEngineService.name, 'getPipelinesStatus: Error', undefined)(err);
                return throwError(() => err);
            }),
        );
    }

    /** Answers true when deleted and null when the request failed; the success body is empty. */
    deletePipeline(id: string): Observable<true | null> {
        return this.http.delete(environment.flowEngineUrl + '/pipeline/' + id).pipe(
            map((): true => true),
            catchError(this.errorHandlerService.handleError<true | null>(FlowEngineService.name, 'deletePipeline: Error', null)),
        );
    }

    /** Answers true when updated and null when the request failed; the success body is empty. */
    updatePipeline(data: PipelineRequestModel): Observable<true | null> {
        return this.http.put<void>(environment.flowEngineUrl + '/pipeline', data).pipe(
            map((): true => true),
            catchError(this.errorHandlerService.handleError<true | null>(FlowEngineService.name, 'updatePipeline: Error', null)),
        );
    }

    userHasDeleteAuthorization(): boolean {
        return this.authorizations['DELETE'];
    }

    userHasUpdateAuthorization(): boolean {
        return this.authorizations['POST'];
    }

    userHasCreateAuthorization(): boolean {
        return this.authorizations['PUT'];
    }
}
