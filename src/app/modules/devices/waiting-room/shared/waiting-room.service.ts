/*
 * Copyright 2021 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { Observable, Subscription } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import {
    WaitingDeviceListModel,
    WaitingDeviceModel,
    WaitingRoomEvent,
    WaitingRoomEventTypeAuth,
    WaitingRoomEventTypeAuthOk,
    WaitingRoomEventTypeAuthRequest,
    WaitingRoomEventTypeError,
    WaitingRoomEventTypeSet,
    WaitingRoomEventTypeDelete,
    WaitingRoomEventTypeUse,
} from './waiting-room.model';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class WaitingRoomService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private authorizationService: AuthorizationService,
        private ladonService: LadonService
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.waitingRoomUrl);
    }

    updateDevice(device: WaitingDeviceModel): Observable<WaitingDeviceModel | null> {
        const url = environment.waitingRoomUrl + '/devices/' + encodeURIComponent(device.local_id);
        return this.http
            .put<WaitingDeviceModel>(url, device)
            .pipe(catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'updateDevice', null)));
    }

    updateMultipleDevices(devices: WaitingDeviceModel[]): Observable<WaitingDeviceModel[] | null> {
        const url = environment.waitingRoomUrl + '/devices';
        return this.http
            .put<WaitingDeviceModel[]>(url, devices)
            .pipe(catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'updateMultipleDevices', null)));
    }

    useDevice(localId: string): Observable<{ status: number }> {
        const url = environment.waitingRoomUrl + '/used/devices/' + encodeURIComponent(localId);
        return this.http.post(url, null, { responseType: 'text', observe: 'response' }).pipe(
            map((resp) => ({ status: resp.status })),
            catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'useDevice', { status: 404 })),
        );
    }

    useMultipleDevices(deviceIds: string[]): Observable<{ status: number }> {
        return this.http
            .request('POST', environment.waitingRoomUrl + '/used/devices', { body: deviceIds, responseType: 'text', observe: 'response' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'useMultipleDevices: Error', { status: 404 })),
            );
    }

    deleteDevice(localId: string): Observable<{ status: number }> {
        return this.http
            .delete(environment.waitingRoomUrl + '/devices/' + encodeURIComponent(localId), { responseType: 'text', observe: 'response' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'deleteDevice', { status: 404 })),
            );
    }

    deleteMultipleDevices(deviceIds: string[]): Observable<{ status: number }> {
        return this.http
            .request('DELETE', environment.waitingRoomUrl + '/devices', { body: deviceIds, responseType: 'text', observe: 'response' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'deleteMultipleDevices: Error', { status: 404 })),
            );
    }

    searchDevices(
        search?: string,
        limit?: number,
        offset?: number,
        sort?: string,
        order?: string,
        showHidden?: boolean,
    ): Observable<WaitingDeviceListModel | null> {
        const params = ['limit=' + limit, 'offset=' + offset, 'sort=' + sort + '.' + order];
        if (search) {
            params.push('search=' + encodeURIComponent(search));
        }
        if (showHidden) {
            params.push('show_hidden=true');
        }
        const url = environment.waitingRoomUrl + '/devices?' + params.join('&');

        return this.http.get<WaitingDeviceListModel>(url).pipe(
            map(
                (resp: WaitingDeviceListModel) =>
                    resp ||
                    ({
                        result: [],
                        total: 0,
                    } as WaitingDeviceListModel),
            ),
            map((resp: WaitingDeviceListModel) => {
                resp.result = resp.result ? resp.result : [];
                return resp;
            }),
            catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'searchDevices: Error', null)),
        );
    }

    hideDevice(localId: string): Observable<{ status: number }> {
        const url = environment.waitingRoomUrl + '/hidden/devices/' + encodeURIComponent(localId);
        return this.http.put(url, null, { responseType: 'text', observe: 'response' }).pipe(
            map((resp) => ({ status: resp.status })),
            catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'hideDevice', { status: 404 })),
        );
    }

    hideMultipleDevices(deviceIds: string[]): Observable<{ status: number }> {
        return this.http
            .request('PUT', environment.waitingRoomUrl + '/hidden/devices', { body: deviceIds, responseType: 'text', observe: 'response' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'hideMultipleDevices: Error', { status: 404 })),
            );
    }

    showDevice(localId: string): Observable<{ status: number }> {
        const url = environment.waitingRoomUrl + '/shown/devices/' + encodeURIComponent(localId);
        return this.http.put(url, null, { responseType: 'text', observe: 'response' }).pipe(
            map((resp) => ({ status: resp.status })),
            catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'showDevice', { status: 404 })),
        );
    }

    showMultipleDevices(deviceIds: string[]): Observable<{ status: number }> {
        return this.http
            .request('PUT', environment.waitingRoomUrl + '/shown/devices', { body: deviceIds, responseType: 'text', observe: 'response' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'showMultipleDevices: Error', { status: 404 })),
            );
    }

    events(closerSetter: (closer: () => void) => void, fallback?: () => void): Observable<WaitingRoomEvent> {
        const events: EventEmitter<WaitingRoomEvent> = new EventEmitter();

        if (environment.waitingRoomWsUrl === '') {
            if (fallback) {
                fallback();
            }
            return events;
        }

        let fallbackUsed = false;

        let ws: WebSocketSubject<WaitingRoomEvent>;

        const auth = () => {
            this.authorizationService.getToken().then((token) => ws?.next({ type: WaitingRoomEventTypeAuth, payload: token }));
        };

        const useFallback = () => {
            if (!fallbackUsed && fallback) {
                fallbackUsed = true;
                fallback();
            }
        };

        let subscription: Subscription | null;
        const init = () => {
            subscription?.unsubscribe();
            subscription = null;
            ws?.complete();
            ws = webSocket<WaitingRoomEvent>(environment.waitingRoomWsUrl);
            closerSetter(() => {
                subscription?.unsubscribe();
                subscription = null;
                ws?.complete();
            });
            subscription = ws.subscribe(
                (msg: WaitingRoomEvent) => {
                    switch (msg.type) {
                    case WaitingRoomEventTypeAuthRequest:
                        auth();
                        break;
                    case WaitingRoomEventTypeAuthOk:
                        events.emit(msg);
                        break;
                    case WaitingRoomEventTypeError:
                        console.error('ERROR:', msg);
                        useFallback();
                        break;
                    default:
                        events.emit(msg);
                    }
                },
                (err: any) => {
                    console.error('ERROR:', err);
                    useFallback();
                    setTimeout(() => {
                        init();
                    }, 5000);
                },
                () => setTimeout(() => init(), 5000),
            );
            auth();
        };
        init();
        return events;
    }

    eventIsUpdate(msg: WaitingRoomEvent) {
        return msg.type === WaitingRoomEventTypeSet || msg.type === WaitingRoomEventTypeDelete || msg.type === WaitingRoomEventTypeUse;
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations['GET'];
    }
}
