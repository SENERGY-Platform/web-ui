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
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {FunctionsPermSearchModel} from './functions-perm-search.model';
import {DeviceTypeFunctionModel} from '../../device-types-overview/shared/device-type.model';

@Injectable({
    providedIn: 'root'
})
export class FunctionsService {

    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService) {
    }

    getFunctions(query: string, limit: number, offset: number, sortBy: string, sortDirection: string): Observable<FunctionsPermSearchModel[]> {
        if (sortDirection === '' || sortDirection === null || sortDirection === undefined) {
            sortDirection = 'asc';
        }
        if (sortBy === '' || sortBy === null || sortBy === undefined) {
            sortBy = 'name';
        }
        const params = [
            'limit=' + limit,
            'offset=' + offset,
            'rights=r',
            'sort=' + sortBy + '.' + sortDirection,
        ];
        if (query) {
            params.push('search=' + encodeURIComponent(query));
        }

        return this.http.get<FunctionsPermSearchModel[]>(
            environment.permissionSearchUrl + '/v3/resources/functions?' + params.join('&')).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(FunctionsService.name, 'getFunctions(search)', []))
        );
    }

    getFunctionsAfter(query: string, limit: number, sortBy: string, sortDirection: string, after: FunctionsPermSearchModel): Observable<FunctionsPermSearchModel[]> {
        if (sortDirection === '' || sortDirection === null || sortDirection === undefined) {
            sortDirection = 'asc';
        }
        if (sortBy === '' || sortBy === null || sortBy === undefined) {
            sortBy = 'name';
        }

        let sortFieldValue = '';
        switch (sortBy) {
            case 'name': {
                sortFieldValue = encodeURIComponent(JSON.stringify(after.name));
            }
        }

        const params = [
            'limit=' + limit,
            'rights=r',
            'sort=' + sortBy + '.' + sortDirection,
            'after.id=' + after.id,
            'after.sort_field_value=' + sortFieldValue
        ];
        if (query) {
            params.push('search=' + encodeURIComponent(query));
        }

        return this.http.get<FunctionsPermSearchModel[]>(
            environment.permissionSearchUrl + '/v3/resources/functions?' + params.join('&')).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(FunctionsService.name, 'getFunctions(search)', []))
        );
    }

    getFunction(functionId: string): Observable<DeviceTypeFunctionModel | null> {
        return this.http.get<DeviceTypeFunctionModel>(environment.semanticRepoUrl + '/functions/' + functionId).pipe(
            catchError(this.errorHandlerService.handleError(FunctionsService.name, 'getFunction', null))
        );
    }

    updateFunction(func: DeviceTypeFunctionModel): Observable<DeviceTypeFunctionModel | null> {
        return this.http.put<DeviceTypeFunctionModel>(environment.deviceManagerUrl + '/functions/' + func.id, func).pipe(
            catchError(this.errorHandlerService.handleError(FunctionsService.name, 'updateFunction', null))
        );
    }

    deleteFunction(functionId: string): Observable<boolean> {
        return this.http.delete<boolean>(environment.deviceManagerUrl + '/functions/' + functionId).pipe(
            catchError(this.errorHandlerService.handleError(FunctionsService.name, 'deleteFunction', false))
        );
    }

    createFunction(func: DeviceTypeFunctionModel): Observable<DeviceTypeFunctionModel | null> {
        return this.http.post<DeviceTypeFunctionModel>(environment.deviceManagerUrl + '/functions', func).pipe(
            catchError(this.errorHandlerService.handleError(FunctionsService.name, 'createFunction', null))
        );
    }

}
