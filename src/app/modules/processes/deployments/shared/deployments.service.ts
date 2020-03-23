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
import {DeploymentsDefinitionModel} from './deployments-definition.model';
import {DeploymentsMissingDependenciesModel} from './deployments-missing-dependencies.model';
import {DeploymentsPreparedModel} from './deployments-prepared.model';

@Injectable({
    providedIn: 'root'
})
export class DeploymentsService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    getAll(query: string, limit: number, offset: number, feature: string, order: string): Observable<DeploymentsModel[]> {
        return this.http.get<DeploymentsModel[]>(environment.apiAggregatorUrl + '/processes?sortBy=' + feature + '&sortOrder=' + order + '&maxResults=' + limit + '&firstResult=' + offset + (query ? '&nameLike=' + encodeURIComponent('%' + query + '%') : '')).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getAll', []))
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

    startDeployment(deploymentId: string): Observable<any[] | null> {
        return this.http.get<any[]>(environment.processServiceUrl + '/process-definition/' + encodeURIComponent(deploymentId) + '/start').pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'startDeployment', null))
        );
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

    getPreparedDeployments(processId: string): Observable<DeploymentsPreparedModel | null> {
        return this.http.get<DeploymentsPreparedModel>(environment.processDeploymentUrl + '/prepared-deployments/' + processId).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getPreparedDeployments', null))
        );
    }

    getDeployments(deploymentId: string): Observable<DeploymentsPreparedModel | null> {
        return this.http.get<DeploymentsPreparedModel>(environment.processDeploymentUrl + '/deployments/' + deploymentId).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getDeployments', null))
        );
    }

    postDeployments(deployment: DeploymentsPreparedModel): Observable<{ status: number }> {
        return this.http.post<DeploymentsPreparedModel>(environment.processDeploymentUrl + '/deployments', deployment, {observe: 'response'}).pipe(
            map(resp => {
                return {status: resp.status};
            }),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'postDeployments', {status: 500}))
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
