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
import { HttpClient, HttpResponseBase } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { catchError, map, mergeMap, retryWhen } from 'rxjs/operators';
import { Observable, timer } from 'rxjs';
import {ProcessPermModel} from './process.model';
import { DesignerProcessModel } from '../../designer/shared/designer.model';
import { ProcessRepoConditionsModel } from './process-repo-conditions.model';
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

    list(kind: string, right: string) {
        return this.http.get<any[]>(environment.permissionSearchUrl + '/v3/resources/' + kind + '?limit=9999&rights=' + right).pipe( //TODO
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'list', [])),
        );
    }

    getProcessModels(
        query: string,
        limit: number,
        offset: number,
        feature: string,
        order: string,
        conditions: ProcessRepoConditionsModel | null,
    ): Observable<ProcessPermModel[]> {
        return this.http
            .post<ProcessPermModel[]>(environment.permissionSearchUrl + '/v3/query/processmodel', { //TODO
                resource: 'processmodel',
                find: {
                    search: query,
                    limit,
                    offset,
                    rights: 'r',
                    sort_by: feature,
                    sort_desc: order !== 'asc',
                    filter: conditions,
                },
            })
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getProcessModels(search)', [])),
            );
    }

    getProcessModel(id: string): Observable<DesignerProcessModel | null> {
        return this.http
            .get<DesignerProcessModel>(environment.processRepoUrl + '/' + id)
            .pipe(catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getProcessModel()', null)));
    }

    checkForCopiedProcess(id: string, maxRetries: number, intervalInMs: number): Observable<boolean> {
        return this.checkForProcessModelWithRetries(id, true, maxRetries, intervalInMs);
    }

    checkForDeletedProcess(id: string, maxRetries: number, intervalInMs: number): Observable<boolean> {
        return this.checkForProcessModelWithRetries(id, false, maxRetries, intervalInMs);
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

    private checkForProcessModelWithRetries(
        id: string,
        shouldIdExists: boolean,
        maxRetries: number,
        intervalInMs: number,
    ): Observable<boolean> {
        return this.http.get<boolean>(environment.permissionSearchUrl + '/v3/resources/processmodel/' + id + '/access?rights=r').pipe( //TODO
            map((data) => {
                if (data === !shouldIdExists) {
                    throw Error('');
                }
                return data;
            }),
            retryWhen(
                mergeMap((error, i) => {
                    const retryAttempt = i + 1;
                    if (retryAttempt > maxRetries) {
                        throw error;
                    }
                    return timer(retryAttempt * intervalInMs);
                }),
            ),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'checkForProcessModelWithRetries', !shouldIdExists)),
        );
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
