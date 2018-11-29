/*
 * Copyright 2018 InfAI (CC SES)
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
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/internal/operators';
import {Observable} from 'rxjs';
import {PipelineModel} from './pipeline.model';

@Injectable({
    providedIn: 'root'
})

export class PipelineRegistryService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    getPipelines(): Observable<PipelineModel[]> {
        return this.http.get<PipelineModel[]>
        (environment.pipelineRegistryUrl + '/pipeline').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(PipelineRegistryService.name, 'getPipelines: Error', []))
        );

    }
}
