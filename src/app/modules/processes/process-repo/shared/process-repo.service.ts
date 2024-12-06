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
import { HttpClient, HttpParams, HttpResponseBase } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ProcessModel } from './process.model';
import { DesignerProcessModel } from '../../designer/shared/designer.model';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class ProcessRepoService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.processRepoUrl);

    }

    getProcessModels(
        query: string,
        limit: number,
        offset: number,
        sortBy: string,
        order: string,
    ): Observable<{result: ProcessModel[]; total: number}> {
        let params = new HttpParams();
        params = params.set('search', query);
        params = params.set('limit', limit);
        params = params.set('offset', offset);
        params = params.set('sort', sortBy + '.' + order);

        return this.http
            .get<ProcessModel[]>(environment.processRepoUrl.slice(0, -10) + '/v2/processes', { observe: 'response', params }).pipe(
                map(resp => {
                    const totalStr = resp.headers.get('X-Total-Count') || '0';
                    return {
                        result: resp.body || [],
                        total: parseInt(totalStr, 10)
                    };
                }),
                catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getProcessModels(search)', {result: [], total: 0})),
            );
    }

    getProcessModel(id: string): Observable<DesignerProcessModel | null> {
        return this.http
            .get<DesignerProcessModel>(environment.processRepoUrl + '/' + id)
            .pipe(catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getProcessModel()', null)));
    }

    deleteProcess(id: string): Observable<{ status: number }> {
        return this.http.delete<HttpResponseBase>(environment.processRepoUrl + '/' + id, { observe: 'response' }).pipe(
            map((resp) => ({ status: resp.status })),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'deleteProcess', { status: 500 })),
        );
    }

    saveProcess(id: string, bpmnXml: string, svgXML: string): Observable<DesignerProcessModel | null> {
        const processModel: DesignerProcessModel = { owner: '', _id: id, svgXML, bpmn_xml: bpmnXml, date: Date.now() };
        if (id === '') {
            return this.http
                .post<DesignerProcessModel>(environment.processRepoUrl, processModel)
                .pipe(catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'saveProcess', null)));
        } else {
            return this.http
                .put<DesignerProcessModel>(environment.processRepoUrl + '/' + id, processModel)
                .pipe(catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'updateProcess', null)));
        }
    }

    userHasDeleteAuthorization(): boolean {
        return this.authorizations['DELETE'];
    }

    userHasUpdateAuthorization(): boolean {
        return this.authorizations['PUT'];
    }

    userHasCreateAuthorization(): boolean {
        return this.authorizations['POST'];
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations['GET'];
    }
}
