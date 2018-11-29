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
import {environment} from '../../../../environments/environment';
import {PermissionsProcessModel} from './permissions-process.model';
import {Observable} from 'rxjs';
import {catchError, map} from 'rxjs/internal/operators';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';

@Injectable({
    providedIn: 'root'
})
export class PermissionsService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    list(kind: string, right: string) {
        return this.http.get<object[]>(environment.permissionSearchUrl + '/jwt/list/' + kind + '/' + right).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(PermissionsService.name, 'list', []))
        );
    }

    getProcessModels(query: string, limit: number, offset: number, feature: string, order: string): Observable<PermissionsProcessModel[]> {
        if (query) {
            return this.http.get<PermissionsProcessModel[]>(environment.permissionSearchUrl + '/jwt/search/processmodel/' +
                encodeURIComponent(query) + '/r/' + limit + '/' + offset + '/' + feature + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(PermissionsService.name, 'getProcessModels1', []))
            );
        } else {
            return this.http.get<PermissionsProcessModel[]>(environment.permissionSearchUrl + '/jwt/list/processmodel/r/' +
                limit + '/' + offset + '/' + feature + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(PermissionsService.name, 'getProcessModels2', []))
            );
        }
    }
}
