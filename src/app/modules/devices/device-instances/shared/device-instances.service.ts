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
import { environment } from '../../../../../environments/environment';
import {catchError, map, reduce, share} from 'rxjs/internal/operators';
import {
    DeviceFilterCriteriaModel,
    DeviceInstancesBaseModel,
    DeviceInstancesModel,
    DeviceInstancesPermSearchModel,
    DeviceSelectablesFullModel,
    DeviceSelectablesModel,
} from './device-instances.model';
import { Observable } from 'rxjs';
import {DeviceInstancesHistoryModel, DeviceInstancesHistoryModelWithId} from './device-instances-history.model';
import { MatDialog } from '@angular/material/dialog';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceInstancesUpdateModel } from './device-instances-update.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UtilService } from '../../../../core/services/util.service';

@Injectable({
    providedIn: 'root',
})
export class DeviceInstancesService {
    private getDeviceHistoryObservable7d: Observable<DeviceInstancesHistoryModel[]> | null = null;
    private getDeviceHistoryObservable1h: Observable<DeviceInstancesHistoryModel[]> | null = null;

    constructor(
        private dialog: MatDialog,
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private deviceTypeService: DeviceTypeService,
        private snackBar: MatSnackBar,
        private utilService: UtilService,
    ) {}

    listUsedDeviceTypeIds(): Observable<string[]> {
        return this.http
            .post<{ term: string }[]>(environment.permissionSearchUrl + '/v3/query', {
                resource: 'devices',
                term_aggregate: 'features.device_type_id',
            })
            .pipe(
                map((resp) => resp || []),
                map((list) => list.map((value) => value.term)),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'listUsedDeviceTypeIds()', [])),
            );
    }

    getDeviceListByIds(ids: string[]): Observable<DeviceInstancesBaseModel[]> {
        return this.http
            .post<DeviceInstancesBaseModel[]>(environment.permissionSearchUrl + '/v3/query', {
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
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceListByIds(ids)', [])),
            );
    }

    getDeviceInstances(
        searchText: string,
        limit: number,
        offset: number,
        sortBy: string,
        sortOrder: string,
    ): Observable<DeviceInstancesModel[]> {
        return this.http
            .get<DeviceInstancesModel[]>(
                environment.apiAggregatorUrl +
                    '/devices?limit=' +
                    limit +
                    '&offset=' +
                    offset +
                    '&sort=' +
                    sortBy +
                    '.' +
                    sortOrder +
                    (searchText === '' ? '' : '&search=' + encodeURIComponent(searchText)),
            )
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstances', [])),
            );
    }

    getDeviceInstance(id: string): Observable<DeviceInstancesBaseModel | null> {
        return this.http.get<DeviceInstancesBaseModel>(environment.deviceManagerUrl + '/devices/' + id).pipe(
            map((resp) => resp),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstance', null)),
        );
    }

    getDeviceInstancesByState(
        searchText: string,
        state: string,
        limit: number,
        offset: number,
        value: string,
        order: string,
    ): Observable<DeviceInstancesModel[]> {
        return this.http
            .get<DeviceInstancesModel[]>(
                environment.apiAggregatorUrl +
                    '/devices?state=' +
                    state +
                    '&sort=' +
                    value +
                    '.' +
                    order +
                    '&limit=' +
                    limit +
                    '&offset=' +
                    offset +
                    (searchText === '' ? '' : '&search=' + encodeURIComponent(searchText)),
            )
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByState: no search', [])),
            );
    }

    updateDeviceInstance(device: DeviceInstancesUpdateModel): Observable<DeviceInstancesUpdateModel | null> {
        return this.http
            .put<DeviceInstancesUpdateModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(device.id), device)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'updateDeviceInstance', null)));
    }

    saveDeviceInstance(device: DeviceInstancesUpdateModel): Observable<DeviceInstancesUpdateModel | null> {
        return this.http
            .post<DeviceInstancesUpdateModel>(environment.deviceManagerUrl + '/devices', device)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'saveDeviceInstance', null)));
    }

    deleteDeviceInstance(id: string): Observable<DeviceInstancesUpdateModel | null> {
        return this.http
            .delete<DeviceInstancesUpdateModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(id))
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'deleteDeviceInstance', null)));
    }

    deleteDeviceInstances(ids: string[]): Observable<DeviceInstancesUpdateModel | null> {
        return this.http
            .request<DeviceInstancesUpdateModel>('DELETE', environment.deviceManagerUrl + '/devices', { body: ids })
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'deleteDeviceInstances', null)));
    }

    getDeviceInstancesByTag(
        tagType: string,
        tag: string,
        feature: string,
        order: string,
        limit: number,
        offset: number,
    ): Observable<DeviceInstancesModel[]> {
        return this.http
            .get<DeviceInstancesModel[]>(
                environment.apiAggregatorUrl +
                    '/devices?limit=' +
                    limit +
                    '&offset=' +
                    offset +
                    '&sort=' +
                    feature +
                    '.' +
                    order +
                    '&' +
                    tagType +
                    '=' +
                    tag,
            )
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByTag', [])),
            );
    }

    getDeviceInstancesByTagAndState(
        tagType: string,
        tag: string,
        limit: number,
        offset: number,
        feature: string,
        order: string,
        state: string,
    ): Observable<DeviceInstancesModel[]> {
        return this.http
            .get<DeviceInstancesModel[]>(
                environment.apiAggregatorUrl +
                    '/devices?sort=' +
                    feature +
                    '.' +
                    order +
                    '&' +
                    tagType +
                    '=' +
                    tag +
                    '&state=' +
                    state +
                    '&limit=' +
                    limit +
                    '&offset=' +
                    offset,
            )
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByTagAndState', [])),
            );
    }

    getDeviceInstancesByHubId(
        limit: number,
        offset: number,
        value: string,
        order: string,
        id: string,
        state: null | 'connected' | 'disconnected' | 'unknown',
    ): Observable<DeviceInstancesModel[]> {
        let url =
            environment.apiAggregatorUrl +
            '/hubs/' +
            encodeURIComponent(id) +
            '/devices?limit=' +
            limit +
            '&offset=' +
            offset +
            '&sort=' +
            value +
            '.' +
            order;
        if (state != null) {
            url += '&state=' + state;
        }
        return this.http.get<DeviceInstancesModel[]>(url).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByHubId', [])),
        );
    }

    getDeviceInstancesByDeviceType(
        id: string,
        limit: number,
        offset: number,
        orderfeature: string,
        direction: 'asc' | 'desc',
        state: null | 'connected' | 'disconnected' | 'unknown',
    ): Observable<DeviceInstancesModel[]> {
        let url =
            environment.apiAggregatorUrl +
            '/device-types/' +
            id +
            '/devices?sort=' +
            orderfeature +
            '.' +
            direction +
            '&limit=' +
            limit +
            '&offset=' +
            offset;
        if (state != null) {
            url += '&state=' + state;
        }
        return this.http.get<DeviceInstancesModel[]>(url).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByDeviceType', [])),
        );
    }

    getDeviceInstancesByDeviceTypes(
        ids: string[],
        state: null | 'connected' | 'disconnected' | 'unknown',
    ): Observable<DeviceInstancesModel[]> {
        let url = environment.apiAggregatorUrl + '/device-types-devices';
        if (state != null) {
            url += '?state=' + state;
        }
        return this.http.post<DeviceInstancesModel[]>(url, { ids }).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByDeviceType', [])),
        );
    }

    getDeviceSelections(
        criteria: DeviceFilterCriteriaModel[],
        completeServices: boolean,
        protocolBlocklist?: string[] | null | undefined,
        interactionFilter?: string | null | undefined,
    ): Observable<DeviceSelectablesModel[]> {
        return this.getDeviceSelectionsInternal(criteria, completeServices, protocolBlocklist, interactionFilter, false) as Observable<
            DeviceSelectablesModel[]
        >;
    }

    getDeviceSelectionsFull(
        criteria: DeviceFilterCriteriaModel[],
        completeServices: boolean,
        protocolBlocklist?: string[] | null | undefined,
        interactionFilter?: string | null | undefined,
    ): Observable<DeviceSelectablesFullModel[]> {
        return this.getDeviceSelectionsInternal(criteria, completeServices, protocolBlocklist, interactionFilter, true, true).pipe(
            map((selectables) => {
                selectables = selectables as DeviceSelectablesFullModel[];
                selectables.forEach((s: any) => {
                    if (s.servicePathOptions === undefined) {
                        return;
                    }
                    const m = new Map<string, { path: string; characteristicId: string }[]>();
                    for (const key of Object.keys(s.servicePathOptions)) {
                        m.set(key, s.servicePathOptions[key]);
                    }
                    s.servicePathOptions = m;
                });
                return selectables;
            }),
        );
    }

    private getDeviceSelectionsInternal(
        criteria: DeviceFilterCriteriaModel[],
        completeServices: boolean,
        protocolBlocklist?: string[] | null | undefined,
        interactionFilter?: string | null | undefined,
        includeGroups?: boolean,
        includeImports?: boolean,
    ): Observable<DeviceSelectablesFullModel[] | DeviceSelectablesModel[]> {
        let path = '/selectables';
        if (completeServices) {
            path += '?complete_services=true&';
        } else {
            path += '?';
        }
        path += 'json=' + encodeURIComponent(JSON.stringify(criteria));
        if (protocolBlocklist) {
            path = path + '&filter_protocols=' + encodeURIComponent(protocolBlocklist.join(','));
        }
        if (interactionFilter) {
            path = path + '&filter_interaction=' + encodeURIComponent(interactionFilter);
        }
        if (includeGroups === true) {
            path += '&include_groups=true';
        }
        if (includeImports === true) {
            path += '&include_imports=true';
        }
        return this.http.get<DeviceSelectablesModel[]>(environment.deviceSelectionUrl + path).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceSelections', [])),
        );
    }

    getDeviceHistory(limit: number, offset: number, logDuration: string): Observable<DeviceInstancesHistoryModelWithId[]> {
        return this.http
            .get<DeviceInstancesHistoryModelWithId[]>(environment.apiAggregatorUrl + '/devices?offset='+offset+'&limit='+limit+'&log='+logDuration)
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceHistory', [])),
                share(),
            );
    }

    getDeviceHistoryAfter(limit: number, afterId: string, afterName: string, logDuration: string): Observable<DeviceInstancesHistoryModelWithId[]> {
        return this.http
            .get<DeviceInstancesHistoryModelWithId[]>(environment.apiAggregatorUrl + '/devices?after.id='+afterId+'&after.sort_field_value='+ encodeURIComponent(JSON.stringify(afterName)) +'&limit='+limit+'&log='+logDuration)
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceHistory', [])),
                share(),
            );
    }

    getDeviceHistoryAll(batchsize: number, logDuration: string): Observable<DeviceInstancesHistoryModelWithId[]> {
        return new Observable<DeviceInstancesHistoryModelWithId[]>(subscriber => {
            var limit = batchsize;
            var last: DeviceInstancesHistoryModelWithId | null = null;
            var offset = 0;
            var getDeviceHistoryBatch: ()=>void;
            var next = (value: DeviceInstancesHistoryModelWithId[])=> {
                if (value && value.length) {
                    last = value[value.length - 1];
                    offset = offset + limit;
                    subscriber.next(value);
                }
                if(!value || !value.length || value.length < limit) {
                    subscriber.complete()
                }else{
                    getDeviceHistoryBatch()
                }
            }
            getDeviceHistoryBatch = ()=>{
                //use this if clause if you want to switch later to search with after parameter
                //if (last && offset+limit > 10000) {
                if (last) {
                    this.getDeviceHistoryAfter(limit, last.id, last.name, logDuration).subscribe(next);
                } else {
                    this.getDeviceHistory(limit, offset, logDuration).subscribe(next);
                }
            }
            getDeviceHistoryBatch();
        });
    }

    getDeviceHistory7d(): Observable<DeviceInstancesHistoryModel[] | null> {
        if (this.getDeviceHistoryObservable7d === null) {
            this.getDeviceHistoryObservable7d = this.getDeviceHistoryAll(1000, '7d').
            pipe(reduce((acc, value) => acc.concat(value)));
        }
        return this.getDeviceHistoryObservable7d;
    }

    getDeviceHistory1h(): Observable<DeviceInstancesHistoryModel[] | null> {
        if (this.getDeviceHistoryObservable1h === null) {
            this.getDeviceHistoryObservable1h = this.getDeviceHistoryAll(1000, '1h').
            pipe(reduce((acc, value) => acc.concat(value)));
        }
        return this.getDeviceHistoryObservable1h;
    }

    convertToShortId(id: string | undefined): string {
        if (id === undefined || id === '') {
            return '';
        }
        if (id.startsWith('urn:infai:ses:device:')) {
            const parts = id.split(':');
            const uuidStr = parts[parts.length - 1];
            const uuidHexStr = uuidStr.replace(new RegExp('-', 'g'), '');
            const byteArray = this.utilService.stringToByteArray(uuidHexStr);
            return this.utilService.convertByteArrayToBase64(byteArray);
        } else {
            throw new Error('expected urn:infai:ses:device as prefix');
        }
    }

    getDeviceInstancesByIds(ids: string[]): Observable<DeviceInstancesPermSearchModel[]> {
        return this.http
            .post<DeviceInstancesPermSearchModel[] | null>(environment.permissionSearchUrl + '/v3/query', {
                resource: 'devices',
                list_ids: { ids },
            })
            .pipe(map((res) => res || []));
    }
}
