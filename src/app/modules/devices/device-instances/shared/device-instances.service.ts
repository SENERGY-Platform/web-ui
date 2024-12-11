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
import {environment} from '../../../../../environments/environment';
import {catchError, map, reduce, share, concatMap} from 'rxjs/operators';
import {
    Attribute,
    DeviceFilterCriteriaModel,
    DeviceInstanceModel,
    DeviceInstancesBaseModel,
    DeviceInstancesRouterStateTabEnum,
    DeviceInstancesTotalModel,
    DeviceInstancesWithDeviceTypeTotalModel,
    DeviceSelectablesFullModel,
    DeviceSelectablesModel,
} from './device-instances.model';
import {forkJoin, Observable, of} from 'rxjs';
import {DeviceInstancesHistoryModel, DeviceInstancesHistoryModelWithId} from './device-instances-history.model';
import {UtilService} from '../../../../core/services/util.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LocationsService } from '../../locations/shared/locations.service';
import { NetworksService } from '../../networks/shared/networks.service';

@Injectable({
    providedIn: 'root',
})

export class DeviceInstancesService {
    private getDeviceHistoryObservable7d: Observable<DeviceInstancesHistoryModel[]> | null = null;
    private getDeviceHistoryObservable1h: Observable<DeviceInstancesHistoryModel[]> | null = null;
    nicknameAttributeKey = 'shared/nickname';
    authorizations: PermissionTestResponse;
    authorizationsDisplayName: PermissionTestResponse;
    authorizationsAttributes: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService,
        private utilService: UtilService,
        private locationService: LocationsService,
        private networkService: NetworksService,
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.deviceManagerUrl);
        this.authorizationsDisplayName = this.ladonService.getUserAuthorizationsForURI(environment.deviceManagerUrl + '/devices/id/display_name');
        this.authorizationsAttributes = this.ladonService.getUserAuthorizationsForURI(environment.deviceManagerUrl + '/devices/id/attributes');
    }

    listUsedDeviceTypeIds(): Observable<string[]> {
        return this.getDeviceInstances({limit: 9999, offset: 0}).pipe(map(d => d.result.map(dd => dd.device_type_id).filter((v,i,a) => a.indexOf(v) === i))); //unique
    }

    getDeviceListByIds(ids: string[]): Observable<DeviceInstanceModel[]> {
        return this.getDeviceInstances({
            limit: ids.length,
            offset: 0,
            deviceIds: ids,
        }).pipe(map(d => d.result));
    }

    getDeviceInstance(id: string): Observable<DeviceInstanceModel | null> {
        return this.http.get<DeviceInstanceModel>(environment.deviceManagerUrl + '/extended-devices/' + id).pipe(
            map((resp) => resp),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstance', null)),
        );
    }

    getDeviceInstanceBaseModel(id: string): Observable<DeviceInstancesBaseModel | null> {
        return this.http.get<DeviceInstancesBaseModel>(environment.deviceManagerUrl + '/devices/' + id).pipe(
            map((resp) => resp),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstance', null)),
        );
    }

    updateDeviceInstance(device: DeviceInstanceModel): Observable<DeviceInstanceModel | null> {
        return this.http
            .put<DeviceInstanceModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(device.id), device)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'updateDeviceInstance', null)));
    }

    updateDeviceInstanceDisplayName(deviceId: string, newDisplayName: string) {
        return this.http
            .put<DeviceInstanceModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(deviceId) + '/display_name', '"' + newDisplayName + '"')
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'updateDeviceInstanceDisplayName', null)));
    }

    updateDeviceInstanceAttributes(deviceId: string, attributes: Attribute[]) {
        return this.http
            .put<DeviceInstanceModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(deviceId) + '/attributes', attributes)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'updateDeviceInstanceDisplayName', null)));
    }

    saveDeviceInstance(device: DeviceInstanceModel): Observable<DeviceInstanceModel | null> {
        return this.http
            .post<DeviceInstanceModel>(environment.deviceManagerUrl + '/devices', device)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'saveDeviceInstance', null)));
    }

    deleteDeviceInstance(id: string): Observable<DeviceInstanceModel | null> {
        return this.http
            .delete<DeviceInstanceModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(id))
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'deleteDeviceInstance', null)));
    }

    deleteDeviceInstances(ids: string[]): Observable<DeviceInstanceModel | null> {
        return this.http
            .request<DeviceInstanceModel>('DELETE', environment.deviceManagerUrl + '/devices', {body: ids})
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'deleteDeviceInstances', null)));
    }

    getDeviceIds(hubId?: string, locationId?: string): Observable<string[]> {
        let deviceIDs: string[] = [];
        const obs = [];
        if(hubId != null) {
            obs.push(this.networkService.getExtendedHub(hubId));
        }

        if(locationId != null) {
            obs.push(this.locationService.getLocation(locationId));
        }

        if(obs.length > 0) {
            return forkJoin(obs).pipe(
                map((results) => {
                    results.forEach((result, i) => {
                        if(!!result) {
                            if(i === 0) {
                                deviceIDs = result.device_ids || [];
                            } else {
                                deviceIDs = deviceIDs.filter((deviceID) => result.device_ids?.includes(deviceID));
                            }
                        }
                    });
                    return deviceIDs;
                })
            );
        }

        return of([]);
    }

    getDeviceInstances(options: {
        limit: number;
        offset: number;
        sortBy?: string;
        sortDesc?: boolean;
        searchText?: string;
        deviceTypeIds?: string[];
        connectionState?: DeviceInstancesRouterStateTabEnum;
        deviceIds?: string[];
        hubId?: string;
        locationId?: string;
    }): Observable<DeviceInstancesTotalModel> {
        return this._getDeviceInstances(options);
    }

    getDeviceInstancesWithDeviceType(options: {
        limit: number;
        offset: number;
        sortBy?: string;
        sortDesc?: boolean;
        searchText?: string;
        deviceTypeIds?: string[];
        connectionState?: DeviceInstancesRouterStateTabEnum;
        deviceIds?: string[];
        hubId?: string;
        locationId?: string;
    }): Observable<DeviceInstancesWithDeviceTypeTotalModel> {
        const opt = options as {
            limit: number;
            offset: number;
            sortBy?: string;
            sortDesc?: boolean;
            searchText?: string;
            deviceTypeIds?: string[];
            connectionState?: DeviceInstancesRouterStateTabEnum;
            deviceIds?: string[];
            hubId?: string;
            locationId?: string;
            fulldt?: boolean;
        };
        opt.fulldt = true;
        return this._getDeviceInstances(options) as Observable<DeviceInstancesWithDeviceTypeTotalModel>;
    }

    _getDeviceInstances(options: {
        limit: number;
        offset: number;
        sortBy?: string;
        sortDesc?: boolean;
        searchText?: string;
        deviceTypeIds?: string[];
        connectionState?: DeviceInstancesRouterStateTabEnum;
        deviceIds?: string[];
        hubId?: string;
        locationId?: string;
        fulldt?: boolean;
    }): Observable<DeviceInstancesTotalModel | DeviceInstancesWithDeviceTypeTotalModel> {
        if(options.hubId || options.locationId) {
            return this.getDeviceIds(options.hubId, options.locationId).pipe(
                concatMap((deviceIds) => {
                    if(deviceIds.length === 0) {
                        return of({result: [], total: 0});
                    }
                    options.hubId = undefined;
                    options.locationId = undefined;
                    options.deviceIds = deviceIds;
                    return this.getDeviceInstances(options);
                })
            );
        }
        let params = new HttpParams();
        if(options.limit > 0) {
            params = params.set('limit', options.limit.toString());
        }
        if(options.offset > 0) {
            params = params.set('offset', options.offset.toString());
        }
        let sort = options.sortBy || 'name';
        if(sort === 'annotations.connected') {
            sort = 'connection_state';
        }
        if(options.sortDesc){
            sort = sort+'.desc';
        }
        if(sort !== '') {
            params = params.set('sort', sort);
        }
        if (options.searchText && options.searchText !== '') {
            params = params.set('search', options.searchText);
        }
        if(options.deviceTypeIds!==null && options.deviceTypeIds!==undefined && options.deviceTypeIds.join && options.deviceTypeIds.length > 0){
            params = params.set('device-type-ids', options.deviceTypeIds.join(','));
        }
        if(options.deviceIds!==null && options.deviceIds!==undefined && options.deviceIds.join){
            params = params.set('ids', options.deviceIds.join(','));
        }
        if(options.connectionState!==null && options.connectionState!==undefined) {
            switch (options.connectionState){
            case DeviceInstancesRouterStateTabEnum.ONLINE: {
                params = params.set('connection-state', 'online');
                break;
            }
            case DeviceInstancesRouterStateTabEnum.OFFLINE: {
                params = params.set('connection-state', 'offline');
                break;
            }
            case DeviceInstancesRouterStateTabEnum.UNKNOWN: {
                params = params.set('connection-state', '');
                break;
            }
            }
        }
        if (options.fulldt === true) {
            params = params.set('fulldt', 'true');
        }
        return this.http.get<DeviceInstanceModel[]>(environment.deviceRepoUrl + '/extended-devices', { observe: 'response', params }).pipe(
            map((resp) => {
                const totalStr = resp.headers.get('X-Total-Count') || '0';
                return {
                    result: resp.body,
                    total: parseInt(totalStr, 10)
                } as DeviceInstancesTotalModel;
            }),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, '_getDeviceInstances', {result: [], total: 0})),
        );
    }

    getDeviceSelections(
        criteria: DeviceFilterCriteriaModel[],
        completeServices: boolean,
        protocolBlocklist?: string[] | null | undefined,
        interactionFilter?: string | null | undefined,
    ): Observable<DeviceSelectablesModel[]> {
        return this.getDeviceSelectionsInternal(criteria, completeServices, protocolBlocklist, interactionFilter, false) as Observable<DeviceSelectablesModel[]>;
    }

    getDeviceSelectionsFull(
        criteria: DeviceFilterCriteriaModel[],
        completeServices: boolean,
        protocolBlocklist?: string[] | null | undefined,
        interactionFilter?: string | null | undefined,
        includeGroups: boolean = true,
        includeImports: boolean = true,
    ): Observable<DeviceSelectablesFullModel[]> {
        return this.getDeviceSelectionsInternal(criteria, completeServices, protocolBlocklist, interactionFilter, includeGroups, includeImports).pipe(
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
            .get<DeviceInstancesHistoryModelWithId[]>(environment.apiAggregatorUrl + '/devices?offset=' + offset + '&limit=' + limit + '&log=' + logDuration)
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceHistory', [])),
                share(),
            );
    }

    getDeviceHistoryAll(batchsize: number, logDuration: string): Observable<DeviceInstancesHistoryModelWithId[]> {
        return new Observable<DeviceInstancesHistoryModelWithId[]>(subscriber => {
            const limit = batchsize;
            let offset = 0;
            // eslint-disable-next-line prefer-const
            let getDeviceHistoryBatch: () => void;
            const next = (value: DeviceInstancesHistoryModelWithId[]) => {
                if (value && value.length) {
                    offset = offset + limit;
                    subscriber.next(value);
                }
                if (!value || !value.length || value.length < limit) {
                    subscriber.complete();
                } else {
                    getDeviceHistoryBatch();
                }
            };
            getDeviceHistoryBatch = () => {
                this.getDeviceHistory(limit, offset, logDuration).subscribe(next);
            };
            getDeviceHistoryBatch();
        });
    }

    getDeviceHistory7d(): Observable<DeviceInstancesHistoryModel[] | null> {
        if (this.getDeviceHistoryObservable7d === null) {
            this.getDeviceHistoryObservable7d = this.getDeviceHistoryAll(1000, '7d').pipe(reduce((acc, value) => acc.concat(value)));
        }
        return this.getDeviceHistoryObservable7d;
    }

    getDeviceHistory1h(): Observable<DeviceInstancesHistoryModel[] | null> {
        if (this.getDeviceHistoryObservable1h === null) {
            this.getDeviceHistoryObservable1h = this.getDeviceHistoryAll(1000, '1h').pipe(reduce((acc, value) => acc.concat(value)));
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

    shortIdToUUID(shortId: string): Observable<string> {
        return this.http.get<string>(environment.deviceManagerUrl+'/helper/id?short_id='+encodeURIComponent(shortId)+'&prefix='+encodeURIComponent('urn:infai:ses:device:')).pipe(
            map((resp) => resp || ''),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'shortIdToUUID', '')),
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

    userHasUpdateDisplayNameAuthorization() {
        return this.authorizationsDisplayName['PUT'];
    }

    userHasUpdateAttributesAuthorization() {
        return this.authorizationsAttributes['PUT'];
    }

}
