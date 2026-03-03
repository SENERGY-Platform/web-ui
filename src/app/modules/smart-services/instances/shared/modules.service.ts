/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { catchError, map, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import {SmartServiceModuleModel} from './modules.model';

@Injectable({
    providedIn: 'root',
})
export class SmartServiceModuleService {

    authorizations: PermissionTestResponse;

    constructor(private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService,
    ) { 
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.deviceRepoUrl + '/devices');
    }

    getModules(options: { limit?: number; offset?: number; type?: string}): Observable<SmartServiceModuleModel[]> {
        let params = new HttpParams();
        if (options.limit) {
            params = params.set('limit', options.limit);
        }
        if (options.offset) {
            params = params.set('offset', options.offset);
        }
        if (options.type) {
            params = params.set('module_type', options.type);
        }
        return this.http.get<SmartServiceModuleModel[] | null>(environment.smartServiceRepoUrl+'/modules', {params, observe: 'response'}).pipe(
           map((resp) => (resp.body || [] )),
            catchError(this.errorHandlerService.handleError(SmartServiceModuleService.name, 'getModules()',  []))
        );
    }
    userHasDeleteAuthorization(): boolean {
        return this.authorizations['DELETE'];
    }

    userHasUpdateAuthorization(): boolean {
        return this.authorizations['PUT'];
    }

    userHasCreateAuthorization(): boolean {
        return this.authorizations['POST'];
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations['GET'];
    }

}