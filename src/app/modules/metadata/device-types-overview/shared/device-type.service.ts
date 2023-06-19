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
import { catchError, map } from 'rxjs/operators';
import { forkJoin, Observable, of } from 'rxjs';
import {
    DeviceTypeAspectModel, DeviceTypeAspectNodeModel,
    DeviceTypeBaseModel,
    DeviceTypeCharacteristicsModel, DeviceTypeContentVariableModel,
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
import {flatten} from 'lodash';
import { AllowedMethods, PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class DeviceTypeService { 
    authorizationObs: Observable<PermissionTestResponse> = new Observable()

    constructor(
        private http: HttpClient, 
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        var permSearchURL = environment.permissionSearchUrl + '/v3/resources/device-types'
        this.authorizationObs = this.ladonService.getUserAuthorizationsForURI(permSearchURL, ["GET", "DELETE", "POST", "PUT"])
    
    }

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

    getDeviceTypeFiltered(filter: { function_id: string; device_class_id?: string; aspect_id?: string }[]): Observable<DeviceTypeModel[]> {
        return this.http
            .get<DeviceTypeModel[]>(environment.deviceRepoUrl + '/device-types?filter=' + JSON.stringify(filter))
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
            .get<DeviceTypeFunctionModel[]>(environment.deviceRepoUrl + '/device-classes/' + deviceClassId + '/controlling-functions')
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceClassesControllingFunctions', [])),
            );
    }

    getDeviceClasses(): Observable<DeviceTypeDeviceClassModel[]> {
        return this.http.get<DeviceTypeDeviceClassModel[]>(environment.deviceRepoUrl + '/device-classes').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getDeviceClasses', [])),
        );
    }

    getDeviceClassesWithControllingFunction(): Observable<DeviceTypeDeviceClassModel[]> {
        return this.http
            .get<DeviceTypeDeviceClassModel[]>(environment.deviceRepoUrl + '/device-classes?function=controlling-function')
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
        return this.http.get<DeviceTypeFunctionModel[]>(environment.deviceRepoUrl + '/controlling-functions').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getControllingFunctions', [])),
        );
    }

    getMeasuringFunctions(): Observable<DeviceTypeFunctionModel[]> {
        return this.http.get<DeviceTypeFunctionModel[]>(environment.deviceRepoUrl + '/measuring-functions').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getMeasuringFunctions', [])),
        );
    }

    getAspects(): Observable<DeviceTypeAspectModel[]> {
        return this.http.get<DeviceTypeAspectModel[]>(environment.deviceRepoUrl + '/aspects').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getAspects', [])),
        );
    }

    getAspectNodesWithMeasuringFunction(): Observable<DeviceTypeAspectNodeModel[]> {
        return this.http.get<DeviceTypeAspectNodeModel[] | null>(environment.apiAggregatorUrl + '/aspect-nodes?function=measuring-function').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getAspectNodesWithMeasuringFunction', [])),
        );
    }

    getAspectNodesWithMeasuringFunctionOfDevicesOnly(): Observable<DeviceTypeAspectNodeModel[]> {
        return this.http.get<DeviceTypeAspectNodeModel[] | null>(environment.deviceRepoUrl + '/aspect-nodes?function=measuring-function').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getAspectNodesWithMeasuringFunctionOfDevicesOnly', [])),
        );
    }

    getAspectsMeasuringFunctions(aspectId: string): Observable<DeviceTypeFunctionModel[]> {
        return this.http.get<DeviceTypeFunctionModel[]>(environment.deviceRepoUrl + '/aspects/' + aspectId + '/measuring-functions').pipe(
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
        return this.http.get<DeviceTypeCharacteristicsModel[]>(environment.deviceRepoUrl + '/characteristics?leafsOnly=true').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceTypeService.name, 'getLeafCharacteristics', [])),
        );
    }

    getValuePaths(field: DeviceTypeContentVariableModel): string[] {
        const paths: { path: string; type: string }[] = [];
        this.traverseDataStructure('', field, paths);
        return paths.map(x => x.path);
    }

    getValuePathsAndTypes(field: DeviceTypeContentVariableModel): { path: string; type: string }[] {
        const paths: { path: string; type: string }[] = [];
        this.traverseDataStructure('', field, paths);
        return paths;
    }

    private traverseDataStructure(pathString: string, field: DeviceTypeContentVariableModel, paths: { path: string; type: string }[]) {
        if (field.type === 'https://schema.org/StructuredValue' && field.type !== undefined && field.type !== null) {
            if (pathString !== '') {
                pathString += '.' + field.name;
            } else {
                if (field.name !== undefined) {
                    pathString = field.name;
                }
            }
            if (field.sub_content_variables !== undefined) {
                field.sub_content_variables.forEach((innerField: DeviceTypeContentVariableModel) => {
                    this.traverseDataStructure(pathString, innerField, paths);
                });
            }
        } else {
            let name = field.name || '';
            if (pathString.length > 0) {
                name = pathString + '.' + name;
            }
            paths.push({path: name, type: field.type || ''});
        }
    }

    getTotalCountOfDevicesTypes(): Observable<any> {
        return this.http
        .get(environment.permissionSearchUrl + '/v3/total/device-types')
        .pipe(
            catchError(
                this.errorHandlerService.handleError(
                    DeviceTypeService.name,
                    'getTotalCountOfDevicesTypes',
                ),
            ),
        );
    }

    userHasDeleteAuthorization(): Observable<boolean> {
        return this.userHasAuthorization("DELETE")      
    }

    userHasUpdateAuthorization(): Observable<boolean> {
        return this.userHasAuthorization("PUT")      
    }

    userHasCreateAuthorization(): Observable<boolean> {
        return this.userHasAuthorization("POST")   
    }

    userHasReadAuthorization(): Observable<boolean> {
        return this.userHasAuthorization("GET")  
    }

    userHasAuthorization(method: AllowedMethods): Observable<boolean> {
        return new Observable(obs => {
            this.authorizationObs.subscribe(result => {
                obs.next(result[method])
                obs.complete()
            })
        })    
    }
}
