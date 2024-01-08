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
import { DeviceTypeCharacteristicsModel } from '../../device-types-overview/shared/device-type.model';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { CharacteristicsPermSearchModel } from './characteristics-perm-search.model';
import { AllowedMethods, PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class CharacteristicsService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        const characteristicPermSearchURL = environment.permissionSearchUrl + '/v3/resources/characteristics';
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(characteristicPermSearchURL);
    }

    createCharacteristic(
        characteristic: DeviceTypeCharacteristicsModel,
    ): Observable<DeviceTypeCharacteristicsModel | null> {
        return this.http
            .post<DeviceTypeCharacteristicsModel>(
                environment.deviceManagerUrl + '/characteristics',
                characteristic,
            )
            .pipe(catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'createCharacteristic', null)));
    }

    updateConcept(characteristics: DeviceTypeCharacteristicsModel): Observable<DeviceTypeCharacteristicsModel | null> {
        return this.http
            .put<DeviceTypeCharacteristicsModel>(
                environment.deviceManagerUrl + '/characteristics/' + characteristics.id,
                characteristics,
            )
            .pipe(catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'updateConcept', null)));
    }

    deleteCharacteristic(characteristicsId: string): Observable<boolean> {
        return this.http
            .delete<boolean>(environment.deviceManagerUrl + '/characteristics/' + characteristicsId)
            .pipe(catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'deleteCharacteristic', false)));
    }

    getCharacteristic(characteristicsId: string): Observable<DeviceTypeCharacteristicsModel> {
        return this.http
            .get<DeviceTypeCharacteristicsModel>(environment.deviceRepoUrl + '/characteristics/' + characteristicsId)
            .pipe(
                catchError(
                    this.errorHandlerService.handleError(
                        CharacteristicsService.name,
                        'getCharacteristic',
                        {} as DeviceTypeCharacteristicsModel,
                    ),
                ),
            );
    }

    getCharacteristics(
        query: string,
        limit: number,
        offset: number,
        sortBy: string,
        sortDirection: string,
        ids: string[] = [],
    ): Observable<CharacteristicsPermSearchModel[]> {
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
        if (ids.length > 0) {
            params.push('ids=' + ids.join(','));
        }

        return this.http
            .get<CharacteristicsPermSearchModel[]>(environment.permissionSearchUrl + '/v3/resources/characteristics?' + params.join('&'))
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(CharacteristicsService.name, 'getCharacteristics(search)', [])),
            );
    }

    getTotalCountOfCharacteristics(searchText: string): Observable<any> {
        const options = searchText ?
            { params: new HttpParams().set('search', searchText) } : {};

        return this.http
            .get(environment.permissionSearchUrl + '/v3/total/characteristics', options)
            .pipe(
                catchError(
                    this.errorHandlerService.handleError(
                        CharacteristicsService.name,
                        'getTotalCountOfCharacteristics',
                    ),
                ),
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
