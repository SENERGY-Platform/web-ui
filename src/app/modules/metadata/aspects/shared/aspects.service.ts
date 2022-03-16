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

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError} from 'rxjs/operators';
import {DeviceTypeAspectModel} from '../../device-types-overview/shared/device-type.model';

@Injectable({
    providedIn: 'root',
})
export class AspectsService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {}

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
