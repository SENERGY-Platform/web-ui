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
import { HttpClient } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { LocationModel } from './locations.model';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class LocationsService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private snackBar: MatSnackBar) {}

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
            .delete<boolean>(environment.deviceManagerUrl + '/locations/' + encodeURIComponent(id))
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
            .post<LocationModel>(environment.deviceManagerUrl + '/locations', location)
            .pipe(catchError(this.errorHandlerService.handleError(LocationsService.name, 'createLocation', null)));
    }

    updateLocation(location: LocationModel): Observable<LocationModel | null> {
        return this.http
            .put<LocationModel>(environment.deviceManagerUrl + '/locations/' + encodeURIComponent(location.id), location)
            .pipe(catchError(this.errorHandlerService.handleError(LocationsService.name, 'updateLocation', null)));
    }

    getTotalCountOfLocations(): Observable<any> {
        return this.http
        .get(environment.permissionSearchUrl + '/v3/total/locations')
        .pipe(
            catchError(
                this.errorHandlerService.handleError(
                    LocationsService.name,
                    'getTotalCountOfLocations',
                ),
            ),
        );
    }
}
