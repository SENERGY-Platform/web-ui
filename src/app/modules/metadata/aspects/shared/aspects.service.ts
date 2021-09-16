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
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { DeviceTypeAspectModel, DeviceTypeCharacteristicsModel } from '../../device-types-overview/shared/device-type.model';
import { AspectsPermSearchModel } from './aspects-perm-search.model';
import { LocationModel } from '../../../devices/locations/shared/locations.model';

@Injectable({
    providedIn: 'root',
})
export class AspectsService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {}

    getAspects(query: string, limit: number, offset: number, sortBy: string, sortDirection: string): Observable<AspectsPermSearchModel[]> {
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

        return this.http.get<AspectsPermSearchModel[]>(environment.permissionSearchUrl + '/v3/resources/aspects?' + params.join('&')).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(AspectsService.name, 'getAspects(search)', [])),
        );
    }

    updateAspects(aspect: DeviceTypeAspectModel): Observable<DeviceTypeAspectModel | null> {
        return this.http
            .put<DeviceTypeAspectModel>(environment.deviceManagerUrl + '/aspects/' + aspect.id, aspect)
            .pipe(catchError(this.errorHandlerService.handleError(AspectsService.name, 'updateAspects', null)));
    }

    deleteAspects(aspectId: string): Observable<boolean> {
        return this.http
            .delete<boolean>(environment.deviceManagerUrl + '/aspects/' + aspectId)
            .pipe(catchError(this.errorHandlerService.handleError(AspectsService.name, 'deleteAspects', false)));
    }

    createAspect(aspect: DeviceTypeAspectModel): Observable<DeviceTypeAspectModel | null> {
        return this.http
            .post<DeviceTypeAspectModel>(environment.deviceManagerUrl + '/aspects', aspect)
            .pipe(catchError(this.errorHandlerService.handleError(AspectsService.name, 'createAspect', null)));
    }
}
