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
import {NetworksModel} from './networks.model';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {NetworksEditDialogComponent} from '../dialogs/networks-edit-dialog.component';
import {NetworksDeleteDialogComponent} from '../dialogs/networks-delete-dialog.component';
import {NetworksHistoryModel} from './networks-history.model';

@Injectable({
    providedIn: 'root'
})
export class NetworksService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private dialog: MatDialog) {
    }

    getNetworks(searchText: string, limit: number, offset: number, value: string, order: string): Observable<NetworksModel[]> {
        if (searchText === '') {
            return this.http.get<NetworksModel[]>
            (environment.apiAggregatorUrl + '/list/gateways/' + limit + '/' + offset + '/' + value + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(NetworksService.name, 'getNetworks: no search', []))
            );
        } else {
            return this.http.get<NetworksModel[]>
            (environment.apiAggregatorUrl + '/search/gateways/' + searchText + '/' + limit + '/' + offset + '/' + value + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(NetworksService.name, 'getNetworks: search', []))
            );
        }
    }

    changeName(networkId: string, networkName: string): Observable<string> {
        return this.http.post(environment.iotRepoUrl + '/gateway/' + encodeURIComponent(networkId) + '/name/' +
            encodeURIComponent(networkName), null, {responseType: 'text'}).pipe(
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'changeName', 'error')));
    }

    delete(networkId: string) {
        return this.http.delete(environment.iotRepoUrl + '/gateway/' + encodeURIComponent(networkId)).pipe(
            catchError(this.errorHandlerService.handleError(NetworksService.name, 'delete'))
        );
    }

    getNetworksHistory(duration: string): Observable<NetworksHistoryModel[]> {
        return this.http.get<NetworksHistoryModel[]>(environment.apiAggregatorUrl + '/history/gateways/' + duration).pipe(
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
                this.changeName(network.id, networkName).subscribe((resp: string) => {
                    if (resp === 'ok') {
                        network.name = networkName;
                    }
                });
            }
        });
    }

    openNetworkDeleteDialog(network: NetworksModel) {

        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(NetworksDeleteDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((deleteNetwork: boolean) => {
            if (deleteNetwork) {
                this.delete(network.id).subscribe();
                // todo: refresh network list!
            }
        });
    }



}
