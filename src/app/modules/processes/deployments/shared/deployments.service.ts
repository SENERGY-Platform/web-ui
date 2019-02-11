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
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {environment} from '../../../../../environments/environment';
import {Observable} from 'rxjs';
import {catchError, map} from 'rxjs/internal/operators';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {DeploymentsModel} from './deployments.model';
import {DeploymentsDefinitionModel} from './deployments-definition.model';

@Injectable({
    providedIn: 'root'
})
export class DeploymentsService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    getAll(query: string, limit: number, offset: number, feature: string, order: string): Observable<DeploymentsModel[]> {
        return this.http.get<DeploymentsModel[]>(environment.processServiceUrl + '/deployment?sortBy=' + feature + '&sortOrder=' + order + '&maxResults=' + limit + '&firstResult=' + offset + (query ? '&nameLike=' + encodeURIComponent('%' + query + '%') : '')).pipe(
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
    /*
        getDiagram(definitionId: string): Observable<string> {
            return this.http.get(environment.processServiceUrl + '/process-definition/' + encodeURIComponent(definitionId) + '/diagram',{responseType: 'text'}).pipe(
                map(resp => resp || ''),
                catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getDeploymentDiagram', ''))
            );
        }*/

}
