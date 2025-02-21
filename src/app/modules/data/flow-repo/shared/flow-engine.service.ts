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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { PipelineRequestModel } from '../deploy-flow/shared/pipeline-request.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { AllowedMethods, PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { PipelineStatus } from '../../pipeline-registry/shared/pipeline.model';

@Injectable({
    providedIn: 'root',
})
export class FlowEngineService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.flowEngineUrl);
    }

    startPipeline(data: PipelineRequestModel): Observable<unknown> {
        return this.http.post<unknown>(environment.flowEngineUrl + '/pipeline', data).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(FlowEngineService.name, 'startPipeline: Error', [])),
        );
    }

    getPipelineStatus(pipelineId: string): Observable<PipelineStatus> {
        return this.http.get<PipelineStatus>(environment.flowEngineUrl + '/pipeline/' + pipelineId).pipe(
            map((resp) => resp || []),
            catchError((err) => {
                this.errorHandlerService.handleError(FlowEngineService.name, 'getPipelineStatus: Error', undefined);
                return throwError(() => err);
            }),
        );
    }

    getPipelinesStatus(ids: string[] = []): Observable<PipelineStatus[]> {
        return this.http.post<PipelineStatus[]>(environment.flowEngineUrl + '/pipelines', ids).pipe(
            map((resp) => resp || []),
            catchError((err) => {
                this.errorHandlerService.handleError(FlowEngineService.name, 'getPipelinesStatus: Error', undefined);
                return throwError(() => err);
            }),
        );
    }

    deletePipeline(id: string): Observable<unknown> {
        return this.http
            .delete(environment.flowEngineUrl + '/pipeline/' + id)
            .pipe(catchError(this.errorHandlerService.handleError(FlowEngineService.name, 'deletePipeline: Error', {})));
    }

    updatePipeline(data: PipelineRequestModel): Observable<void> {
        return this.http
            .put<void>(environment.flowEngineUrl + '/pipeline', data)
            .pipe(catchError(this.errorHandlerService.handleError(FlowEngineService.name, 'updatePipeline: Error', undefined)));
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
