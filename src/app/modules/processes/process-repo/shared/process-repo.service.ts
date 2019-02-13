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
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/internal/operators';
import {Observable} from 'rxjs';
import {ProcessModel} from './process.model';
import {DesignerProcessModel} from '../../designer/shared/designer.model';


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

    getProcessModels(query: string, limit: number, offset: number, feature: string, order: string): Observable<ProcessModel[]> {
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

    getProcessModel(id: string): Observable<DesignerProcessModel[] | null> {
        return this.http.get<DesignerProcessModel[]>(environment.processRepoUrl + '/' + id).pipe(
            map(resp => resp),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getProcessModel()', []))
        );
    }

    deleteProcess(id: string): Observable<{status: string}> {
        return this.http.delete<{status: string}>(environment.processRepoUrl + '/' + id).pipe(
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'deleteProcess', {status: 'error'}))
        );
    }

    saveProcess(id: string, process: any, svg: any): Observable<DesignerProcessModel | null> {
        const processModel: DesignerProcessModel = {owner: '', _id: '', svg: svg, process: process, date: Date.now()};
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

    /* getProcesses(): Observable<{flows: FlowModel[]}> {
        return this.http.get<{flows: FlowModel[]}>
        (environment.flowRepoUrl + '/flow').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(FlowRepoService.name, 'getFlows: Error', {flows: []}))
        );

    }

    getProcess(id: string): Observable<FlowModel | null> {
        return this.http.get<FlowModel>
        (environment.flowRepoUrl + '/flow/' + id).pipe(
            map(resp => resp),
            catchError(this.errorHandlerService.handleError(FlowRepoService.name, 'getFlow: Error', null))
        );

    }

    saveProcess(flow: FlowModel): Observable<{}> {
        if (flow._id === undefined) {
            return this.http.put<{}>(environment.flowRepoUrl + '/flow/', flow).pipe(
                catchError(this.errorHandlerService.handleError(FlowRepoService.name, 'putFlow: Error', {}))
            );
        } else {
            const id  = flow._id;
            delete flow._id;
            return this.http.post<{}>(environment.flowRepoUrl + '/flow/' + id + '/', flow).pipe(
                catchError(this.errorHandlerService.handleError(FlowRepoService.name, 'postFlow: Error', {}))
            );
        }
    }

    deleteProcess (flow: FlowModel): Observable<{}> {
        return this.http.delete(environment.flowRepoUrl + '/flow/' + flow._id + '/').pipe(
            catchError(this.errorHandlerService.handleError(FlowRepoService.name, 'deleteFlow: Error', {}))
        );
    } */
}
