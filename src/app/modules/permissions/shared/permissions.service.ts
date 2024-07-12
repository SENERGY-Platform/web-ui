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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { PermissionsResourceBaseModel, PermissionsResourceModel, PermissionsV2ResourceBaseModel, PermissionsV2ResourceModel} from './permissions-resource.model';
import { PermissionsGroupModel, PermissionsUserModel } from './permissions-user.model';
import { PermissionsRightsModel } from './permissions-rights.model';

@Injectable({
    providedIn: 'root',
})
export class PermissionsService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {}

    static rightObjToStr(right: PermissionsRightsModel): string {
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

    getResourcePermissions(kind: string, id: string): Observable<PermissionsResourceModel> {
        return this.http
            .get<PermissionsResourceModel>(
                environment.permissionSearchUrl + '/v3/administrate/rights/' + encodeURIComponent(kind) + '/' + encodeURIComponent(id),
            )
            .pipe(
                map((resp) => resp || {} as PermissionsResourceModel),
                catchError(
                    this.errorHandlerService.handleError(PermissionsService.name, 'getResourcePermissions', {} as PermissionsResourceModel),
                ),
            );
    }

    getResourcePermissionsV2(topicID: string, ressourceId: string): Observable<PermissionsV2ResourceModel> {
        return this.http
            .get<PermissionsV2ResourceModel>(
                environment.permissionV2Url + '/manage/' + encodeURIComponent(topicID) + '/' + encodeURIComponent(ressourceId),
            )
            .pipe(
                map((resp) => resp || {} as PermissionsV2ResourceModel),
                catchError(
                    this.errorHandlerService.handleError(PermissionsService.name, 'getResourcePermissionsV2', {} as PermissionsV2ResourceModel),
                ),
            );
    }

    getAllResourcePermissionsV2(topicID: string): Observable<PermissionsV2ResourceModel[]> {
        return this.http
            .get<PermissionsV2ResourceModel[]>(
                environment.permissionV2Url + '/manage/' + encodeURIComponent(topicID),
            )
            .pipe(
                map((resp) => resp || {} as PermissionsV2ResourceModel[]),
                catchError(
                    this.errorHandlerService.handleError(PermissionsService.name, 'getAllResourcePermissionsV2', []),
                ),
            );
    }

    //key is the kafka key this permission command will be published to. is optional
    setResourcePermissions(kind: string, id: string, rights: PermissionsResourceBaseModel, key?: string): Observable<boolean> {
        let query = '';
        if(key){
            query = '?key='+encodeURIComponent(key);
        }
        return this.http
            .put<PermissionsResourceBaseModel>(
                environment.permissionCommandUrl + '/v3/administrate/rights/' + encodeURIComponent(kind) + '/' + encodeURIComponent(id)+query,
                rights
            )
            .pipe(
                map((_) => true),
                catchError(
                    this.errorHandlerService.handleError(PermissionsService.name, 'getResourcePermissions', false),
                ),
            );
    }

    setResourcePermissionsV2(topicID: string, ressourceID: string, rights: PermissionsV2ResourceBaseModel): Observable<boolean> {
        return this.http
            .put<PermissionsResourceBaseModel>(
                environment.permissionV2Url + '/manage/' + encodeURIComponent(topicID) + '/' + encodeURIComponent(ressourceID),
                rights
            )
            .pipe(
                map((_) => true),
                catchError(
                    this.errorHandlerService.handleError(PermissionsService.name, 'setResourcePermissionsV2', false),
                ),
            );
    }

    getUserById(userId: string): Observable<PermissionsUserModel> {
        return this.http
            .get<PermissionsUserModel>(environment.usersServiceUrl + '/user/id/' + userId)
            .pipe(catchError(this.errorHandlerService.handleError(PermissionsService.name, 'getUserById', {} as PermissionsUserModel)));
    }

    getUserByName(userName: string): Observable<PermissionsUserModel | null> {
        return this.http
            .get<PermissionsUserModel>(environment.usersServiceUrl + '/user/name/' + userName)
            .pipe(catchError(this.errorHandlerService.handleError(PermissionsService.name, 'getUserByName', null)));
    }

    getRoles(): Observable<PermissionsGroupModel[]> {
        return this.http
            .get<PermissionsGroupModel[]>(environment.usersServiceUrl + '/roles')
            .pipe(catchError(this.errorHandlerService.handleError(PermissionsService.name, 'getRoles', [] as PermissionsGroupModel[])));
    }
}
