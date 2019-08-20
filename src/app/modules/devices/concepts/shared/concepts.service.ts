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
import {catchError} from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ConceptsService {

    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService) {
    }

    createConcept(concept: DeviceTypeConceptModel): Observable<DeviceTypeConceptModel | null> {
        return this.http.post<DeviceTypeConceptModel>(environment.deviceManagerUrl + '/concept', concept).pipe(
            catchError(this.errorHandlerService.handleError(ConceptsService.name, 'createConcept', null))
        );
    }

}
