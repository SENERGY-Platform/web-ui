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
import { HttpClient, HttpParams } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {
    ExtendedHubModel,
    ExtendedHubTotalModel,
    HubModel,
} from './networks.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { NetworksEditDialogComponent } from '../dialogs/networks-edit-dialog.component';
import { NetworksHistoryModel } from './networks-history.model';
import { NetworksClearDialogComponent } from '../dialogs/networks-clear-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import {
    DeviceInstancesRouterStateTabEnum
} from '../../device-instances/shared/device-instances.model';

@Injectable({
    providedIn: 'root',
})
export class NetworksService {
    authorizations: PermissionTestResponse;
    shareAuthorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService,
        private dialog: MatDialog,
        public snackBar: MatSnackBar,
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.deviceRepoUrl + '/hubs');
        this.shareAuthorizations = this.ladonService.getUserAuthorizationsForURI(environment.permissionV2Url + '/manage/hubs');
    }

    listSyncNetworks(): Observable<HubModel[]> {
        return this.http.get<HubModel[]>(environment.processSyncUrl + '/networks').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'listSyncNetworks(search)', [])),
        );
    }

    changeName(hubId: string, hubName: string): Observable<HubModel | null> {
        return this.http
            .put<HubModel>(environment.deviceRepoUrl + '/hubs/' + encodeURIComponent(hubId) + '/name', '"' + hubName + '"')
            .pipe(catchError(this.errorHandlerService.handleError(NetworksService.name, 'changeName', null)));
    }

    delete(networkId: string): Observable<{ status: number }> {
        return this.http
            .delete(environment.deviceRepoUrl + '/hubs/' + encodeURIComponent(networkId), { responseType: 'text', observe: 'response' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(NetworksService.name, 'delete', { status: 500 })),
            );
    }

    update(hub: HubModel): Observable<HubModel | null> {
        return this.http
            .put<HubModel>(environment.deviceRepoUrl + '/hubs/' + encodeURIComponent(hub.id), hub)
            .pipe(catchError(this.errorHandlerService.handleError(NetworksService.name, 'update', null)));
    }

    getNetworksHistory(duration: string): Observable<NetworksHistoryModel[]> {
        return this.http.get<NetworksHistoryModel[]>(environment.apiAggregatorUrl + '/hubs?limit=10000&log=' + duration).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'getNetworksHistory', [])),
        );
    }

    openNetworkEditDialog(network: HubModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = network;
        const editDialogRef = this.dialog.open(NetworksEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((networkName: string) => {
            if (networkName !== undefined) {
                this.changeName(network.id, networkName).subscribe((resp: HubModel | null) => {
                    if (resp) {
                        network.name = networkName;
                    }
                });
            }
        });
    }

    openNetworkClearDialog(network: HubModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(NetworksClearDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((clearNetwork: boolean) => {
            if (clearNetwork) {
                this.update({ id: network.id, name: network.name, hash: '', device_local_ids: [], owner_id: network.owner_id, device_ids: [] }).subscribe(
                    (respMessage: HubModel | null) => {
                        if (respMessage) {
                            this.snackBar.open('Hub cleared successfully.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while clearing the hub!', 'close', { panelClass: 'snack-bar-error' });
                        }
                    },
                );
            }
        });
    }

    getExtendedHub(id: string): Observable<ExtendedHubModel|null> {
        return this.http.get<ExtendedHubModel>(environment.deviceRepoUrl + '/extended-hubs/'+encodeURIComponent(id)).pipe(
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'getExtendedHub', null)),
        );
    }

    listExtendedHubs(options: {
        limit: number;
        offset: number;
        sortBy?: string;
        sortDesc?: boolean;
        searchText?: string;
        connectionState?: DeviceInstancesRouterStateTabEnum;
        ids?: string[];
    }): Observable<ExtendedHubTotalModel> {
        let params = new HttpParams();
        if(options.limit > 0) {
            params = params.set('limit', options.limit.toString());
        }
        if(options.offset > 0) {
            params = params.set('offset', options.offset.toString());
        }
        let sort = options.sortBy || 'name';
        if(sort == 'annotations.connected') {
            sort = 'connectionstate';
        }
        if(options.sortDesc){
            sort = sort+'.desc';
        }
        if(sort != '') {
            params = params.set('sort', sort);
        }
        if (options.searchText && options.searchText != '') {
            params = params.set('search', options.searchText);
        }
        if(options.ids!==null && options.ids!==undefined && options.ids.join){
            params = params.set('ids', options.ids.join(','));
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
        return this.http.get<ExtendedHubModel[]>(environment.deviceRepoUrl + '/extended-hubs', { observe: 'response', params: params }).pipe(
            map((resp) => {
                const totalStr = resp.headers.get('X-Total-Count') || '0';
                return {
                    result: resp.body,
                    total: parseInt(totalStr)
                } as ExtendedHubTotalModel;
            }),
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'getExtendedHubs', {result: [], total: 0})),
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

    userHasShareAuthorization(): boolean {
        return this.shareAuthorizations['GET'] && this.shareAuthorizations['PUT'];
    }
}
