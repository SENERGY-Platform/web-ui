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
import {environment} from '../../../../../environments/environment';
import {Observable, timer} from 'rxjs';
import {catchError, map, mergeMap, retryWhen} from 'rxjs/internal/operators';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {DeploymentsModel} from './deployments.model';
import {CamundaVariable, DeploymentsDefinitionModel} from './deployments-definition.model';
import {DeploymentsMissingDependenciesModel} from './deployments-missing-dependencies.model';
import {DeploymentsPreparedModel} from './deployments-prepared.model';
import {V2DeploymentsPreparedConfigurableModel, V2DeploymentsPreparedModel} from './deployments-prepared-v2.model';
import {MatDialog} from '@angular/material/dialog';
import {DeploymentsFogMetadataModel} from './deployments-fog.model';

@Injectable({
    providedIn: 'root'
})
export class DeploymentsFogFactory {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private dialog: MatDialog) {
    }

    withHubId(hubId: string): DeploymentsFogService {
        return new DeploymentsFogService(hubId, this.http, this.errorHandlerService, this.dialog);
    }
}

export class DeploymentsFogService {

    constructor(private hubId: string, private http: HttpClient, private errorHandlerService: ErrorHandlerService, private dialog: MatDialog) {
    }

    getPreparedDeployments(processId: string): Observable<V2DeploymentsPreparedModel | null> {
        const url = environment.processFogDeploymentUrl + '/prepared-deployments/' + encodeURIComponent(this.hubId) + '/' + encodeURIComponent(processId);
        return this.http.get<V2DeploymentsPreparedModel>(url).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'getPreparedDeployments', null)),
            map(deployment => {
                deployment?.elements.forEach(element => {
                    element.message_event?.selection.selection_options.forEach((option: any) => {
                        if (option.servicePathOptions === undefined) {
                            return;
                        }
                        const m = new Map<string, {path: string, characteristicId: string}[]>();
                        for (const key of Object.keys(option.servicePathOptions)) {
                            m.set(key, option.servicePathOptions[key]);
                        }
                        option.servicePathOptions = m;
                    });
                });
                return deployment;
            })
        );
    }

    v2getDeployments(deploymentId: string): Observable<V2DeploymentsPreparedModel | null> {
        const url = environment.processSyncUrl + '/deployments/' + encodeURIComponent(this.hubId) + '/' + encodeURIComponent(deploymentId) + '/metadata';
        return this.http.get<DeploymentsFogMetadataModel>(url).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'v2getDeployments', null)),
            map(metadata => {
                if (!metadata) {
                    return metadata;
                }
                const deployment: V2DeploymentsPreparedModel = metadata.deployment_model;
                deployment.id = metadata.camunda_deployment_id;
                return deployment;
            })
        );
    }

    v2postDeployments(deployment: V2DeploymentsPreparedModel): Observable<{ status: number, id: string }> {
        const url = environment.processFogDeploymentUrl + '/deployments/' + encodeURIComponent(this.hubId);
        return this.http.post<V2DeploymentsPreparedModel>(url, deployment, {observe: 'response'}).pipe(
            map(resp => {
                return {status: resp.status, id: resp.body ? resp.body.id : ''};
            }),
            catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'v2postDeployments', {status: 500, id: ''}))
        );
    }


    getConfigurables(characteristicId: string, serviceId: string): Observable<V2DeploymentsPreparedConfigurableModel[] | null> {
        return this.http.get<V2DeploymentsPreparedConfigurableModel[]>(environment.configurablesUrl + '?characteristicId=' + characteristicId + '&serviceIds=' + serviceId).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsFogService.name, 'getConfigurables', null))
        );
    }
}
