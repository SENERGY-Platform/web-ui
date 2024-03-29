/*
 * Copyright 2023 InfAI (CC SES)
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
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import {environment} from 'src/environments/environment';
import { Observable, catchError, map } from 'rxjs';
import { BillingInformationModel } from './billing.model';


@Injectable({
    providedIn: 'root',
})
export class BillingService {
    authorizations: PermissionTestResponse;

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private ladonService: LadonService) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.billingApiUrl + '/billing-components');
    }

    userHasDeleteAuthorization(): boolean {
        return this.authorizations['DELETE'];
    }

    userHasUpdateAuthorization(): boolean {
        return this.authorizations['POST'];
    }

    userHasCreateAuthorization(): boolean {
        return this.authorizations['POST'];
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations['GET'];
    }

    getAvailable(userId: string | undefined = undefined): Observable<Date[]> {
        let url = environment.billingApiUrl+'/billing-components';
        if (userId !== undefined) {
            url += '?for_user=' + userId;
        }
        return this.http.get<string[]>(url).pipe(
            catchError(
                this.errorHandlerService.handleError(BillingService.name, 'getAvailable: Error', []),
            ),
            map((resp) => resp.map(x => new Date(x))),
        );
    }

    getForMonth(year: number, month: number, userId: string | undefined = undefined): Observable<BillingInformationModel[]> {
        let url = environment.billingApiUrl+'/billing-components/'+year+'/'+month;
        if (userId !== undefined) {
            url += '?for_user=' + userId;
        }
        return this.http.get<BillingInformationModel[]>(url).pipe(
            catchError(
                this.errorHandlerService.handleError(BillingService.name, 'getForMonth: Error', []),
            ),
            map(res => {
                res.forEach(r => {
                    r.created_at = new Date(r.created_at);
                    r.from = new Date(r.from);
                    r.to = new Date(r.to);
                });
                return res;
            })
        );
    }
}
