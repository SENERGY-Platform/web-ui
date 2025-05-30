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
import { DeviceTypeDeviceClassModel } from '../../device-types-overview/shared/device-type.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

@Injectable({
    providedIn: 'root',
})
export class DeviceClassesService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        const uri = environment.deviceRepoUrl + '/v2/device-classes';
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(uri);
    }

    getDeviceClasses(
        query: string,
        limit: number,
        offset: number,
        sortBy: string,
        sortDirection: string,
    ): Observable<{ result: DeviceTypeDeviceClassModel[]; total: number; }> {
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
            .get<DeviceTypeDeviceClassModel[]>(environment.deviceRepoUrl + '/v2/device-classes?' + params.join('&'), { observe: 'response' })
            .pipe(
                map(resp => {
                    const totalStr = resp.headers.get('X-Total-Count') || '0';
                    return {
                        result: resp.body || [],
                        total: parseInt(totalStr, 10)
                    };
                }),
                catchError(this.errorHandlerService.handleError(DeviceClassesService.name, 'getAspects(search)', { result: [], total: 0 })),
            );
    }

    updateDeviceClasses(deviceClass: DeviceTypeDeviceClassModel): Observable<DeviceTypeDeviceClassModel | null> {
        return this.http
            .put<DeviceTypeDeviceClassModel>(environment.deviceRepoUrl + '/device-classes/' + deviceClass.id, deviceClass)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceClassesService.name, 'updateDeviceClasses', null)));
    }

    deleteDeviceClasses(deviceClassId: string): Observable<boolean> {
        return this.http
            .delete<boolean>(environment.deviceRepoUrl + '/device-classes/' + deviceClassId)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceClassesService.name, 'deleteDeviceClasses', false)));
    }

    createDeviceClass(deviceClass: DeviceTypeDeviceClassModel): Observable<DeviceTypeDeviceClassModel | null> {
        return this.http
            .post<DeviceTypeDeviceClassModel>(environment.deviceRepoUrl + '/device-classes', deviceClass)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceClassesService.name, 'createDeviceClass', null)));
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
