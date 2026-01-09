/*
 * Copyright 2025 InfAI (CC SES)
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
import { SmartServiceInstanceModel } from './instances.model';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

@Injectable({
    providedIn: 'root',
})
export class SmartServiceInstanceService {

    authorizations: PermissionTestResponse;

    constructor(private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private ladonService: LadonService,
    ) { 
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.deviceRepoUrl + '/devices');
    }

    getInstances(options: { limit?: number; offset?: number; sort?: string; releaseId?: string}): Observable<{ instances: SmartServiceInstanceModel[], total: number }> {
        let params = new HttpParams();
        if (options.limit) {
            params = params.set('limit', options.limit);
        }
        if (options.offset) {
            params = params.set('offset', options.offset);
        }
        if (options.sort) {
            params = params.set('sort', options.sort);
        }
        if (options.releaseId) {
            params = params.set('release-id', options.releaseId);
        }
        return this.http.get<SmartServiceInstanceModel[] | null>(environment.smartServiceRepoUrl+'/instances', {params, observe: 'response'}).pipe(
           map((resp) => ({ instances: resp.body || [], total: parseInt(resp.headers.get('X-Total-Count') || '0', 10) })),
            catchError(this.errorHandlerService.handleError(SmartServiceInstanceService.name, 'getInstances()', { instances: [], total: 0 }))
        );
    }

    getAllInstances(): Observable<SmartServiceInstanceModel[]> {
        const instances: SmartServiceInstanceModel[] = [];
        return new Observable<SmartServiceInstanceModel[]>(o => {
            let offset = 0;
            const limit = 9999;
            const f = () => {
                this.getInstances({limit, offset}).subscribe(r => {
                    instances.push(...r.instances);
                    if (r.instances.length < r.total) {
                        o.next(instances);
                        o.complete();
                        return;
                    }
                    offset += r.instances.length;
                    f();
                });
            };
            f();
        });
    }

    deleteInstance(id: string, ignoreModuleDeleteErrors: boolean = false): Observable<void> {
        return this.http.delete<void>(environment.smartServiceRepoUrl+'/instances/' + id + '?ignore_module_delete_errors=' + ignoreModuleDeleteErrors).pipe(
            catchError(this.errorHandlerService.handleError(SmartServiceInstanceService.name, 'deleteInstance()', undefined))
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