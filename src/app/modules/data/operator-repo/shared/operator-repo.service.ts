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

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/internal/operators';
import {OperatorModel} from './operator.model';
import {Observable} from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class OperatorRepoService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    getOperators(search: string, limit: number, offset: number, feature: string, order: string): Observable<{operators: OperatorModel[]}> {
        return this.http.get<{operators: OperatorModel[]}>
        (environment.operatorRepoUrl + '/operator?limit=' + limit + '&offset=' + offset + '&sort=' + feature +
            ':' + order + (search ? ('&search=' + search) : '')).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(OperatorRepoService.name, 'getOperators: Error', {operators: []}))
        );

    }

    getOperator(id: string): Observable<OperatorModel | null> {
        return this.http.get<OperatorModel>
        (environment.operatorRepoUrl + '/operator/' + id).pipe(
            map(resp => resp),
            catchError(this.errorHandlerService.handleError(OperatorRepoService.name, 'getOperator: Error', null))
        );

    }

    saveOperator(operator: OperatorModel): Observable<{}> {
        if (operator._id === undefined) {
            return this.http.put<{}>(environment.operatorRepoUrl + '/operator/', operator).pipe(
                catchError(this.errorHandlerService.handleError(OperatorRepoService.name, 'putOperator: Error', {}))
            );
        } else {
            const id  = operator._id;
            delete operator._id;
            return this.http.post<{}>(environment.operatorRepoUrl + '/operator/' + id + '/', operator).pipe(
                catchError(this.errorHandlerService.handleError(OperatorRepoService.name, 'postOperator: Error', {}))
            );
        }
    }

    deleteOeprator (operator: OperatorModel): Observable<{}>{
        return this.http.delete(environment.operatorRepoUrl + '/operator/' + operator._id + '/').pipe(
            catchError(this.errorHandlerService.handleError(OperatorRepoService.name, 'deleteOperator: Error', {}))
        );
    }
}
