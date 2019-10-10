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
import {
    DeviceTypeCharacteristicsModel,
    DeviceTypeConceptModel,
} from '../../device-types-overview/shared/device-type.model';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {CharacteristicsPermSearchModel} from './characteristics-perm-search.model';

@Injectable({
    providedIn: 'root'
})
export class CharacteristicsService {

    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService) {
    }

    createCharacteristic(conceptId: string, characteristic: DeviceTypeCharacteristicsModel): Observable<DeviceTypeCharacteristicsModel | null> {
        return this.http.post<DeviceTypeCharacteristicsModel>(environment.deviceManagerUrl + '/concepts/' + conceptId + '/characteristics', characteristic).pipe(
            catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'createCharacteristic', null))
        );
    }

    updateConcept(conceptId: string, characteristics: DeviceTypeCharacteristicsModel): Observable<DeviceTypeCharacteristicsModel | null> {
        return this.http.put<DeviceTypeCharacteristicsModel>(environment.deviceManagerUrl + '/concepts/' + conceptId + '/characteristics/' + characteristics.id , characteristics).pipe(
            catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'updateConcept', null))
        );
    }

    deleteCharacteristic(conceptId: string, characteristicsId: string): Observable<boolean> {
        return this.http.delete<boolean>(environment.deviceManagerUrl + '/concepts/' + conceptId + '/characteristics/' + characteristicsId).pipe(
            catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'deleteCharacteristic', false))
        );
    }


    getCharacteristicByConceptId(conceptId: string, limit: number, offset: number, feature: string, order: string): Observable<CharacteristicsPermSearchModel[]> {
        return this.http.get<CharacteristicsPermSearchModel[]>(environment.permissionSearchUrl + '/jwt/select/characteristics/concept_id/' + conceptId + '/r/' +
            limit + '/' + offset + '/' + feature + '/' + order).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'getCharacteristicByConceptId', []))
        );
    }

    getCharacteristic(characteristicsId: string): Observable<CharacteristicsPermSearchModel[]> {
        return this.http.get<CharacteristicsPermSearchModel[]>(environment.semanticRepoUrl + '/characteristics/' + characteristicsId).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'getCharacteristic', []))
        );
    }

    getCharacteristics(query: string, limit: number, offset: number, feature: string, order: string): Observable<CharacteristicsPermSearchModel[]> {
        if (query) {
            return this.http.get<CharacteristicsPermSearchModel[]>(environment.permissionSearchUrl + '/jwt/search/characteristics/' +
                encodeURIComponent(query) + '/r/' + limit + '/' + offset + '/' + feature + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'getCharacteristics(search)', []))
            );
        } else {
            return this.http.get<CharacteristicsPermSearchModel[]>(environment.permissionSearchUrl + '/jwt/list/characteristics/r/' +
                limit + '/' + offset + '/' + feature + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'getCharacteristics(list)', []))
            );
        }
    }

}
