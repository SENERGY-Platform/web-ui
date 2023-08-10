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
import {environment} from '../../../../../environments/environment';
import {catchError, map, reduce, share, concatMap} from 'rxjs/operators';
import {
    DeviceFilterCriteriaModel,
    DeviceInstancesBaseModel,
    DeviceInstancesModel,
    DeviceInstancesPermSearchModel,
    DeviceSelectablesFullModel,
    DeviceSelectablesModel,
} from './device-instances.model';
import {Observable, of} from 'rxjs';
import {DeviceInstancesHistoryModel, DeviceInstancesHistoryModelWithId} from './device-instances-history.model';
import {DeviceInstancesUpdateModel} from './device-instances-update.model';
import {UtilService} from '../../../../core/services/util.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { AllowedMethods, PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { DeviceTypePermSearchModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type-perm-search.model';
import { PermissionQueryRequest } from 'src/app/core/model/permissions/permissions';
import { LocationsService } from '../../locations/shared/locations.service';
import { NetworksService } from '../../networks/shared/networks.service';

@Injectable({
    providedIn: 'root',
})
export class DeviceInstancesService {
    private getDeviceHistoryObservable7d: Observable<DeviceInstancesHistoryModel[]> | null = null;
    private getDeviceHistoryObservable1h: Observable<DeviceInstancesHistoryModel[]> | null = null;
    nicknameAttributeKey = 'shared/nickname';
    authorizationObs: Observable<PermissionTestResponse> = new Observable()

    constructor(
        private http: HttpClient, 
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService,
        private utilService: UtilService,
        private locationService: LocationsService,
        private networkService: NetworksService
    ) {
        this.authorizationObs = this.ladonService.getUserAuthorizationsForURI(environment.deviceManagerUrl, ["GET", "DELETE", "POST", "PUT"])
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

    getDeviceInstances(
        limit: number,
        offset: number,
        sortBy: string = "name",
        sortDesc: boolean = false,
        searchText?: string
    ): Observable<DeviceInstancesModel[]> {
        var queryRequest: PermissionQueryRequest = {
            resource: 'devices', 
            find: {
                search: searchText,
                limit,
                offset,
                sort_desc: sortDesc,
                sort_by: sortBy
            }
        }
        return this.queryPermissionSearch(queryRequest).pipe(
                map((resp) => <DeviceInstancesPermSearchModel[]>resp || []),
                concatMap(devices => this.addDeviceType(devices)),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstances', [])),
        );
    }

    getDeviceInstancesByLocation(
        locationId: string, 
        limit: number, 
        offset: number,
        sortBy: string,
        sortDesc: boolean
    ): Observable<DeviceInstancesModel[]> {
        return this.locationService.getLocation(locationId).pipe(
            map(location => location ? location.device_ids : []),
            concatMap(deviceIds => deviceIds ? this.getDeviceInstancesByIds(deviceIds, limit, offset, sortBy, sortDesc) : of([])),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByLocation', [])),
        )
    }

    getDeviceInstancesByHub(
        hubId: string, 
        limit: number, 
        offset: number, 
        sortBy: string, 
        sortDesc: boolean
    ): Observable<DeviceInstancesModel[]> {
        return this.networkService.getNetwork(hubId).pipe(
            map(networks => {
                return networks ? networks.device_ids : []
            }),
            concatMap(deviceIds => {
                return this.getDeviceInstancesByIds(deviceIds, limit, offset, sortBy, sortDesc)}
            ),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDevicesFromHub', [])),
        )
    }

    getDeviceInstancesByDeviceTypes(
        ids: string[], 
        limit: number, 
        offset: number,
        sort_by: string,
        sort_desc: boolean
    ): Observable<DeviceInstancesModel[]> {
        var queryRequest: PermissionQueryRequest = {
            resource: 'devices', find: {
                limit, 
                offset, 
                sort_by,
                sort_desc,
                filter: {
                    condition: {
                        feature: 'features.device_type_id', operation: 'any_value_in_feature', value: ids
                    }
                }
            }
        }
        return this.queryPermissionSearch(queryRequest).pipe(
            map((resp) => <DeviceInstancesPermSearchModel[]>resp || []),
            concatMap(devices => this.addDeviceType(devices)),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByDeviceType', [])),
        );
    }

    addDeviceType(devices: DeviceInstancesPermSearchModel[]): Observable<DeviceInstancesModel[]> {
        var allDeviceTypeIds = devices.map((device) => device.device_type_id)

        var queryRequest: PermissionQueryRequest = {
            resource: 'device-types', list_ids: {
                ids: allDeviceTypeIds
            }
        }

        return this.queryPermissionSearch(queryRequest).pipe(
                map((resp) => <DeviceTypePermSearchModel[]>resp || []),
                map((deviceTypes: DeviceTypePermSearchModel[]) => {
                    var devicesWithDeviceType: DeviceInstancesModel[] = []

                    var deviceTypeIdToType: Record<string, DeviceTypePermSearchModel> = {}
                    deviceTypes.forEach(deviceType => {
                        deviceTypeIdToType[deviceType.id] = deviceType
                    });

                    devices.forEach(device => {
                       var deviceWithDeviceType: DeviceInstancesModel = {
                           ...device,
                           'device_type': deviceTypeIdToType[device.device_type_id],
                           'log_state': device.annotations ? device.annotations.connected : undefined
                       } 
                       devicesWithDeviceType.push(deviceWithDeviceType)
                    });

                    return devicesWithDeviceType
                }),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'addDeviceType', [])),
            );
    }

    queryPermissionSearch(queryRequest: PermissionQueryRequest): Observable<DeviceInstancesPermSearchModel[] | DeviceTypePermSearchModel[]> {
        return this.http.post<DeviceInstancesPermSearchModel[]>(environment.permissionSearchUrl + '/v3/query', queryRequest)
    }

    getDeviceInstancesByIds(
        ids: string[], 
        limit: number, 
        offset: number,
        sortBy: string = "name",
        sortDesc: boolean = false
    ): Observable<DeviceInstancesModel[]> {
        var queryRequest: PermissionQueryRequest = {
            resource: 'devices', list_ids: {
                ids,
                limit,
                offset,
                sort_by: sortBy,
                sort_desc: sortDesc
            }
        }
        return this.queryPermissionSearch(queryRequest).pipe(
                map((resp) => <DeviceInstancesPermSearchModel[]>resp || []),
                concatMap(devices => this.addDeviceType(devices)),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByIds', [])),
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

    getTotalCountOfDevices(): Observable<any> {
        return this.http
        .get(environment.permissionSearchUrl + '/v3/total/devices')
        .pipe(
            catchError(
                this.errorHandlerService.handleError(
                    DeviceInstancesService.name,
                    'getTotalCountOfDevices',
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
