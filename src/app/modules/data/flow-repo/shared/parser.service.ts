/*
 * Copyright 2020 InfAI (CC SES)
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
import {ParseModel} from './parse.model';

@Injectable({
    providedIn: 'root'
})
export class ParserService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    getInputs(id: string): Observable<ParseModel[]> {
        return this.http.get<ParseModel[]>
        (environment.flowParserUrl + '/flow/getinputs/' + id ).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(ParserService.name, 'getInputs: Error', []))
        );
    }
}
