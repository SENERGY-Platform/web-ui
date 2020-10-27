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
import {DashboardModel} from '../../../dashboard/shared/dashboard.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardEditDialogComponent} from '../../../dashboard/dialogs/dashboard-edit-dialog.component';
import {DashboardManipulationEnum} from '../../../dashboard/shared/dashboard-manipulation.enum';
import {DeploymentsStartParameterDialogComponent} from '../dialogs/deployments-start-parameter-dialog.component';

@Injectable({
    providedIn: 'root'
})
export class DeploymentsService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private dialog: MatDialog) {
    }

    getAll(query: string, limit: number, offset: number, feature: string, order: string, source: string): Observable<DeploymentsModel[]> {
        let url = environment.apiAggregatorUrl + '/processes?sortBy=' + feature + '&sortOrder=' + order + '&maxResults=' + limit + '&firstResult=' + offset
        if (query) {
            url += '&nameLike=' + encodeURIComponent('%' + query + '%');
        }
        if (source) {
            url += '&source=' + encodeURIComponent(source);
        }
        return this.http.get<DeploymentsModel[]>(url).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getAll', []))
        );
    }

    getDeploymentName(deploymentId: string): Observable<string> {
        return this.http.get<DeploymentsModel>(environment.processServiceUrl + '/deployment/' + encodeURIComponent(deploymentId)).pipe(
            map(resp => resp && resp.name || ''),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getDeploymentName', ''))
        );
    }

    getDefinition(deploymentId: string): Observable<DeploymentsDefinitionModel[]> {
        return this.http.get<DeploymentsDefinitionModel[]>(environment.processServiceUrl + '/deployment/' + encodeURIComponent(deploymentId) + '/definition').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getDefinition', []))
        );
    }

    getMissingDependencies(id: string): Observable<DeploymentsMissingDependenciesModel | null> {
        return this.http.get<DeploymentsMissingDependenciesModel>(environment.processDeploymentUrl + '/dependencies/' + encodeURIComponent(id)).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getMissingDependencies', null))
        );
    }

    startDeployment(deploymentId: string): Observable<any | null> {
        return this.http.get<any>(environment.processServiceUrl + '/deployment/' + encodeURIComponent(deploymentId) + '/start').pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'startDeployment', null))
        );
    }

    getDeploymentInputParameters(deploymentId: string): Observable<Map<string, CamundaVariable>|null> {
        return this.http.get<Map<string, CamundaVariable>>(environment.processServiceUrl + '/deployment/' + encodeURIComponent(deploymentId) + '/parameter').pipe(
            map(resp => {
                if (!resp) {
                    return resp;
                } else if (resp instanceof Map) {
                    return resp;
                } else {
                    return new Map<string, CamundaVariable>(Object.entries(resp));
                }
            }),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getProcessParameters', null))
        );
    }

    startDeploymentWithParameter(deploymentId: string, parameter: Map<string, CamundaVariable>): Observable<any | null> {
        const queryParts: string[] = [];
        parameter.forEach((value, key) => {
            queryParts.push(key + '=' + encodeURIComponent(JSON.stringify(value.value)));
        });
        return this.http.get<any>(environment.processServiceUrl + '/deployment/' + encodeURIComponent(deploymentId) +
            '/start?' + queryParts.join('&'));
    }

    openStartWithParameterDialog(deploymentId: string, parameter: Map<string, CamundaVariable>): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            deploymentId: deploymentId,
            parameter: parameter
        };
        this.dialog.open(DeploymentsStartParameterDialogComponent, dialogConfig);
    }

    deleteDeployment(deploymentId: string): Observable<{ status: number }> {
        return this.http.delete(environment.processDeploymentUrl + '/deployments/' + encodeURIComponent(deploymentId), {
            responseType: 'text',
            observe: 'response'
        }).pipe(
            map(resp => {
                return {status: resp.status};
            }),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'deleteDeployment', {status: 500}))
        );
    }

    v2deleteDeployment(deploymentId: string): Observable<{ status: number }> {
        return this.http.delete(environment.processDeploymentUrl + '/v2/deployments/' + encodeURIComponent(deploymentId), {
            responseType: 'text',
            observe: 'response'
        }).pipe(
            map(resp => {
                return {status: resp.status};
            }),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'v2deleteDeployment', {status: 500}))
        );
    }

    getPreparedDeployments(processId: string): Observable<V2DeploymentsPreparedModel | null> {
        return this.http.get<V2DeploymentsPreparedModel>(environment.processDeploymentUrl + '/v2/prepared-deployments/' + processId).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getPreparedDeployments', null))
        );
    }

    getPreparedDeploymentsByXml(xml: string, svg: string): Observable<DeploymentsPreparedModel | null> {
        return this.http.post<DeploymentsPreparedModel>(environment.processDeploymentUrl + '/prepared-deployments', {'xml': xml, 'svg': svg}).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getPreparedDeployments', null))
        );
    }

    v2getPreparedDeploymentsByXml(xml: string, svg: string): Observable<V2DeploymentsPreparedModel | null> {
        return this.http.post<V2DeploymentsPreparedModel>(environment.processDeploymentUrl + '/v2/prepared-deployments', {'xml': xml, 'svg': svg}).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getPreparedDeployments', null))
        );
    }

    getDeployments(deploymentId: string): Observable<DeploymentsPreparedModel | null> {
        return this.http.get<DeploymentsPreparedModel>(environment.processDeploymentUrl + '/deployments/' + deploymentId).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getDeployments', null))
        );
    }

    v2getDeployments(deploymentId: string): Observable<V2DeploymentsPreparedModel | null> {
        return this.http.get<V2DeploymentsPreparedModel>(environment.processDeploymentUrl + '/v2/deployments/' + deploymentId).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'v2getDeployments', null))
        );
    }

    getConfigurables(characteristicId: string, serviceId: string): Observable<V2DeploymentsPreparedConfigurableModel[] | null> {
        return this.http.get<V2DeploymentsPreparedConfigurableModel[]>(environment.configurablesUrl + '?characteristicId=' + characteristicId + '&serviceIds=' + serviceId).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getConfigurables', null))
        );
    }

    postDeployments(deployment: DeploymentsPreparedModel, source: string = 'sepl'): Observable<{ status: number, id: string }> {
        return this.http.post<DeploymentsPreparedModel>(environment.processDeploymentUrl + '/deployments?source=' + source, deployment, {observe: 'response'}).pipe(
            map(resp => {
                return {status: resp.status, id: resp.body ? resp.body.id : ''};
            }),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'postDeployments', {status: 500, id: ''}))
        );
    }

    v2postDeployments(deployment: V2DeploymentsPreparedModel, source: string = 'sepl'): Observable<{ status: number, id: string }> {
        return this.http.post<V2DeploymentsPreparedModel>(environment.processDeploymentUrl + '/v2/deployments?source=' + source, deployment, {observe: 'response'}).pipe(
            map(resp => {
                return {status: resp.status, id: resp.body ? resp.body.id : ''};
            }),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'v2postDeployments', {status: 500, id: ''}))
        );
    }

    checkForDeletedDeploymentWithRetries(id: string, maxRetries: number, intervalInMs: number): Observable<boolean> {
        return this.http.get<boolean>(environment.processServiceUrl + '/deployment/' + encodeURIComponent(id) + '/exists').pipe(
            map(data => {
                if (data === true) {
                    throw Error('');
                }
                return data;
            }),
            retryWhen(mergeMap((error, i) => {
                const retryAttempt = i + 1;
                if (retryAttempt > maxRetries) {
                    throw(error);
                }
                return timer(retryAttempt * intervalInMs);
            })),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'checkForProcessModelWithRetries', true))
        );
    }
}
