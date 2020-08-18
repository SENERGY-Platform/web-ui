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
import {catchError, map, share} from 'rxjs/internal/operators';
import {DeviceInstancesModel, DeviceFilterCriteriaModel, DeviceSelectablesModel, DeviceInstancesBaseModel} from './device-instances.model';
import {Observable} from 'rxjs';
import {DeviceInstancesHistoryModel} from './device-instances-history.model';
import {MatDialog} from '@angular/material/dialog';
import {DeviceTypeService} from '../../device-types-overview/shared/device-type.service';
import {DeviceInstancesUpdateModel} from './device-instances-update.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {UtilService} from '../../../../core/services/util.service';


@Injectable({
    providedIn: 'root'
})
export class DeviceInstancesService {

    private getDeviceHistoryObservable7d: Observable<DeviceInstancesHistoryModel[]> | null = null;
    private getDeviceHistoryObservable1h: Observable<DeviceInstancesHistoryModel[]> | null = null;


    constructor(private dialog: MatDialog,
                private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private deviceTypeService: DeviceTypeService,
                private snackBar: MatSnackBar,
                private utilService: UtilService) {
    }

    getDeviceInstances(searchText: string, limit: number, offset: number, value: string, order: string): Observable<DeviceInstancesModel[]> {
        return this.http.get<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/devices?limit=' + limit + '&offset=' + offset + '&sort=' + value + '.' + order +
            (searchText === '' ? '' : '&search=' + encodeURIComponent(searchText))).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstances', []))
        );
    }

    getDeviceInstance(id: string): Observable< DeviceInstancesBaseModel| null> {
        return this.http.get<DeviceInstancesBaseModel>
        (environment.deviceManagerUrl + '/devices/' + id).pipe(
            map(resp => resp),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstance', null))
        );

    }

    getDeviceInstancesByState(searchText: string, state: string, value: string, order: string): Observable<DeviceInstancesModel[]> {
        return this.http.get<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/devices?state=' + state + '&sort=' + value + '.' + order +
            (searchText === '' ? '' : '&search=' + encodeURIComponent(searchText))).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByState: no search', []))
        );
    }

    updateDeviceInstance(device: DeviceInstancesUpdateModel): Observable<DeviceInstancesUpdateModel | null> {
        return this.http.put<DeviceInstancesUpdateModel>
        (environment.deviceManagerUrl + '/devices/' + encodeURIComponent(device.id), device).pipe(
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'updateDeviceInstance', null))
        );
    }

    saveDeviceInstance(device: DeviceInstancesUpdateModel): Observable<DeviceInstancesUpdateModel | null> {
        return this.http.post<DeviceInstancesUpdateModel>
        (environment.deviceManagerUrl + '/devices', device).pipe(
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'saveDeviceInstance', null))
        );
    }

    deleteDeviceInstance(id: string): Observable<DeviceInstancesUpdateModel | null> {
        return this.http.delete<DeviceInstancesUpdateModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(id)).pipe(
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'deleteDeviceInstance', null))
        );
    }

    getDeviceInstancesByTag(tagType: string, tag: string, feature: string, order: string, limit: number, offset: number): Observable<DeviceInstancesModel[]> {
        return this.http.get<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/devices?limit=' + limit + '&offset=' + offset + '&sort=' + feature + '.' + order + '&' + tagType + '=' + tag).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByTag', []))
        );
    }

    getDeviceInstancesByTagAndState(tagType: string, tag: string, feature: string, order: string, state: string): Observable<DeviceInstancesModel[]> {
        return this.http.get<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/devices?sort=' + feature + '.' + order + '&' + tagType + '=' + tag + '&state=' + state).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByTagAndState', []))
        );
    }

    getDeviceInstancesByHubId(limit: number, offset: number, value: string, order: string, id: string,
                              state: null | 'connected' | 'disconnected' | 'unknown'): Observable<DeviceInstancesModel[]> {
        let url = environment.apiAggregatorUrl + '/hubs/' + encodeURIComponent(id) + '/devices?limit=' + limit + '&offset=' + offset + '&sort=' + value + '.' + order;
        if (state != null) {
            url += '&state=' + state;
        }
        return this.http.get<DeviceInstancesModel[]>(url).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByHubId', []))
        );
    }

    getDeviceInstancesByDeviceType(id: string, limit: number, offset: number, orderfeature: string, direction: 'asc' | 'desc',
                                   state: null | 'connected' | 'disconnected' | 'unknown'): Observable<DeviceInstancesModel[]> {
        let url = environment.apiAggregatorUrl + '/device-types/' + id + '/devices?sort=' + orderfeature + '.' + direction
            + '&limit=' + limit + '&offset=' + offset;
        if (state != null) {
            url += '&state=' + state;
        }
        return this.http.get<DeviceInstancesModel[]>(url).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByDeviceType', []))
        );
    }

    getDeviceInstancesByDeviceTypes(ids: string[], state: null | 'connected' | 'disconnected' | 'unknown')
        : Observable<DeviceInstancesModel[]> {
        let url = environment.apiAggregatorUrl + '/device-types-devices';
        if (state != null) {
            url += '?state=' + state;
        }
        return this.http.post<DeviceInstancesModel[]>(url, {ids: ids}).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByDeviceType', []))
        );
    }

    getDeviceSelections(criteria: DeviceFilterCriteriaModel[], protocolBlocklist ?: string[] | null | undefined, interactionFilter ?: string | null | undefined): Observable<DeviceSelectablesModel[]> {
        let path = '/selectables?json=' + encodeURIComponent(JSON.stringify(criteria));
        if (protocolBlocklist) {
            path = path + '&filter_protocols=' + encodeURIComponent(protocolBlocklist.join(','));
        }
        if (interactionFilter) {
            path = path + '&filter_interaction=' + encodeURIComponent(interactionFilter);
        }
        return this.http.get<DeviceSelectablesModel[]>(
            environment.deviceSelectionUrl + path
        ).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceSelections', []))
        );
    }

    getDeviceHistory7d(): Observable<DeviceInstancesHistoryModel[]> {
        if (this.getDeviceHistoryObservable7d === null) {
            this.getDeviceHistoryObservable7d = this.http.get<DeviceInstancesHistoryModel[]>(environment.apiAggregatorUrl + '/devices?log=7d').pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceHistory7d', [])),
                share()
            );
        }
        return this.getDeviceHistoryObservable7d;
    }

    getDeviceHistory1h(): Observable<DeviceInstancesHistoryModel[]> {
        if (this.getDeviceHistoryObservable1h === null) {
            this.getDeviceHistoryObservable1h = this.http.get<DeviceInstancesHistoryModel[]>(environment.apiAggregatorUrl + '/devices?log=1h').pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceHistory1h', [])),
                share()
            );
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
}
