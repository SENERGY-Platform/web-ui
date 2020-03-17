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
import {environment} from '../../../../environments/environment';
import {Observable} from 'rxjs';
import {catchError, map} from 'rxjs/internal/operators';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {PermissionsResourceModel} from './permissions-resource.model';
import {PermissionsUserModel} from './permissions-user.model';
import {PermissionsRightsModel} from './permissions-rights.model';
import {PermissionsResponseModel} from './permissions-response.model';

@Injectable({
    providedIn: 'root'
})
export class PermissionsService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    getResourcePermissions(kind: string, id: string): Observable<PermissionsResourceModel> {
        return this.http.get<PermissionsResourceModel>(environment.permissionSearchUrl + '/administrate/rights/' +
            encodeURIComponent(kind) + '/get/' + encodeURIComponent(id)).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(PermissionsService.name, 'getResourcePermissions', {} as PermissionsResourceModel))
        );

    }

    getUserById(userId: string): Observable<PermissionsUserModel> {
        return this.http.get<PermissionsUserModel>(environment.usersServiceUrl + '/user/id/' + userId).pipe(
            catchError(this.errorHandlerService.handleError(PermissionsService.name, 'getUserById', {} as PermissionsUserModel))
        );
    }

    getUserByName(userName: string): Observable<PermissionsUserModel | undefined> {
        return this.http.get<PermissionsUserModel>(environment.usersServiceUrl + '/user/name/' + userName).pipe(
            catchError(this.errorHandlerService.handleError(PermissionsService.name, 'getUserByName', undefined)));
    }

    removeUserRight(user: string, kind: string, resourceId: string): Observable<PermissionsResponseModel> {
        return this.http.delete<PermissionsResponseModel>(environment.permissionCommandUrl + '/user/' + encodeURIComponent(user) +
            '/' + encodeURIComponent(kind) + '/' + encodeURIComponent(resourceId)).pipe(
            catchError(this.errorHandlerService.handleError(PermissionsService.name, 'removeUserRight', {status: 'Error removeUserRight!'}))
        );
    }

    setUserRight(user: string, kind: string, resourceId: string, rights: PermissionsRightsModel): Observable<PermissionsResponseModel> {
        return this.http.put<any>(environment.permissionCommandUrl + '/user/' + encodeURIComponent(user) + '/' +
            encodeURIComponent(kind) + '/' + encodeURIComponent(resourceId) + '/' + rightObjToStr(rights), {}).pipe(
            catchError(this.errorHandlerService.handleError(PermissionsService.name, 'setUserRight', {status: 'Error setUserRight!'}))
        );

        function rightObjToStr(right: PermissionsRightsModel): string {
            let result = '';
            if (right.read) {
                result += 'r';
            }
            if (right.write) {
                result += 'w';
            }
            if (right.execute) {
                result += 'x';
            }
            if (right.administrate) {
                result += 'a';
            }
            return result;
        }
    }

}
