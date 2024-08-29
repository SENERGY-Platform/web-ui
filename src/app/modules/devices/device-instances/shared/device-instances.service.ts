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
    DeviceInstancesBaseModel,
    DeviceInstancesModel,
    DeviceInstancesPermSearchModel,
    DeviceInstancesPermSearchTotalModel,
    DeviceInstancesRouterStateTabEnum,
    DeviceInstancesTotalModel,
    DeviceSelectablesFullModel,
    DeviceSelectablesModel, ExtendedDeviceInstanceModel, ExtendedDeviceInstancesTotalModel,
} from './device-instances.model';
import {forkJoin, Observable, of} from 'rxjs';
import {DeviceInstancesHistoryModel, DeviceInstancesHistoryModelWithId} from './device-instances-history.model';
import {DeviceInstancesUpdateModel} from './device-instances-update.model';
import {UtilService} from '../../../../core/services/util.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import {
    DeviceTypePermSearchModel,
    PermissionsModel
} from 'src/app/modules/metadata/device-types-overview/shared/device-type-perm-search.model';
import { PermissionQueryRequest, Selection } from 'src/app/core/model/permissions/permissions';
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
        return this.http
            .post<{ term: string }[]>(environment.permissionSearchUrl + '/v3/query/devices', {
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
            .post<DeviceInstancesBaseModel[]>(environment.permissionSearchUrl + '/v3/query/devices', {
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

    getDeviceInstance(id: string): Observable<DeviceInstancesBaseModel | null> {
        return this.http.get<DeviceInstancesBaseModel>(environment.deviceManagerUrl + '/devices/' + id).pipe(
            map((resp) => resp),
            map(devices => this.addDisplayName(devices)),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstance', null)),
        );
    }

    useDisplayNameAsName(devices: DeviceInstancesBaseModel[]): DeviceInstancesBaseModel[] {
        return this.addDisplayNames(devices).map((device) => {
            device.name = device.display_name || device.name;
            return device;
        });
    }

    addDisplayNames(devices: DeviceInstancesBaseModel[]): DeviceInstancesBaseModel[] {
        return devices.map(device => this.addDisplayName(device));
    }

    addDisplayName(device: DeviceInstancesBaseModel): DeviceInstancesBaseModel {
        if (!device.display_name) {
            device.display_name = device.name;
            device.attributes?.forEach((attr) => {
                if (attr.key === this.nicknameAttributeKey) {
                    device.display_name = attr.value;
                }
            });
        }
        return device;
    }

    updateDeviceInstance(device: DeviceInstancesUpdateModel): Observable<DeviceInstancesUpdateModel | null> {
        return this.http
            .put<DeviceInstancesUpdateModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(device.id), device)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'updateDeviceInstance', null)));
    }

    updateDeviceInstanceDisplayName(deviceId: string, newDisplayName: string) {
        return this.http
            .put<DeviceInstancesUpdateModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(deviceId) + '/display_name', '"' + newDisplayName + '"')
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'updateDeviceInstanceDisplayName', null)));
    }

    updateDeviceInstanceAttributes(deviceId: string, attributes: Attribute[]) {
        return this.http
            .put<DeviceInstancesUpdateModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(deviceId) + '/attributes', attributes)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'updateDeviceInstanceDisplayName', null)));
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
            .request<DeviceInstancesUpdateModel>('DELETE', environment.deviceManagerUrl + '/devices', {body: ids})
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
                            if(i == 0) {
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

    private extendedDeviceInstancesToLegacyModel(deviceListWrapper: ExtendedDeviceInstancesTotalModel):DeviceInstancesPermSearchTotalModel {
        let result: DeviceInstancesPermSearchTotalModel = {
            total: deviceListWrapper.total,
            result: deviceListWrapper.result.map((value: ExtendedDeviceInstanceModel) => {
                let annotation = {};
                if(value.connection_state != "") {
                    annotation = {connected: value.connection_state=="online"}
                }
                return {
                    id: value.id,
                    local_id: value.local_id,
                    name: value.name,
                    attributes: value.attributes,
                    display_name: value.display_name,
                    creator: value.owner_id,
                    permissions: {
                        a: value.permissions.administrate,
                        w: value.permissions.write,
                        r: value.permissions.read,
                        x: value.permissions.execute
                    },
                    shared: value.shared,
                    device_type_id: value.device_type_id,
                    annotations: annotation,
                } as DeviceInstancesPermSearchModel
            })
        }
        return result
    }

    getExtendedDeviceInstances(options: {
        limit: number;
        offset: number;
        sortBy?: string;
        sortDesc?: boolean;
        searchText?: string;
        deviceTypeIds?: string[];
        connectionState?: DeviceInstancesRouterStateTabEnum;
        deviceIds?:string[];
        hubId?: string;
        locationId?: string;
    }): Observable<ExtendedDeviceInstancesTotalModel> {
        if(options.hubId || options.locationId) {
            return this.getDeviceIds(options.hubId, options.locationId).pipe(
                concatMap((deviceIds) => {
                    if(deviceIds.length == 0) {
                        return of({result: [], total: 0});
                    }
                    options.hubId = undefined;
                    options.locationId = undefined;
                    options.deviceIds = deviceIds;
                    return this.getExtendedDeviceInstances(options);
                })
            );
        }
        let params = new HttpParams()
        if(options.limit > 0) {
            params = params.set("limit", options.limit.toString());
        }
        if(options.offset > 0) {
            params = params.set("offset", options.offset.toString());
        }
        let sort = options.sortBy || "name";
        if(sort == "annotations.connected") {
            sort = "connection_state"
        }
        if(options.sortDesc){
            sort = sort+".desc";
        }
        if(sort != "") {
            params = params.set("sort", sort);
        }
        if (options.searchText && options.searchText != "") {
            params = params.set("search", options.searchText);
        }
        if(options.deviceTypeIds!==null && options.deviceTypeIds!==undefined && options.deviceTypeIds.join){
            params = params.set("device-type-ids", options.deviceTypeIds.join(","));
        }
        if(options.deviceIds!==null && options.deviceIds!==undefined && options.deviceIds.join){
            params = params.set("ids", options.deviceIds.join(","));
        }
        if(options.connectionState!==null && options.connectionState!==undefined) {
            switch (options.connectionState){
                case DeviceInstancesRouterStateTabEnum.ONLINE: {
                    params = params.set("connection-state", "online");
                    break
                }
                case DeviceInstancesRouterStateTabEnum.OFFLINE: {
                    params = params.set("connection-state", "offline");
                    break
                }
                case DeviceInstancesRouterStateTabEnum.UNKNOWN: {
                    params = params.set("connection-state", "");
                    break
                }
            }
        }
        return this.http.get<ExtendedDeviceInstanceModel[]>(environment.deviceRepoUrl + '/extended-devices', { observe: 'response', params: params }).pipe(
            map((resp) => {
                let totalStr = resp.headers.get("X-Total-Count") || "0";
                return {
                    result: resp.body,
                    total: parseInt(totalStr)
                } as ExtendedDeviceInstancesTotalModel
            }),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getExtendedDeviceInstances', {result: [], total: 0})),
        );
    }

    //@deprecated use getExtendedDeviceInstances
    loadDeviceInstances(
        limit: number,
        offset: number,
        sortBy: string = 'name',
        sortDesc: boolean = false,
        searchText?: string,
        locationId?: string,
        hubId?: string,
        deviceTypeIds?: string[],
        connectionState?: DeviceInstancesRouterStateTabEnum,
    ): Observable<DeviceInstancesTotalModel> {
        return this.getExtendedDeviceInstances({
            limit: limit,
            offset:offset,
            sortBy:sortBy,
            sortDesc:sortDesc,
            connectionState:connectionState,
            deviceTypeIds:deviceTypeIds,
            searchText:searchText,
            hubId:hubId,
            locationId:locationId,
        }).pipe(
            map(this.extendedDeviceInstancesToLegacyModel),
            concatMap(result => {
                return this.addDeviceType(result.result || []).pipe(
                    map((devicesWithType) => ({
                        result: devicesWithType,
                        total: result.total
                    } as DeviceInstancesTotalModel)))
            }),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstances', {result: [], total: 0})),
        );
    }

    //@deprecated use getExtendedDeviceInstances
    getDeviceInstancesWithTotal(
        limit: number,
        offset: number,
        sortBy: string = 'name',
        sortDesc: boolean = false,
        searchText?: string,
        locationId?: string,
        hubId?: string,
        deviceTypeIds?: string[],
        connectionState?: DeviceInstancesRouterStateTabEnum,
    ): Observable<DeviceInstancesTotalModel>  {
        return this.loadDeviceInstances(limit, offset, sortBy, sortDesc, searchText, locationId, hubId, deviceTypeIds, connectionState);
    }

    //@deprecated use getExtendedDeviceInstances
    getDeviceInstances(
        limit: number,
        offset: number,
        sortBy: string = 'name',
        sortDesc: boolean = false,
        searchText?: string,
        locationId?: string,
        hubId?: string,
        deviceTypeIds?: string[],
        connectionState?: DeviceInstancesRouterStateTabEnum,
    ): Observable<DeviceInstancesModel[]> {
        return this.loadDeviceInstances(limit, offset, sortBy, sortDesc, searchText, locationId, hubId, deviceTypeIds, connectionState).pipe(
            map((result) => result.result)
        );
    }

    addDeviceType(devices: DeviceInstancesPermSearchModel[]): Observable<DeviceInstancesModel[]> {
        const allDeviceTypeIds = devices.map((device) => device.device_type_id);

        const queryRequest: PermissionQueryRequest = {
            resource: 'device-types', list_ids: {
                ids: allDeviceTypeIds
            }
        };

        return this.queryPermissionSearch(queryRequest).pipe(
            map((resp) => resp as DeviceTypePermSearchModel[] || []),
            map((deviceTypes: DeviceTypePermSearchModel[]) => {
                const devicesWithDeviceType: DeviceInstancesModel[] = [];

                const deviceTypeIdToType: Record<string, DeviceTypePermSearchModel> = {};
                deviceTypes.forEach(deviceType => {
                    deviceTypeIdToType[deviceType.id] = deviceType;
                });

                devices.forEach(device => {
                    let active = true;
                    if(device.attributes) {
                        device.attributes.forEach(attribute => {
                            if(attribute.key == 'inactive' && attribute.value == 'true') {
                                active = false;
                            }
                        });
                    }

                    const deviceWithDeviceType: DeviceInstancesModel = {
                        ...device,
                        device_type: deviceTypeIdToType[device.device_type_id],
                        log_state: device.annotations ? device.annotations.connected : undefined,
                        active
                    };
                    devicesWithDeviceType.push(deviceWithDeviceType);
                });

                return devicesWithDeviceType;
            }),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'addDeviceType', [])),
        );
    }

    queryPermissionSearch(queryRequest: PermissionQueryRequest): Observable<DeviceInstancesPermSearchModel[] | DeviceTypePermSearchModel[] | DeviceInstancesPermSearchTotalModel> {
        return this.http.post<DeviceInstancesPermSearchModel[]>(environment.permissionSearchUrl + '/v3/query', queryRequest);
    }

    getDeviceInstancesByIds(
        ids: string[],
        limit: number,
        offset: number,
        sortBy: string = 'name',
        sortDesc: boolean = false,
    ): Observable<DeviceInstancesTotalModel> {
        const queryRequest: PermissionQueryRequest = {
            resource: 'devices', list_ids: {
                ids,
                limit,
                with_total: true,
                offset,
                sort_by: sortBy,
                sort_desc: sortDesc
            }
        };
        return this.queryPermissionSearch(queryRequest).pipe(
            map((resp) => resp as DeviceInstancesPermSearchTotalModel || []),
            concatMap(result => this.addDeviceType(result.result).pipe(
                map((devicesWithType) => ({
                    result: devicesWithType,
                    total: result.total
                }))
            )),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByIds', {result: [], total: 0})),
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

    getDeviceHistoryAfter(limit: number, afterId: string, afterName: string, logDuration: string): Observable<DeviceInstancesHistoryModelWithId[]> {
        return this.http
            .get<DeviceInstancesHistoryModelWithId[]>(environment.apiAggregatorUrl + '/devices?after.id=' + afterId + '&after.sort_field_value=' + encodeURIComponent(JSON.stringify(afterName)) + '&limit=' + limit + '&log=' + logDuration)
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceHistory', [])),
                share(),
            );
    }

    getDeviceHistoryAll(batchsize: number, logDuration: string): Observable<DeviceInstancesHistoryModelWithId[]> {
        return new Observable<DeviceInstancesHistoryModelWithId[]>(subscriber => {
            const limit = batchsize;
            let last: DeviceInstancesHistoryModelWithId | null = null;
            let offset = 0;
            // eslint-disable-next-line prefer-const
            let getDeviceHistoryBatch: () => void;
            const next = (value: DeviceInstancesHistoryModelWithId[]) => {
                if (value && value.length) {
                    last = value[value.length - 1];
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
                //use this if clause if you want to switch later to search with after parameter
                //if (last && offset+limit > 10000) {
                if (last) {
                    this.getDeviceHistoryAfter(limit, last.id, last.name, logDuration).subscribe(next);
                } else {
                    this.getDeviceHistory(limit, offset, logDuration).subscribe(next);
                }
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
        return this.http.get<string>(environment.deviceManagerUrl+'/helper/id?short_id='+encodeURIComponent(shortId)+'&prefix='+encodeURIComponent("urn:infai:ses:device:")).pipe(
            map((resp) => resp || ""),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'shortIdToUUID', "")),
        );
    }

    getTotalCountOfDevices(searchText: string): Observable<any> {
        const options = searchText ?
            { params: new HttpParams().set('search', searchText) } : {};

        return this.http
            .get(environment.permissionSearchUrl + '/v3/total/devices', options)
            .pipe(
                catchError(
                    this.errorHandlerService.handleError(
                        DeviceInstancesService.name,
                        'getTotalCountOfDevices',
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

    userHasUpdateDisplayNameAuthorization() {
        return this.authorizationsDisplayName['PUT'];
    }

    userHasUpdateAttributesAuthorization() {
        return this.authorizationsAttributes['PUT'];
    }

}
