/*
 * Copyright 2018 InfAI (CC SES)
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
import {
    DeviceTypeAssignmentModel,
    DeviceTypeClassModel,
    DeviceTypeModel,
    DeviceTypeProtocolModel,
    DeviceTypeVendorModel
} from './device-type.model';
import {DeviceTypePermSearchModel} from './device-type-perm-search.model';
import {BpmnSkeletonModel} from './device-type-selection.model';
import {MatDialog} from '@angular/material';
import {DeviceTypeResponseModel} from './device-type-response.model';

@Injectable({
    providedIn: 'root'
})
export class DeviceTypeService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private dialog: MatDialog) {
    }

    getDeviceType(type: string): Observable<DeviceTypeModel | null> {
        return this.http.get<DeviceTypeModel>
        (environment.iotRepoUrl + '/deviceType/' + encodeURIComponent(type)).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceType: error', null))
        );
    }

    getDeviceTypes(searchText: string, limit: number, offset: number, feature: string, order: string): Observable<DeviceTypePermSearchModel[]> {
        if (searchText === '') {
            return this.http.get<DeviceTypePermSearchModel[]>(environment.permissionSearchUrl + '/jwt/list/devicetype/r/' +
                limit + '/' + offset + '/' + feature + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypes: list', [])));
        } else {
            return this.http.get<DeviceTypePermSearchModel[]>(environment.permissionSearchUrl + '/jwt/search/devicetype/' + searchText +
                '/r/' + limit + '/' + offset + '/' + feature + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypes: search', [])));
        }
    }

    getDeviceTypeSkeleton(typeId: string, serviceId: string): Observable<BpmnSkeletonModel | null> {
        return this.http.get<BpmnSkeletonModel>
        (environment.iotRepoUrl + '/devicetype/skeleton/' + encodeURIComponent(typeId) + '/' + encodeURIComponent(serviceId)).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypeSkeleton: error', null))
        );
    }

    getDeviceTypeClasses(searchText: string, limit: number, offset: number): Observable<DeviceTypeClassModel[]> {
        return this.http.get<DeviceTypeClassModel[]>
        (environment.iotRepoUrl + '/ui/search/others/deviceClasses/' + encodeURIComponent(searchText) + '/' + limit + '/' + offset).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypeClasses', []))
        );
    }

    getDeviceTypeVendors(searchText: string, limit: number, offset: number): Observable<DeviceTypeVendorModel[]> {
        return this.http.get<DeviceTypeVendorModel[]>
        (environment.iotRepoUrl + '/ui/search/others/vendors/' + encodeURIComponent(searchText) + '/' + limit + '/' + offset).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypeVendors', []))
        );
    }

    getDeviceTypeProtocols(searchText: string, limit: number, offset: number): Observable<DeviceTypeProtocolModel[]> {
        return this.http.get<DeviceTypeProtocolModel[]>
        (environment.iotRepoUrl + '/ui/search/others/protocols/' + encodeURIComponent(searchText) + '/' + limit + '/' + offset).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypeProtocols', []))
        );
    }

    getFormatPreview(assignmentModel: DeviceTypeAssignmentModel): Observable<string> {
        return this.http.post(environment.iotRepoUrl + '/format/example', assignmentModel, {responseType: 'text'}).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypeProtocols', 'error'))
        );
    }

    createDeviceClass(name: string): Observable<DeviceTypeResponseModel | null> {
        return this.http.post<DeviceTypeResponseModel>(environment.iotRepoUrl + '/other/deviceclass', {name: name}).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'createDeviceClass', null))
        );
    }

    createVendor(name: string): Observable<DeviceTypeResponseModel | null> {
        return this.http.post<DeviceTypeResponseModel>(environment.iotRepoUrl + '/other/vendor', {name: name}).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'createVendor', null))
        );
    }

}
