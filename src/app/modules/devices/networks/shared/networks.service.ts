/*
 * Copyright 2018 InfAI (CC SES)
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
import {catchError, map} from 'rxjs/internal/operators';
import {Observable} from 'rxjs';
import {HubModel, NetworksModel} from './networks.model';
import {MatDialog, MatDialogConfig, MatSnackBar} from '@angular/material';
import {NetworksEditDialogComponent} from '../dialogs/networks-edit-dialog.component';
import {NetworksHistoryModel} from './networks-history.model';
import {NetworksClearDialogComponent} from '../dialogs/networks-clear-dialog.component';

@Injectable({
    providedIn: 'root'
})
export class NetworksService {

    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private dialog: MatDialog,
                public snackBar: MatSnackBar) {
    }

    getNetworks(searchText: string, limit: number, offset: number, value: string, order: string): Observable<NetworksModel[]> {
        return this.http.get<NetworksModel[]>
        (environment.apiAggregatorUrl + '/hubs?limit=' + limit + '&offset=' + offset + '&sort=' + value + '.' + order +
            (searchText === '' ? '' : '&search=' + encodeURIComponent(searchText))).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'getNetworks', []))
        );
    }

    changeName(hubId: string, hubName: string): Observable<HubModel | null> {
        return this.http.put<HubModel>(
            environment.deviceManagerUrl + '/hubs/' + encodeURIComponent(hubId) + '/name',
            '"' + hubName + '"'
        ).pipe(
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'changeName', null)));
    }

    delete(networkId: string): Observable<{status: number}> {
        return this.http.delete(environment.deviceManagerUrl + '/hubs/' + encodeURIComponent(networkId), {responseType: 'text', observe: 'response'}).pipe(
            map( resp => {
                return {status: resp.status};
            }),
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'delete', {status: 500}))
        );
    }

    update(hub: HubModel): Observable<HubModel | null> {
        return this.http.put<HubModel>(
            environment.deviceManagerUrl + '/hubs/' + encodeURIComponent(hub.id),
            hub)
        .pipe(
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'update', null))
        );
    }

    getNetworksHistory(duration: string): Observable<NetworksHistoryModel[]> {
        return this.http.get<NetworksHistoryModel[]>(environment.apiAggregatorUrl + '/hubs?log=' + duration).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'getNetworksHistory', []))
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
                this.update({id: network.id, name: network.name, hash: '', device_local_ids: []}).subscribe((respMessage: HubModel|null) => {
                    if (respMessage) {
                        this.snackBar.open('Hub cleared successfully.', undefined, {duration: 2000});
                    } else {
                        this.snackBar.open('Error while clearing the hub!', undefined, {duration: 2000});
                    }
                });
            }
        });
    }
}
