/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {DeviceTypeConceptModel, DeviceTypeModel} from '../../device-types-overview/shared/device-type.model';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {ProcessModel} from '../../../processes/process-repo/shared/process.model';
import {ProcessRepoConditionsModel} from '../../../processes/process-repo/shared/process-repo-conditions.model';
import {ConceptsPermSearchModel} from './concepts-perm-search.model';
import {ConceptsCharacteristicsModel} from './concepts-characteristics.model';

@Injectable({
    providedIn: 'root'
})
export class ConceptsService {

    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService) {
    }

    createConcept(concept: DeviceTypeConceptModel): Observable<DeviceTypeConceptModel | null> {
        return this.http.post<DeviceTypeConceptModel>(environment.deviceManagerUrl + '/concepts', concept).pipe(
            catchError(this.errorHandlerService.handleError(ConceptsService.name, 'createConcept', null))
        );
    }

    updateConcept(concept: DeviceTypeConceptModel): Observable<DeviceTypeConceptModel | null> {
        return this.http.put<DeviceTypeConceptModel>(environment.deviceManagerUrl + '/concepts/' + concept.id, concept).pipe(
            catchError(this.errorHandlerService.handleError(ConceptsService.name, 'createConcept', null))
        );
    }

    getConceptWithoutCharacteristics(conceptId: string): Observable<DeviceTypeConceptModel | null> {
        return this.http.get<DeviceTypeConceptModel>(environment.semanticRepoUrl + '/concepts/' + conceptId + '?sub-class=false').pipe(
            catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConcept', null))
        );
    }

    getConceptWithCharacteristics(conceptId: string): Observable<ConceptsCharacteristicsModel | null> {
        return this.http.get<ConceptsCharacteristicsModel>(environment.semanticRepoUrl + '/concepts/' + conceptId + '?sub-class=true').pipe(
            catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConcept', null))
        );
    }

    deleteConcept(conceptId: string): Observable<boolean> {
        return this.http.delete<boolean>(environment.deviceManagerUrl + '/concepts/' + conceptId).pipe(
            catchError(this.errorHandlerService.handleError(ConceptsService.name, 'deleteConcept', false))
        );
    }

    getConcepts(query: string, limit: number, offset: number, feature: string, order: string): Observable<ConceptsPermSearchModel[]> {
        if (query) {
            return this.http.get<ConceptsPermSearchModel[]>(environment.permissionSearchUrl + '/jwt/search/concepts/' +
                encodeURIComponent(query) + '/r/' + limit + '/' + offset + '/' + feature + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConcepts(search)', []))
            );
        } else {
            return this.http.get<ConceptsPermSearchModel[]>(environment.permissionSearchUrl + '/jwt/list/concepts/r/' +
                limit + '/' + offset + '/' + feature + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConcepts(list)', []))
            );
        }
    }

}
