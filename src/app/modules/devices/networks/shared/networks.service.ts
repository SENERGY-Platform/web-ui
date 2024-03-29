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
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ApiAggregatorNetworksModel, HubModel, NetworksModel, NetworksPermModel } from './networks.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { NetworksEditDialogComponent } from '../dialogs/networks-edit-dialog.component';
import { NetworksHistoryModel } from './networks-history.model';
import { NetworksClearDialogComponent } from '../dialogs/networks-clear-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { AllowedMethods, PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

@Injectable({
    providedIn: 'root',
})
export class NetworksService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService,
        private dialog: MatDialog,
        public snackBar: MatSnackBar,
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.deviceManagerUrl);
    }

    getNetworksWithLogState(
        searchText: string,
        limit: number,
        offset: number,
        value: string,
        order: string,
    ): Observable<ApiAggregatorNetworksModel[]> {
        return this.http
            .get<ApiAggregatorNetworksModel[]>(
                environment.apiAggregatorUrl +
                    '/hubs?limit=' +
                    limit +
                    '&offset=' +
                    offset +
                    '&sort=' +
                    value +
                    '.' +
                    order +
                    (searchText === '' ? '' : '&search=' + encodeURIComponent(searchText)),
            )
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(NetworksService.name, 'getNetworks', [])),
            );
    }

    getNetwork(id: string): Observable<NetworksPermModel> {
        return this.http.get<NetworksPermModel[]>(environment.permissionSearchUrl + '/v3/resources/hubs?ids=' + id).pipe(
            map(networks => networks[0])
        );
    }

    searchNetworks(searchText: string, limit: number, offset: number, sortBy: string, sortDirection: string): Observable<NetworksPermModel[]> {
        if (!searchText) {
            return this.listNetworks(limit, offset, sortBy, sortDirection);
        }
        if (sortDirection === '' || sortDirection === null || sortDirection === undefined) {
            sortDirection = 'asc';
        }
        if (sortBy === '' || sortBy === null || sortBy === undefined) {
            sortBy = 'name';
        }
        const params = [
            'limit=' + limit,
            'offset=' + offset,
            'rights=r',
            'sort=' + sortBy + '.' + sortDirection,
            'search=' + encodeURIComponent(searchText),
        ].join('&');

        return this.http.get<NetworksPermModel[]>(environment.permissionSearchUrl + '/v3/resources/hubs?' + params).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'searchNetworks(search)', [])),
        );
    }

    listNetworks(limit: number, offset: number, sortBy: string, sortDirection: string): Observable<NetworksPermModel[]> {
        if (sortDirection === '' || sortDirection === null || sortDirection === undefined) {
            sortDirection = 'asc';
        }
        if (sortBy === '' || sortBy === null || sortBy === undefined) {
            sortBy = 'name';
        }
        const params = ['limit=' + limit, 'offset=' + offset, 'rights=r', 'sort=' + sortBy + '.' + sortDirection].join('&');

        return this.http.get<NetworksPermModel[]>(environment.permissionSearchUrl + '/v3/resources/hubs?' + params).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'searchNetworks(search)', [])),
        );
    }

    listSyncNetworks(): Observable<NetworksModel[]> {
        return this.http.get<NetworksModel[]>(environment.processSyncUrl + '/networks').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'listSyncNetworks(search)', [])),
        );
    }

    changeName(hubId: string, hubName: string): Observable<HubModel | null> {
        return this.http
            .put<HubModel>(environment.deviceManagerUrl + '/hubs/' + encodeURIComponent(hubId) + '/name', '"' + hubName + '"')
            .pipe(catchError(this.errorHandlerService.handleError(NetworksService.name, 'changeName', null)));
    }

    delete(networkId: string): Observable<{ status: number }> {
        return this.http
            .delete(environment.deviceManagerUrl + '/hubs/' + encodeURIComponent(networkId), { responseType: 'text', observe: 'response' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(NetworksService.name, 'delete', { status: 500 })),
            );
    }

    update(hub: HubModel): Observable<HubModel | null> {
        return this.http
            .put<HubModel>(environment.deviceManagerUrl + '/hubs/' + encodeURIComponent(hub.id), hub)
            .pipe(catchError(this.errorHandlerService.handleError(NetworksService.name, 'update', null)));
    }

    getNetworksHistory(duration: string): Observable<NetworksHistoryModel[]> {
        return this.http.get<NetworksHistoryModel[]>(environment.apiAggregatorUrl + '/hubs?limit=10000&log=' + duration).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'getNetworksHistory', [])),
        );
    }

    openNetworkEditDialog(network: NetworksModel): void {
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

    openNetworkClearDialog(network: NetworksModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(NetworksClearDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((clearNetwork: boolean) => {
            if (clearNetwork) {
                this.update({ id: network.id, name: network.name, hash: '', device_local_ids: [] }).subscribe(
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

    getTotalCountOfNetworks(searchText: string): Observable<any> {
        const options = searchText ?
            { params: new HttpParams().set('search', searchText) } : {};

        return this.http
            .get(environment.permissionSearchUrl + '/v3/total/hubs', options)
            .pipe(
                catchError(
                    this.errorHandlerService.handleError(
                        NetworksService.name,
                        'getTotalCountOfNetworks',
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
