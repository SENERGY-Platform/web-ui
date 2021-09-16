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
import { HttpClient } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { DeviceTypeConceptModel } from '../../device-types-overview/shared/device-type.model';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { ConceptsPermSearchModel } from './concepts-perm-search.model';
import { ConceptsCharacteristicsModel } from './concepts-characteristics.model';
import { forkJoin } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ConceptsService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {}

    createConcept(concept: DeviceTypeConceptModel): Observable<DeviceTypeConceptModel | null> {
        return this.http
            .post<DeviceTypeConceptModel>(environment.deviceManagerUrl + '/concepts', concept)
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'createConcept', null)));
    }

    updateConcept(concept: DeviceTypeConceptModel): Observable<DeviceTypeConceptModel | null> {
        return this.http
            .put<DeviceTypeConceptModel>(environment.deviceManagerUrl + '/concepts/' + concept.id, concept)
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'createConcept', null)));
    }

    getConceptWithoutCharacteristics(conceptId: string): Observable<DeviceTypeConceptModel | null> {
        return this.http
            .get<DeviceTypeConceptModel>(environment.semanticRepoUrl + '/concepts/' + conceptId + '?sub-class=false')
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConcept', null)));
    }

    getConceptWithCharacteristics(conceptId: string): Observable<ConceptsCharacteristicsModel | null> {
        return this.http
            .get<ConceptsCharacteristicsModel>(environment.semanticRepoUrl + '/concepts/' + conceptId + '?sub-class=true')
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConcept', null)));
    }

    getConceptsWithCharacteristics(): Observable<ConceptsCharacteristicsModel[]> {
        const list: ConceptsCharacteristicsModel[] = [];
        return new Observable<ConceptsCharacteristicsModel[]>((obs) => {
            this.getConcepts('', 9999, 0, 'name', 'asc').subscribe((concepts) => {
                const observables: Observable<ConceptsCharacteristicsModel | null>[] = [];
                concepts.forEach((permConcept) =>
                    observables.push(
                        this.getConceptWithCharacteristics(permConcept.id).pipe(
                            map((concept) => {
                                if (concept !== null) {
                                    list.push(concept);
                                }
                                return concept;
                            }),
                        ),
                    ),
                );
                forkJoin(observables).subscribe((_) => {
                    obs.next(list);
                    obs.complete();
                });
            });
        });
    }

    deleteConcept(conceptId: string): Observable<boolean> {
        return this.http
            .delete<boolean>(environment.deviceManagerUrl + '/concepts/' + conceptId)
            .pipe(catchError(this.errorHandlerService.handleError(ConceptsService.name, 'deleteConcept', false)));
    }

    getConcepts(
        query: string,
        limit: number,
        offset: number,
        sortBy: string,
        sortDirection: string,
    ): Observable<ConceptsPermSearchModel[]> {
        if (sortDirection === '' || sortDirection === null || sortDirection === undefined) {
            sortDirection = 'asc';
        }
        if (sortBy === '' || sortBy === null || sortBy === undefined) {
            sortBy = 'name';
        }
        const params = ['limit=' + limit, 'offset=' + offset, 'rights=r', 'sort=' + sortBy + '.' + sortDirection];
        if (query) {
            params.push('search=' + encodeURIComponent(query));
        }

        return this.http
            .get<ConceptsPermSearchModel[]>(environment.permissionSearchUrl + '/v3/resources/concepts?' + params.join('&'))
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(ConceptsService.name, 'getConcepts(search)', [])),
            );
    }
}
