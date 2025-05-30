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
import {HttpClient, HttpResponse} from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { FlowModel } from './flow.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

@Injectable({
    providedIn: 'root',
})
export class FlowRepoService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.flowRepoUrl);
    }

    getFlows(search: string, limit: number, offset: number, feature: string, order: string, shared?: boolean): Observable<{ flows: FlowModel[] }> {
        return this.http
            .get<{ flows: FlowModel[] }>(
                environment.flowRepoUrl +
                    '/flow?limit=' +
                    limit +
                    '&offset=' +
                    offset +
                    '&sort=' +
                    feature +
                    ':' +
                    order +
                    (search ? '&search=' + search : '')+
                    (shared !== undefined ? '&shared=' + shared?.valueOf() : ''),
            )
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(FlowRepoService.name, 'getFlows: Error', { flows: [] })),
            );
    }

    getFlow(id: string): Observable<FlowModel | null> {
        return this.http.get<FlowModel>(environment.flowRepoUrl + '/flow/' + id).pipe(
            map((resp) => resp),
            catchError(this.errorHandlerService.handleError(FlowRepoService.name, 'getFlow: Error', null)),
        );
    }

    saveFlow(flow: FlowModel): Observable<HttpResponse<FlowModel> | null> {
        if (flow._id === undefined) {
            return this.http
                .put<FlowModel>(environment.flowRepoUrl + '/flow/', flow, {observe: 'response'})
                .pipe(catchError(this.errorHandlerService.handleError(FlowRepoService.name, 'putFlow: Error', null)));
        } else {
            const id = flow._id;
            delete flow._id;
            return this.http
                .post<FlowModel>(environment.flowRepoUrl + '/flow/' + id + '/', flow, {observe: 'response'})
                .pipe(catchError(this.errorHandlerService.handleError(FlowRepoService.name, 'postFlow: Error', null)));
        }
    }

    deleteFlow(flow: FlowModel): Observable<unknown> {
        return this.http
            .delete(environment.flowRepoUrl + '/flow/' + flow._id + '/')
            .pipe(catchError(this.errorHandlerService.handleError(FlowRepoService.name, 'deleteFlow: Error', {})));
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

    userHasReadAuthorization(): boolean {
        return this.authorizations['GET'];
    }
}
