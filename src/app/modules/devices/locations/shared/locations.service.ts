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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { LocationModel } from './locations.model';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { AllowedMethods, PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

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
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.deviceManagerUrl);
    }

    searchLocations(searchText: string, limit: number, offset: number, sortBy: string, sortDirection: string): Observable<LocationModel[]> {
        if (sortDirection === '' || sortDirection === null || sortDirection === undefined) {
            sortDirection = 'asc';
        }
        if (sortBy === '' || sortBy === null || sortBy === undefined) {
            sortBy = 'name';
        }
        const params = [
            'limit=' + limit,
            'offset=' + offset,
            'rights=r',
            'sort=' + sortBy + '.' + sortDirection,
            'search=' + encodeURIComponent(searchText),
        ].join('&');

        return this.http.get<LocationModel[]>(environment.permissionSearchUrl + '/v3/resources/locations?' + params).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(LocationsService.name, 'getLocations(search)', [])),
        );
    }

    listLocations(limit: number, offset: number, sortBy: string, sortDirection: string): Observable<LocationModel[]> {
        if (sortDirection === '' || sortDirection === null || sortDirection === undefined) {
            sortDirection = 'asc';
        }
        if (sortBy === '' || sortBy === null || sortBy === undefined) {
            sortBy = 'name';
        }
        const params = ['limit=' + limit, 'offset=' + offset, 'rights=r', 'sort=' + sortBy + '.' + sortDirection].join('&');

        return this.http.get<LocationModel[]>(environment.permissionSearchUrl + '/v3/resources/locations?' + params).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(LocationsService.name, 'getLocations(search)', [])),
        );
    }

    deleteLocation(id: string) {
        return this.http
            .delete<boolean>(environment.deviceManagerUrl + '/locations/' + encodeURIComponent(id)+"?wait=true")
            .pipe(catchError(this.errorHandlerService.handleError(LocationsService.name, 'deleteLocation', false)));
    }

    getLocation(id: string): Observable<LocationModel | null> {
        return this.http.get<LocationModel>(environment.deviceManagerUrl + '/locations/' + encodeURIComponent(id)).pipe(
            map((resp) => resp),
            catchError(this.errorHandlerService.handleError(LocationsService.name, 'getLocation(id)', null)),
        );
    }

    createLocation(location: LocationModel): Observable<LocationModel | null> {
        return this.http
            .post<LocationModel>(environment.deviceManagerUrl + '/locations?wait=true', location)
            .pipe(catchError(this.errorHandlerService.handleError(LocationsService.name, 'createLocation', null)));
    }

    updateLocation(location: LocationModel): Observable<LocationModel | null> {
        return this.http
            .put<LocationModel>(environment.deviceManagerUrl + '/locations/' + encodeURIComponent(location.id)+"?wait=true", location)
            .pipe(catchError(this.errorHandlerService.handleError(LocationsService.name, 'updateLocation', null)));
    }

    getTotalCountOfLocations(searchText: string): Observable<any> {
        const options = searchText ?
            { params: new HttpParams().set('search', searchText) } : {};

        return this.http
            .get(environment.permissionSearchUrl + '/v3/total/locations', options)
            .pipe(
                catchError(
                    this.errorHandlerService.handleError(
                        LocationsService.name,
                        'getTotalCountOfLocations',
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
