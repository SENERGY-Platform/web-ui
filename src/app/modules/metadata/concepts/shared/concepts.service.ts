/*
 * Copyright 2021 InfAI (CC SES)
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
import {
    ConverterExtensionTryRequest,
    ConverterExtensionTryResult,
    DeviceTypeConceptModel
} from '../../device-types-overview/shared/device-type.model';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { ConceptsCharacteristicsModel } from './concepts-characteristics.model';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class ConceptsService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        const url = environment.deviceRepoUrl + '/v2/concepts';
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(url);
    }

    tryConverterExtension(extensionTryRequest: ConverterExtensionTryRequest): Observable<ConverterExtensionTryResult | null> {
        return this.http
            .post<ConverterExtensionTryResult>(environment.marshallerUrl + '/converter/extension-call', extensionTryRequest)
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'tryConverterExtension', null)));
    }

    createConcept(concept: DeviceTypeConceptModel): Observable<DeviceTypeConceptModel | null> {
        return this.http
            .post<DeviceTypeConceptModel>(environment.deviceRepoUrl + '/concepts', concept)
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'createConcept', null)));
    }

    updateConcept(concept: DeviceTypeConceptModel): Observable<DeviceTypeConceptModel | null> {
        return this.http
            .put<DeviceTypeConceptModel>(environment.deviceRepoUrl + '/concepts/' + concept.id , concept)
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'createConcept', null)));
    }

    getConceptWithoutCharacteristics(conceptId: string): Observable<DeviceTypeConceptModel | null> {
        return this.http
            .get<DeviceTypeConceptModel>(environment.deviceRepoUrl + '/concepts/' + conceptId + '?sub-class=false')
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConcept', null)));
    }

    getConceptWithCharacteristics(conceptId: string): Observable<ConceptsCharacteristicsModel | null> {
        return this.http
            .get<ConceptsCharacteristicsModel>(environment.deviceRepoUrl + '/concepts/' + conceptId + '?sub-class=true')
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConcept', null)));
    }

    getConceptsWithCharacteristics(options: {
        query?: string;
        limit?: number;
        offset?: number;
        sort?: string;
        ids?: string[];
    }): Observable<{result: ConceptsCharacteristicsModel[]; total: number}> {
        let params = new HttpParams();
        if (options.query !== undefined) {
            params = params.set('search', options.query);
        }
        if (options.limit !== undefined) {
            params = params.set('limit', options.limit);
        }
        if (options.offset !== undefined) {
            params = params.set('offset', options.offset);
        }
        if (options.sort !== undefined) {
            params = params.set('sort', options.sort);
        }
        if (options.ids !== undefined) {
            params = params.set('ids', options.ids.join(','));
        }

        return this.http
            .get<ConceptsCharacteristicsModel[]>(environment.deviceRepoUrl + '/v2/concepts-with-characteristics', { observe: 'response', params}).pipe(
                map(resp => {
                    const totalStr = resp.headers.get('X-Total-Count') || '0';
                    return {result: resp.body || [], total: parseInt(totalStr, 10)};
                }),
                catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConceptsWithCharacteristics()', {result: [], total: 0})),
            );
    }        

    deleteConcept(conceptId: string): Observable<boolean> {
        return this.http
            .delete<boolean>(environment.deviceRepoUrl + '/concepts/' + conceptId )
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'deleteConcept', false)));
    }

    getConcepts(
        query: string,
        limit: number,
        offset: number,
        sortBy: string,
        sortDirection: string,
    ): Observable<{result: DeviceTypeConceptModel[]; total: number}> {
        if (sortDirection === '' || sortDirection === null || sortDirection === undefined) {
            sortDirection = 'asc';
        }
        if (sortBy === '' || sortBy === null || sortBy === undefined) {
            sortBy = 'name';
        }
        const params = ['limit=' + limit, 'offset=' + offset, 'sort=' + sortBy + '.' + sortDirection];
        if (query) {
            params.push('search=' + encodeURIComponent(query));
        }

        return this.http
            .get<DeviceTypeConceptModel[]>(environment.deviceRepoUrl + '/v2/concepts?' + params.join('&'), { observe: 'response'}).pipe(
                map(resp => {
                    const totalStr = resp.headers.get('X-Total-Count') || '0';
                    return {result: resp.body || [], total: parseInt(totalStr, 10)};
                }),
                catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConcepts(search)', {result: [], total: 0})),
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
