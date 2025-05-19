/*
 *
 *     Copyright 2018 InfAI (CC SES)
 *
 *     Licensed under the Apache License, Version 2.0 (the “License”);
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an “AS IS” BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import { HttpClient } from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { environment } from 'src/environments/environment';
import {DocInfo, SwaggerModel} from './swagger.model';

@Injectable({
    providedIn: 'root',
})
export class SwaggerService {
    public baseUrl: string = environment.swaggerUrl;
    authorizationsSwagger: PermissionTestResponse;
    authorizationsAsyncAPI: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private ladonService: LadonService
    ) {
        // Load in constructor to only load permissions once and not for each request as services are singletons in root
        this.authorizationsSwagger = this.ladonService.getUserAuthorizationsForURI(environment.swaggerUrl + '/storage/swagger');
        this.authorizationsAsyncAPI = this.ladonService.getUserAuthorizationsForURI(environment.swaggerUrl + '/storage/asyncapi');
    }

    public getSwagger(): Observable<DocInfo[]> {
         return this.http.get<DocInfo[]>(this.baseUrl + '/storage/swagger');
    }

    public getAsync(): Observable<DocInfo[]> {
        return this.http.get<DocInfo[]>(this.baseUrl + '/storage/asyncapi');
    }


    public getSingleSwagger(id: string): Observable<SwaggerModel> {
       return this.http.get<SwaggerModel>(this.baseUrl + '/docs/swagger/' + id);
    }

    public getSingleAsync(id: string): Observable<any> {
        return this.http.get(this.baseUrl + '/docs/asyncapi/' + id);
    }

    

    userHasReadAuthorization(): boolean {
        return this.authorizationsSwagger['GET'] || this.authorizationsAsyncAPI['GET'];
    }
}
