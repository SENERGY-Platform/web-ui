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
    DeviceTypeClassModel, DeviceTypeFeatureOfInterestModel,
    DeviceTypeModel, DeviceTypePropertiesModel,
    DeviceTypeProtocolModel, DeviceTypeSensorModel, DeviceTypeCreateSensorActuatorModel,
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

    getDeviceClasses(limit: number, offset: number): Observable<DeviceTypeClassModel[]> {
        return this.http.get<DeviceTypeClassModel[]>
        (environment.iotRepoUrl + '/deviceclasses?limit=' + limit + '&offset' + offset).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceClasses', []))
        );
    }

    getFeatureOfInterests(limit: number, offset: number): Observable<DeviceTypeFeatureOfInterestModel[]> {
        return this.http.get<DeviceTypeFeatureOfInterestModel[]>
        (environment.iotRepoUrl + '/featureofinterests?limit=' + limit + '&offset' + offset).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getFeatureOfInterests', []))
        );
    }

    getProperties(propertyType: string, limit: number, offset: number): Observable<DeviceTypeClassModel[]> {
        return this.http.get<DeviceTypePropertiesModel[]>
        (environment.iotRepoUrl + '/' + propertyType + '?limit=' + limit + '&offset' + offset).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getProperties', []))
        );
    }

    getDeviceTypeProtocols(searchText: string, limit: number, offset: number): Observable<DeviceTypeProtocolModel[]> {
        return this.http.get<DeviceTypeProtocolModel[]>
        (environment.iotRepoUrl + '/ui/search/others/protocols/' + encodeURIComponent(searchText) + '/' + limit + '/' + offset).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypeProtocols', []))
        );
    }

    getDeviceTypeSensors(limit: number, offset: number): Observable<DeviceTypeSensorModel[]> {
        return this.http.get<DeviceTypeSensorModel[]>
        (environment.iotRepoUrl + '/sensors' + '?limit=' + limit + '&offset' + offset).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypeSensors', []))
        );
    }

    getFormatPreview(assignmentModel: DeviceTypeAssignmentModel): Observable<string> {
        return this.http.post(environment.iotRepoUrl + '/format/preview', assignmentModel, {responseType: 'text'}).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypeProtocols', 'error'))
        );
    }

    createDeviceClass(label: string): Observable<DeviceTypeResponseModel | null> {
        return this.http.post<DeviceTypeResponseModel>(environment.iotRepoUrl + '/deviceclasses', {label: label}).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'createDeviceClass', null))
        );
    }

    createActuatableProperty(label: string): Observable<DeviceTypeResponseModel | null> {
        return this.http.post<DeviceTypeResponseModel>(environment.iotRepoUrl + '/actuatableproperties', {label: label}).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'createActuatableProperty', null))
        );
    }

    createObservableProperty(label: string): Observable<DeviceTypeResponseModel | null> {
        return this.http.post<DeviceTypeResponseModel>(environment.iotRepoUrl + '/observableproperties', {label: label}).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'createObservableProperty', null))
        );
    }

    createFeatureOfInterest(label: string): Observable<DeviceTypeResponseModel | null> {
        return this.http.post<DeviceTypeResponseModel>(environment.iotRepoUrl + '/featureofinterests', {label: label}).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'createFeatureOfInterest', null))
        );
    }

    createSensor(create: DeviceTypeCreateSensorActuatorModel): Observable<DeviceTypeResponseModel | null> {
        return this.http.post<DeviceTypeResponseModel>(environment.iotRepoUrl + '/sensors', create).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'createSensor', null))
        );
    }

    createActuator(create: DeviceTypeCreateSensorActuatorModel): Observable<DeviceTypeResponseModel | null> {
        return this.http.post<DeviceTypeResponseModel>(environment.iotRepoUrl + '/actuators', create).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'createActuator', null))
        );
    }


    updateDeviceType(deviceType: DeviceTypeModel): Observable<DeviceTypeModel | null> {
        return this.http.post<DeviceTypeModel>(environment.iotRepoUrl + '/deviceType/' + encodeURIComponent(deviceType.id), deviceType).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'updateDeviceType', null))
        );
    }

    createDeviceType(deviceType: DeviceTypeModel): Observable<DeviceTypeModel | null> {
        return this.http.post<DeviceTypeModel>(environment.iotRepoUrl + '/deviceType', deviceType).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'updateDeviceType', null))
        );
    }

    deleteDeviceType(id: string): Observable<string> {
        return this.http.delete(environment.iotRepoUrl + '/deviceType/' + id, {responseType: 'text'}).pipe(
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'deleteDeviceType', 'error'))
        );
    }

}
