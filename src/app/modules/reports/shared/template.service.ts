/*
 * Copyright 2024 InfAI (CC SES)
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
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { environment } from '../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {TemplateListResponseModel, TemplateResponseModel} from './template.model';

@Injectable({
    providedIn: 'root',
})
export class TemplateService {

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
    ) {}

    getTemplates(): Observable<TemplateListResponseModel | null> {
        return this.http.get<TemplateListResponseModel>(environment.reportEngineUrl + '/templates')
            .pipe(
                map((resp: TemplateListResponseModel) => resp || []),
                catchError(this.errorHandlerService.handleError(TemplateService.name, 'getTemplates: Error', null)),
            );
    }

    getTemplate(id: string): Observable<TemplateResponseModel | null> {
        return this.http.get<TemplateResponseModel>(environment.reportEngineUrl + '/templates/'+id)
            .pipe(
                map((resp: TemplateResponseModel) => resp || []),
                catchError(this.errorHandlerService.handleError(TemplateService.name, 'getTemplate: Error', null)),
            );
    }
}
