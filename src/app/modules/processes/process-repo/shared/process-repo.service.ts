/*
 * Copyright 2019 InfAI (CC SES)
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

import {Injectable} from '@angular/core';
import {HttpClient, HttpResponse, HttpResponseBase} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {environment} from '../../../../../environments/environment';
import {catchError, map, mergeMap, retryWhen} from 'rxjs/internal/operators';
import {Observable, timer} from 'rxjs';
import {ProcessModel} from './process.model';
import {DesignerProcessModel} from '../../designer/shared/designer.model';
import {ProcessRepoConditionsModel} from './process-repo-conditions.model';


@Injectable({
    providedIn: 'root'
})
export class ProcessRepoService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    list(kind: string, right: string) {
        return this.http.get<object[]>(environment.permissionSearchUrl + '/jwt/list/' + kind + '/' + right).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'list', []))
        );
    }

    getProcessModels(query: string, limit: number, offset: number, feature: string, order: string, conditions: ProcessRepoConditionsModel | null): Observable<ProcessModel[]> {
        if (conditions) {
            if (query) {
                return this.http.post<ProcessModel[]>(environment.permissionSearchUrl + '/jwt/search/processmodel/' +
                    encodeURIComponent(query) + '/r/' + limit + '/' + offset + '/' + feature + '/' + order, conditions).pipe(
                    map(resp => resp || []),
                    catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getProcessModels(search)', []))
                );
            } else {
                return this.http.post<ProcessModel[]>(environment.permissionSearchUrl + '/jwt/list/processmodel/r/' +
                    limit + '/' + offset + '/' + feature + '/' + order, conditions).pipe(
                    map(resp => resp || []),
                    catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getProcessModels(list)', []))
                );
            }
        } else {
            if (query) {
                return this.http.get<ProcessModel[]>(environment.permissionSearchUrl + '/jwt/search/processmodel/' +
                    encodeURIComponent(query) + '/r/' + limit + '/' + offset + '/' + feature + '/' + order).pipe(
                    map(resp => resp || []),
                    catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getProcessModels(search)', []))
                );
            } else {
                return this.http.get<ProcessModel[]>(environment.permissionSearchUrl + '/jwt/list/processmodel/r/' +
                    limit + '/' + offset + '/' + feature + '/' + order).pipe(
                    map(resp => resp || []),
                    catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getProcessModels(list)', []))
                );
            }
        }
    }

    getProcessModel(id: string): Observable<DesignerProcessModel | null> {
        return this.http.get<DesignerProcessModel>(environment.processRepoUrl + '/' + id).pipe(
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getProcessModel()', null))
        );
    }

    checkForProcessModelWithRetries(id: string, maxRetries: number, intervalInMs: number): Observable<boolean> {
        return this.http.get<boolean>(environment.permissionSearchUrl + '/jwt/check/processmodel/' + id + '/r/bool').pipe(
            map(data => {
                if (data === false) {
                    throw Error('');
                }
                return data;
            }),
            retryWhen(mergeMap((error, i) => {
                const retryAttempt = i + 1;
                if (retryAttempt > maxRetries) {
                    throw(error);
                }
                return timer(retryAttempt * intervalInMs);
            })),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'checkForProcessModelWithRetries', false))
        );
    }

    deleteProcess(id: string): Observable<{status: number}> {
        return this.http.delete<HttpResponseBase>(environment.processRepoUrl + '/' + id, {observe: 'response'}).pipe(
            map(resp => {
                return {status: resp.status};
            }),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'deleteProcess', {status: 500}))
        );
    }

    saveProcess(id: string, bpmnXml: string, svgXML: string): Observable<DesignerProcessModel | null> {
        const processModel: DesignerProcessModel = {owner: '', _id: id, svgXML: svgXML, bpmn_xml: bpmnXml, date: Date.now()};
        if (id === '') {
            return this.http.post<DesignerProcessModel>(environment.processRepoUrl, processModel).pipe(
                catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'saveProcess', null))
            );
        } else {
            return this.http.put<DesignerProcessModel>(environment.processRepoUrl + '/' + id, processModel).pipe(
                catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'updateProcess', null))
            );
        }
    }

}
