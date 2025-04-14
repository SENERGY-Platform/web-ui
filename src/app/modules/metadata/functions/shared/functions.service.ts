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
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { DeviceTypeFunctionModel } from '../../device-types-overview/shared/device-type.model';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class FunctionsService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        const url = environment.deviceRepoUrl + '/functions';
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(url);
    }

    getFunctions(
        query: string,
        limit: number,
        offset: number,
        sortBy: string,
        sortDirection: string,
    ): Observable<{result: DeviceTypeFunctionModel[]; total: number}> {
        if (sortDirection === '' || sortDirection === null || sortDirection === undefined) {
            sortDirection = 'asc';
        }
        if (sortBy === '' || sortBy === null || sortBy === undefined) {
            sortBy = 'name';
        }
        const params = ['limit=' + limit, 'offset=' + offset, 'sort=' + sortBy + '.' + sortDirection];
        if (query) {
            params.push('search=' + encodeURIComponent(query));
        }

        return this.http
            .get<DeviceTypeFunctionModel[]>(environment.deviceRepoUrl + '/functions?' + params.join('&'), { observe: 'response' }).pipe(
                map(resp => {
                    const totalStr = resp.headers.get('X-Total-Count') || '0';
                    return {
                        result: resp.body || [],
                        total: parseInt(totalStr, 10)
                    };
                }),
                catchError(this.errorHandlerService.handleError(FunctionsService.name, 'getFunctions(search)', {result: [], total: 0})),
            );
    }

    getFunction(functionId: string): Observable<DeviceTypeFunctionModel | null> {
        return this.http
            .get<DeviceTypeFunctionModel>(environment.deviceRepoUrl + '/functions/' + functionId)
            .pipe(catchError(this.errorHandlerService.handleError(FunctionsService.name, 'getFunction', null)));
    }

    updateFunction(func: DeviceTypeFunctionModel): Observable<DeviceTypeFunctionModel | null> {
        return this.http
            .put<DeviceTypeFunctionModel>(environment.deviceRepoUrl + '/functions/' + func.id , func)
            .pipe(catchError(this.errorHandlerService.handleError(FunctionsService.name, 'updateFunction', null)));
    }

    deleteFunction(functionId: string): Observable<boolean> {
        return this.http
            .delete<boolean>(environment.deviceRepoUrl + '/functions/' + functionId )
            .pipe(catchError(this.errorHandlerService.handleError(FunctionsService.name, 'deleteFunction', false)));
    }

    createFunction(func: DeviceTypeFunctionModel): Observable<DeviceTypeFunctionModel | null> {
        return this.http
            .post<DeviceTypeFunctionModel>(environment.deviceRepoUrl + '/functions', func)
            .pipe(catchError(this.errorHandlerService.handleError(FunctionsService.name, 'createFunction', null)));
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
