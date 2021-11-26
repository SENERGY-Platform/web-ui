/*
 * Copyright 2021 InfAI (CC SES)
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
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/internal/operators';
import { forkJoin, Observable, of } from 'rxjs';
import {
    DeviceTypeAspectModel,
    DeviceTypeBaseModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeDeviceClassModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel,
    DeviceTypeProtocolModel,
    DeviceTypeServiceModel,
} from './device-type.model';
import { DeviceTypePermSearchModel } from './device-type-perm-search.model';
import { BpmnSkeletonModel } from './device-type-selection.model';
import { MatDialog } from '@angular/material/dialog';
import { flatMap } from 'rxjs/operators';
import { flatten } from '@angular/compiler';

@Injectable({
    providedIn: 'root',
})
export class DeviceTypeService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private dialog: MatDialog) {}

    getDeviceType(id: string): Observable<DeviceTypeModel | null> {
        return this.http
            .get<DeviceTypeModel>(environment.deviceManagerUrl + '/device-types/' + encodeURIComponent(id))
            .pipe(catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceType: error', null)));
    }

    getDeviceTypeListByIds(ids: string[]): Observable<DeviceTypeBaseModel[]> {
        return this.http
            .post<DeviceTypeBaseModel[]>(environment.permissionSearchUrl + '/v3/query', {
                resource: 'device-types',
                list_ids: {
                    ids,
                    limit: ids.length,
                    offset: 0,
                    rights: 'r',
                    sort_by: 'name',
                    sort_desc: false,
                },
            })
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypeListByIds(ids)', [])),
            );
    }

    getDeviceService(id: string): Observable<DeviceTypeServiceModel | null> {
        return this.http.get<DeviceTypeServiceModel>(environment.deviceRepoUrl + '/services/' + id).pipe(
            map((resp) => resp),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceService', null)),
        );
    }

    getDeviceTypeFiltered(filter: { function_id: string; device_class_id: string; aspect_id: string }[]): Observable<DeviceTypeModel[]> {
        return this.http
            .get<DeviceTypeModel[]>(environment.semanticRepoUrl + '/device-types?filter=' + JSON.stringify(filter))
            .pipe(catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceType: error', null)))
            .pipe(map((res) => res || []));
    }

    /**
     * Joins filters with an OR condition and returns an array with unique device types
     */
    getDeviceTypeFilteredOr(filters: { function_id: string; device_class_id: string; aspect_id: string }[]): Observable<DeviceTypeModel[]> {
        const deviceTypesObservables = filters.map((f) => this.getDeviceTypeFiltered([f]));
        return forkJoin(deviceTypesObservables).pipe(
            flatMap((deviceTypes) => {
                let flatDeviceTypes = flatten(deviceTypes);
                flatDeviceTypes = [...new Map(flatDeviceTypes.map((x) => [x.id, x])).values()];
                return of(flatDeviceTypes);
            }),
        );
    }

    getDeviceTypes(
        searchText: string,
        limit: number,
        offset: number,
        sortBy: string,
        sortDirection: string,
    ): Observable<DeviceTypePermSearchModel[]> {
        if (sortDirection === '' || sortDirection === null || sortDirection === undefined) {
            sortDirection = 'asc';
        }
        if (sortBy === '' || sortBy === null || sortBy === undefined) {
            sortBy = 'name';
        }
        const params = ['limit=' + limit, 'offset=' + offset, 'rights=r', 'sort=' + sortBy + '.' + sortDirection];
        if (searchText) {
            params.push('search=' + encodeURIComponent(searchText));
        }

        return this.http
            .get<DeviceTypePermSearchModel[]>(environment.permissionSearchUrl + '/v3/resources/device-types?' + params.join('&'))
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypes(search)', [])),
            );
    }

    getDeviceTypeSkeleton(typeId: string, serviceId: string): Observable<BpmnSkeletonModel | null> {
        return this.http
            .get<BpmnSkeletonModel>(
                environment.iotRepoUrl + '/devicetype/skeleton/' + encodeURIComponent(typeId) + '/' + encodeURIComponent(serviceId),
            )
            .pipe(catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceTypeSkeleton: error', null)));
    }

    getDeviceClassesControllingFunctions(deviceClassId: string): Observable<DeviceTypeFunctionModel[]> {
        return this.http
            .get<DeviceTypeFunctionModel[]>(environment.semanticRepoUrl + '/device-classes/' + deviceClassId + '/controlling-functions')
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceClassesControllingFunctions', [])),
            );
    }

    getDeviceClasses(): Observable<DeviceTypeDeviceClassModel[]> {
        return this.http.get<DeviceTypeDeviceClassModel[]>(environment.semanticRepoUrl + '/device-classes').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceClasses', [])),
        );
    }

    getDeviceClassesWithControllingFunction(): Observable<DeviceTypeDeviceClassModel[]> {
        return this.http
            .get<DeviceTypeDeviceClassModel[]>(environment.semanticRepoUrl + '/device-classes?function=controlling-function')
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceClassesWithControllingFunction', [])),
            );
    }

    createDeviceType(deviceType: DeviceTypeModel): Observable<DeviceTypeModel | null> {
        return this.http
            .post<DeviceTypeModel>(environment.deviceManagerUrl + '/device-types', deviceType)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'createDeviceType', null)));
    }

    updateDeviceType(deviceType: DeviceTypeModel): Observable<DeviceTypeModel | null> {
        return this.http
            .put<DeviceTypeModel>(environment.deviceManagerUrl + '/device-types/' + encodeURIComponent(deviceType.id), deviceType)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'updateDeviceType', null)));
    }

    deleteDeviceType(id: string): Observable<boolean> {
        return this.http
            .delete<boolean>(environment.deviceManagerUrl + '/device-types/' + id)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'deleteDeviceType', false)));
    }

    getProtocols(limit: number, offset: number, sort: string, order: string): Observable<DeviceTypeProtocolModel[]> {
        return this.http
            .get<DeviceTypeProtocolModel[]>(
                environment.deviceRepoUrl + '/protocols?limit=' + limit + '&offset=' + offset + '&sort=' + sort + '.' + order,
            )
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getProtocols', [])),
            );
    }

    getControllingFunctions(): Observable<DeviceTypeFunctionModel[]> {
        return this.http.get<DeviceTypeFunctionModel[]>(environment.semanticRepoUrl + '/controlling-functions').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getControllingFunctions', [])),
        );
    }

    getMeasuringFunctions(): Observable<DeviceTypeFunctionModel[]> {
        return this.http.get<DeviceTypeFunctionModel[]>(environment.semanticRepoUrl + '/measuring-functions').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getMeasuringFunctions', [])),
        );
    }

    getAspects(): Observable<DeviceTypeAspectModel[]> {
        return this.http.get<DeviceTypeAspectModel[]>(environment.semanticRepoUrl + '/aspects').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getAspects', [])),
        );
    }

    getAspectsWithMeasuringFunction(): Observable<DeviceTypeAspectModel[]> {
        return this.http.get<DeviceTypeAspectModel[]>(environment.semanticRepoUrl + '/aspects?function=measuring-function').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getAspectsWithMeasuringFunction', [])),
        );
    }

    getAspectsMeasuringFunctions(aspectId: string): Observable<DeviceTypeFunctionModel[]> {
        return this.http.get<DeviceTypeFunctionModel[]>(environment.semanticRepoUrl + '/aspects/' + aspectId + '/measuring-functions').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getAspectsMeasuringFunctions', [])),
        );
    }

    getAspectsMeasuringFunctionsWithImports(aspectId: string): Observable<DeviceTypeFunctionModel[]> {
        return this.http.get<DeviceTypeFunctionModel[]>(environment.apiAggregatorUrl + '/aspects/' + aspectId + '/measuring-functions').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getAspectsMeasuringFunctionsWithImports', [])),
        );
    }

    getLeafCharacteristics(): Observable<DeviceTypeCharacteristicsModel[]> {
        return this.http.get<DeviceTypeCharacteristicsModel[]>(environment.semanticRepoUrl + '/characteristics?leafsOnly=true').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getLeafCharacteristics', [])),
        );
    }
}
