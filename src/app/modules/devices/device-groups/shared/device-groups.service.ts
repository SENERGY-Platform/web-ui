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
import {HttpClient, HttpParams} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {DeviceGroupHelperResultModel, DeviceGroupModel} from './device-groups.model';
import {DeviceTypeFunctionModel} from '../../../metadata/device-types-overview/shared/device-type.model';
import {DeviceInstancesBaseModel} from '../../device-instances/shared/device-instances.model';
import {DeviceClassesPermSearchModel} from '../../../metadata/device-classes/shared/device-classes-perm-search.model';
import {AspectsPermSearchModel} from '../../../metadata/aspects/shared/aspects-perm-search.model';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class DeviceGroupsService {
    authorizations: PermissionTestResponse;
    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.deviceManagerUrl);
    }

    getDeviceGroupsWithoutGenerated(
        query: string,
        limit: number,
        offset: number,
        feature: string,
        order: string,
    ): Observable<DeviceGroupModel[]> {
        return this.http
            .post<DeviceGroupModel[]>(environment.permissionSearchUrl + '/v3/query/device-groups', { // TODO
                resource: 'device-groups',
                find: {
                    search: query,
                    limit,
                    offset,
                    rights: 'r',
                    sort_by: feature,
                    sort_desc: order === 'desc',
                    filter: {
                        not: {
                            condition: {
                                feature: 'features.attribute_list',
                                operation: '==',
                                value: 'platform/generated=true'
                            }
                        }
                    }
                },
            })
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getDeviceGroupsWithoutGenerated()', [])),
            );
    }

    getDeviceGroups(
        query: string,
        limit: number,
        offset: number,
        feature: string,
        order: string,
    ): Observable<DeviceGroupModel[]> {
        const params = [
            'limit=' + limit,
            'offset=' + offset,
            'rights=r',
            'sort=' + feature + '.' + order,
            'search=' + encodeURIComponent(query),
        ].join('&');

        return this.http.get<DeviceGroupModel[]>(environment.permissionSearchUrl + '/v3/resources/device-groups?' + params).pipe( // TODO
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getDeviceGroups(search)', [])),
        );
    }

    getDeviceGroup(id: string, filterGenericDuplicateCriteria = false): Observable<DeviceGroupModel | null> {
        return this.http.get<DeviceGroupModel>(environment.deviceRepoUrl + '/device-groups/' + id + '?filter_generic_duplicate_criteria=' + filterGenericDuplicateCriteria
        ).pipe(
            map((resp) => {
                if (resp && !resp.device_ids) {
                    resp.device_ids = [];
                }
                if (resp && !resp.criteria) {
                    resp.criteria = [];
                }
                return resp;
            }),
            catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getDeviceGroup(id)', null)),
        );
    }

    createDeviceGroup(deviceGroup: DeviceGroupModel): Observable<DeviceGroupModel | null> {
        return this.http
            .post<DeviceGroupModel>(environment.deviceManagerUrl + '/device-groups', deviceGroup)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'createDeviceGroup', null)));
    }

    updateDeviceGroup(deviceGroup: DeviceGroupModel): Observable<DeviceGroupModel | null> {
        return this.http
            .put<DeviceGroupModel>(environment.deviceManagerUrl + '/device-groups/' + encodeURIComponent(deviceGroup.id), deviceGroup)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'updateDeviceGroup', null)));
    }

    deleteDeviceGroup(id: string): Observable<boolean> {
        return this.http
            .delete<boolean>(environment.deviceManagerUrl + '/device-groups/' + encodeURIComponent(id))
            .pipe(catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'deleteDeviceGroup', false)));
    }

    getBaseDevicesByIds(ids: string[]): Observable<DeviceInstancesBaseModel[]> {
        return this.http
            .post<DeviceInstancesBaseModel[]>(environment.permissionSearchUrl + '/v3/query/devices', { // TODO
                resource: 'devices',
                list_ids: {
                    ids,
                    limit: ids.length,
                    offset: 0,
                    rights: 'rx',
                    sort_by: 'name',
                    sort_desc: false,
                },
            })
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getDeviceListByIds(ids)', [])),
            );
    }

    getDeviceGroupListByIds(ids: string[]): Observable<DeviceGroupModel[]> {
        return this.http
            .post<DeviceGroupModel[]>(environment.permissionSearchUrl + '/v3/query/device-groups', { // TODO
                resource: 'device-groups',
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
                catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getDeviceGroupListByIds(ids)', [])),
            );
    }

    getFunctionListByIds(ids: string[]): Observable<DeviceTypeFunctionModel[]> {
        return this.http
            .post<DeviceTypeFunctionModel[]>(environment.permissionSearchUrl + '/v3/query/functions', { // TODO
                resource: 'functions',
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
                catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getFunctionListByIds(ids)', [])),
            );
    }

    getAspectListByIds(ids: string[]): Observable<AspectsPermSearchModel[]> {
        return this.http
            .post<AspectsPermSearchModel[]>(environment.permissionSearchUrl + '/v3/query/aspects', { // TODO
                resource: 'aspects',
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
                catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getAspectListByIds(ids)', [])),
            );
    }

    getDeviceClassListByIds(ids: string[]): Observable<DeviceClassesPermSearchModel[]> {
        return this.http
            .post<DeviceClassesPermSearchModel[]>(environment.permissionSearchUrl + '/v3/query/device-classes', { // TODO
                resource: 'device-classes',
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
                catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getDeviceClassListByIds(ids)', [])),
            );
    }

    useDeviceSelectionDeviceGroupHelper(
        currentDeviceIds: string[],
        search: string,
        limit: number,
        offset: number,
        filterMaintainUsability: boolean,
    ): Observable<DeviceGroupHelperResultModel | null> {
        const params = ['limit=' + limit, 'offset=' + offset, 'search=' + encodeURIComponent(search)];
        if (filterMaintainUsability) {
            params.push('maintains_group_usability=true');
        }
        const paramsStr = params.join('&');
        return this.http
            .post<DeviceGroupHelperResultModel>(environment.deviceSelectionUrl + '/device-group-helper?' + paramsStr, currentDeviceIds)
            .pipe(
                map((resp) => resp || null),
                catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'useDeviceSelectionDeviceGroupHelper()', null)),
            );
    }

    getTotalCountOfDeviceGroups(searchText: string): Observable<any> {
        const options = searchText ?
            { params: new HttpParams().set('search', searchText) } : {};

        return this.http
            .get(environment.permissionSearchUrl + '/v3/total/device-groups', options) // TODO
            .pipe(
                catchError(
                    this.errorHandlerService.handleError(
                        DeviceGroupsService.name,
                        'getTotalCountOfDeviceGroups',
                    ),
                ),
            );
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
