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
import { environment } from '../../../../../environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { DeploymentsModel } from './deployments.model';
import { CamundaVariable } from './deployments-definition.model';
import { V2DeploymentsPreparedConfigurableModel, V2DeploymentsPreparedModel } from './deployments-prepared-v2.model';
import { MatDialog } from '@angular/material/dialog';
import { DeploymentsFogMetadataModel, DeploymentsFogModel } from './deployments-fog.model';
import { NetworksService } from '../../../devices/networks/shared/networks.service';
import {ExtendedHubModel, HubModel} from '../../../devices/networks/shared/networks.model';

@Injectable({
    providedIn: 'root',
})
export class DeploymentsFogFactory {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private networksService: NetworksService) {}

    withHubId(hubId: string): DeploymentsFogService {
        return new DeploymentsFogService(hubId, this.http, this.errorHandlerService, this.networksService);
    }
}

export class DeploymentsFogService {
    constructor(
        private hubId: string,
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private networksService: NetworksService,
    ) {}

    getPreparedDeployments(processId: string): Observable<V2DeploymentsPreparedModel | null> {
        const url =
            environment.processFogDeploymentUrl +
            '/prepared-deployments/' +
            encodeURIComponent(this.hubId) +
            '/' +
            encodeURIComponent(processId);
        return this.http.get<V2DeploymentsPreparedModel>(url).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'getPreparedDeployments', null)),
            map((deployment) => {
                deployment?.elements?.forEach((element) => {
                    element.message_event?.selection.selection_options.forEach((option: any) => {
                        if (option.servicePathOptions === undefined) {
                            return;
                        }
                        const m = new Map<string, { path: string; characteristicId: string }[]>();
                        for (const key of Object.keys(option.servicePathOptions)) {
                            m.set(key, option.servicePathOptions[key]);
                        }
                        option.servicePathOptions = m;
                    });
                });
                return deployment;
            }),
        );
    }

    v2getDeployments(deploymentId: string): Observable<V2DeploymentsPreparedModel | null> {
        const url =
            environment.processSyncUrl +
            '/deployments/' +
            encodeURIComponent(this.hubId) +
            '/' +
            encodeURIComponent(deploymentId) +
            '/metadata';
        return this.http.get<DeploymentsFogMetadataModel>(url).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'v2getDeployments', null)),
            map((metadata) => {
                if (!metadata) {
                    return metadata;
                }
                const deployment: V2DeploymentsPreparedModel = metadata.deployment_model;
                deployment.id = metadata.camunda_deployment_id;
                return deployment;
            }),
        );
    }

    v2postDeployments(deployment: V2DeploymentsPreparedModel): Observable<{ status: number; id: string }> {
        const url = environment.processFogDeploymentUrl + '/deployments/' + encodeURIComponent(this.hubId);
        return this.http.post<V2DeploymentsPreparedModel>(url, deployment, { observe: 'response' }).pipe(
            map((resp) => ({ status: resp.status, id: resp.body ? resp.body.id : '' })),
            catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'v2postDeployments', { status: 500, id: '' })),
        );
    }

    getConfigurables(characteristicId: string, serviceId: string): Observable<V2DeploymentsPreparedConfigurableModel[] | null> {
        return this.http
            .get<V2DeploymentsPreparedConfigurableModel[]>(
                environment.configurablesUrl + '?characteristicId=' + characteristicId + '&serviceIds=' + serviceId,
            )
            .pipe(catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'getConfigurables', null)));
    }

    // lists

    getAll(query: string, limit: number, offset: number, feature: string, order: string, _: string): Observable<DeploymentsModel[]> {
        let url =
            environment.processSyncUrl +
            '/deployments?sort=' +
            feature +
            '.' +
            order +
            '&limit=' +
            limit +
            '&offset=' +
            offset +
            '&network_id=' +
            encodeURIComponent(this.hubId) +
            '&extended=true';

        if (query) {
            url += '&search=' + encodeURIComponent(query);
        }

        return this.networksService.listExtendedHubs({limit:1000, offset: 0, sortBy: 'name'}).pipe(
            map((resp) => resp ? resp.result : [] as ExtendedHubModel[]),
            mergeMap((networks) => {
                const networkState = new Map<string, ExtendedHubModel>();
                networks.forEach((value) => {
                    networkState.set(value.id, value);
                });
                return this.http.get<DeploymentsFogModel[]>(url).pipe(
                    map((resp) => resp || []),
                    map((list) =>
                        list.map((element) => {
                            const network = networkState.get(element.network_id);
                            element.online = network?.connection_state === 'online'; // hubs without state are online

                            if (!element.online) {
                                element.offline_reasons = [
                                    {
                                        id: network?.id || '',
                                        type: 'network_offline',
                                        description: network?.name + ' offline',
                                        additional_info: { name: '' },
                                    },
                                ];
                            }
                            element.sync = element.is_placeholder || element.marked_for_delete;
                            return element;
                        }),
                    ),
                    catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'getAll', [])),
                );
            }),
        );
    }

    checkForDeletedDeploymentWithRetries(_: string, _1: number, _2: number): Observable<boolean> {
        return of(true);
    }

    getDeploymentInputParameters(deploymentId: string): Observable<Map<string, CamundaVariable> | null> {
        const url =
            environment.processSyncUrl +
            '/deployments/' +
            encodeURIComponent(this.hubId) +
            '/' +
            encodeURIComponent(deploymentId) +
            '/metadata';
        return this.http.get<DeploymentsFogMetadataModel>(url).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'getDeploymentInputParameters', null)),
            map((metadata) => {
                if (!metadata) {
                    return metadata;
                }
                return metadata.process_parameter;
            }),
        );
    }

    startDeploymentWithParameter(deploymentId: string, parameter: Map<string, CamundaVariable>): Observable<any | null> {
        const queryParts: string[] = [];
        parameter.forEach((value, key) => {
            queryParts.push(key + '=' + encodeURIComponent(JSON.stringify(value.value)));
        });
        return this.http
            .get<any>(
                environment.processSyncUrl +
                    '/deployments/' +
                    encodeURIComponent(this.hubId) +
                    '/' +
                    encodeURIComponent(deploymentId) +
                    '/start?' +
                    queryParts.join('&'),
            )
            .pipe(catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'startDeploymentWithParameter', null)));
    }

    startDeployment(deploymentId: string): Observable<any | null> {
        return this.http
            .get<any>(
                environment.processSyncUrl +
                    '/deployments/' +
                    encodeURIComponent(this.hubId) +
                    '/' +
                    encodeURIComponent(deploymentId) +
                    '/start',
            )
            .pipe(catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'startDeployment', null)));
    }

    v2deleteDeployment(deploymentId: string): Observable<{ status: number }> {
        return this.http
            .delete(
                environment.processSyncUrl + '/deployments/' + encodeURIComponent(this.hubId) + '/' + encodeURIComponent(deploymentId),
                {
                    responseType: 'text',
                    observe: 'response',
                },
            )
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'v2deleteDeployment', { status: 500 })),
            );
    }

    refreshSync(): Observable<{ status: number }> {
        return this.http.post(
                environment.processSyncUrl + '/sync/deployments/' + encodeURIComponent(this.hubId),
                null,
                {
                    responseType: 'text',
                    observe: 'response',
                }
            ).pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'refreshSync', { status: 500 })),
            );
    }
}
