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
import {DeviceTypeDeviceClassModel} from '../../device-types-overview/shared/device-type.model';
import {DeviceClassesPermSearchModel} from './device-classes-perm-search.model';

@Injectable({
    providedIn: 'root'
})
export class DeviceClassesService {

    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService) {
    }

    getDeviceClasses(query: string, limit: number, offset: number, feature: string, order: string): Observable<DeviceClassesPermSearchModel[]> {
        if (query) {
            return this.http.get<DeviceClassesPermSearchModel[]>(environment.permissionSearchUrl + '/jwt/search/device-classes/' +
                encodeURIComponent(query) + '/r/' + limit + '/' + offset + '/' + feature + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceClassesService.name, 'getDeviceClasses(search)', []))
            );
        } else {
            return this.http.get<DeviceClassesPermSearchModel[]>(environment.permissionSearchUrl + '/jwt/list/device-classes/r/' +
                limit + '/' + offset + '/' + feature + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceClassesService.name, 'getDeviceClasses(list)', []))
            );
        }
    }

    updateDeviceClasses(deviceClass: DeviceTypeDeviceClassModel): Observable<DeviceTypeDeviceClassModel | null> {
        return this.http.put<DeviceTypeDeviceClassModel>(environment.deviceManagerUrl + '/device-classes/' + deviceClass.id, deviceClass).pipe(
            catchError(this.errorHandlerService.handleError(DeviceClassesService.name, 'updateDeviceClasses', null))
        );
    }

    deleteDeviceClasses(deviceClassId: string): Observable<boolean> {
        return this.http.delete<boolean>(environment.deviceManagerUrl + '/device-classes/' + deviceClassId).pipe(
            catchError(this.errorHandlerService.handleError(DeviceClassesService.name, 'deleteDeviceClasses', false))
        );
    }

}
