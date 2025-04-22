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
import { HttpClient, HttpParams } from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {DeviceGroupCriteriaModel, DeviceGroupHelperResultModel, DeviceGroupModel} from './device-groups.model';
import {DeviceTypeAspectNodeModel, DeviceTypeDeviceClassModel, DeviceTypeFunctionModel} from '../../../metadata/device-types-overview/shared/device-type.model';
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
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.deviceRepoUrl + '/device-groups');
    }

    getDeviceGroupsWithoutGenerated(
        query: string,
        limit: number,
        offset: number,
        feature: string,
        order: string,
    ): Observable<{result: DeviceGroupModel[]; total: number}> {
        return this._getDeviceGroups({ignoreGenerated: true, limit, search: query, offset, sort: feature + '.' + order});
    }

    getDeviceGroups(
        query: string,
        limit: number,
        offset: number,
        feature: string,
        order: string,
        filterGenericDuplicateCriteria = false,
    ): Observable<{result: DeviceGroupModel[]; total: number}> {
        return this._getDeviceGroups({limit, search: query, offset, sort: feature + '.' + order, filterGenericDuplicateCriteria});
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

    getGeneratedDeviceGroupOfDevice(deviceId: string): Observable<DeviceGroupModel | null> {
        const deviceIdSplit = deviceId.split(':');
        return this._getDeviceGroups({
            ids: ['urn:infai:ses:device-group:' + deviceIdSplit[deviceIdSplit.length - 1]],
        }).pipe(map(dg => (dg && dg.result.length === 1)? dg.result[0] : null));
    }

    private _getDeviceGroups(options: {
        limit?: number;
        offset?: number;
        search?: string;
        sort?: string;
        ids?: string[];
        ignoreGenerated?: boolean;
        attrKeys?: string[];
        attrValues?: string[];
        criertia?: DeviceGroupCriteriaModel[];
        p?: string;
        filterGenericDuplicateCriteria?: boolean;
    }): Observable<{result: DeviceGroupModel[]; total: number}> {
        let params = new HttpParams();
        if (options.limit !== undefined) {
            params = params.set('limit', options.limit);
        }
        if (options.offset !== undefined) {
            params = params.set('offset', options.offset);
        }
        if (options.search !== undefined) {
            params = params.set('search', options.search);
        }
        if (options.sort !== undefined) {
            params = params.set('sort', options.sort);
        }
        if (options.ids !== undefined) {
            params = params.set('ids', options.ids.join(','));
        }
        if (options.ignoreGenerated !== undefined) {
            params = params.set('ignore-generated', options.ignoreGenerated);
        }
        if (options.attrKeys !== undefined) {
            params = params.set('attr-keys', options.attrKeys.join(','));
        }
        if (options.attrValues !== undefined) {
            params = params.set('attr-values', options.attrValues.join(','));
        }
        if (options.criertia !== undefined) {
            params = params.set('criteria', JSON.stringify(options.criertia));
        }
        if (options.p !== undefined) {
            params = params.set('p', options.p);
        }
        if (options.filterGenericDuplicateCriteria !== undefined) {
            params = params.set('filter_generic_duplicate_criteria', options.filterGenericDuplicateCriteria);
        }

        return this.http.get<DeviceGroupModel[] | null>(environment.deviceRepoUrl + '/device-groups', { observe: 'response', params }).pipe(
            map(resp => {
                const totalStr = resp.headers.get('X-Total-Count') || '0';
                return {
                    result: resp.body || [],
                    total: parseInt(totalStr, 10)
                };
            }),
            catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, '_getDeviceGroups()', {
                result: [],
                total: 0,
            })),
        );
    }

    createDeviceGroup(deviceGroup: DeviceGroupModel): Observable<DeviceGroupModel | null> {
        return this.http
            .post<DeviceGroupModel>(environment.deviceRepoUrl + '/device-groups', deviceGroup)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'createDeviceGroup', null)));
    }

    updateDeviceGroup(deviceGroup: DeviceGroupModel): Observable<DeviceGroupModel | null> {
        return this.http
            .put<DeviceGroupModel>(environment.deviceRepoUrl + '/device-groups/' + encodeURIComponent(deviceGroup.id), deviceGroup)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'updateDeviceGroup', null)));
    }

    deleteDeviceGroup(id: string): Observable<boolean> {
        return this.http
            .delete<boolean>(environment.deviceRepoUrl + '/device-groups/' + encodeURIComponent(id))
            .pipe(catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'deleteDeviceGroup', false)));
    }

    getDeviceGroupListByIds(ids: string[]): Observable<DeviceGroupModel[]> {
        return this._getDeviceGroups({ids}).pipe(map(x => x.result));
    }

    getFunctionListByIds(ids: string[]): Observable<DeviceTypeFunctionModel[]> {
        return this.http
            .post<DeviceTypeFunctionModel[]>(environment.deviceRepoUrl + '/query/functions', {ids})
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getFunctionListByIds(ids)', [])),
            );
    }

    getAspectListByIds(ids?: string[]): Observable<DeviceTypeAspectNodeModel[]> {
        let params = new HttpParams();
        if (ids !== undefined) {
            params = params.set('ids', ids.join(','));
        }
        return this.http
            .get<DeviceTypeAspectNodeModel[]>( environment.deviceRepoUrl + '/v2/aspect-nodes', {params})
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getAspectListByIds(ids)', [])),
            );
    }

    getDeviceClassListByIds(ids: string[]): Observable<DeviceTypeDeviceClassModel[]> {
        return this.http
            .get<DeviceTypeDeviceClassModel[]>(environment.deviceRepoUrl + '/v2/device-classes?ids='+ids.join(','))
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
