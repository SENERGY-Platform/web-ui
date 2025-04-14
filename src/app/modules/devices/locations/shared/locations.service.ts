/*
 * Copyright 2021 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
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
import { Observable } from 'rxjs';
import { LocationModel, LocationTotalModel } from './locations.model';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

@Injectable({
    providedIn: 'root',
})
export class LocationsService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.deviceRepoUrl + '/locations');
    }

    getLocations(options?: {limit?: number; offset?: number; search?: string; sortBy?: string; sortDirection?: string; ids?: string[]; permission?: string}): Observable<LocationTotalModel> {
        let params = new HttpParams();
        if(options?.limit !== undefined) {
            params = params.set('limit', options.limit.toString());
        }
        if(options?.offset !== undefined) {
            params = params.set('offset', options.offset.toString());
        }
        if(options?.search !== undefined) {
            params = params.set('search', options.search);
        }
        if(options?.sortBy !== undefined) {
            params = params.set('sort', options.sortBy + '.' + (options.sortDirection || 'desc'));
        }
        if(options?.ids !== undefined) {
            params = params.set('ids', options.ids.join(','));
        }
        if(options?.permission !== undefined) {
            params = params.set('p', options.permission);
        }

        return this.http.get<LocationModel[]>(environment.deviceRepoUrl + '/locations', {observe: 'response', params}).pipe(
            map((resp) => {
                const totalStr = resp.headers.get('X-Total-Count') || '0';
                return {
                    result: resp.body || [],
                    total: parseInt(totalStr, 10)
                } as LocationTotalModel;
            }),
            catchError(this.errorHandlerService.handleError(LocationsService.name, 'getLocations()', {result: [], total: 0})),
        );
    }

    deleteLocation(id: string) {
        return this.http
            .delete<boolean>(environment.deviceRepoUrl + '/locations/' + encodeURIComponent(id))
            .pipe(catchError(this.errorHandlerService.handleError(LocationsService.name, 'deleteLocation', false)));
    }

    getLocation(id: string): Observable<LocationModel | null> {
        return this.http.get<LocationModel>(environment.deviceRepoUrl + '/locations/' + encodeURIComponent(id)).pipe(
            map((resp) => resp),
            catchError(this.errorHandlerService.handleError(LocationsService.name, 'getLocation(id)', null)),
        );
    }

    createLocation(location: LocationModel): Observable<LocationModel | null> {
        return this.http
            .post<LocationModel>(environment.deviceRepoUrl + '/locations', location)
            .pipe(catchError(this.errorHandlerService.handleError(LocationsService.name, 'createLocation', null)));
    }

    updateLocation(location: LocationModel): Observable<LocationModel | null> {
        return this.http
            .put<LocationModel>(environment.deviceRepoUrl + '/locations/' + encodeURIComponent(location.id), location)
            .pipe(catchError(this.errorHandlerService.handleError(LocationsService.name, 'updateLocation', null)));
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
