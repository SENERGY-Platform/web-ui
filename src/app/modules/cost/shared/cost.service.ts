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
import { CostEstimationModel, CostModel } from './cost.model';


@Injectable({
    providedIn: 'root',
})
export class CostService {
    authorizations: PermissionTestResponse;
    estimationFlowAuthorizations: PermissionTestResponse;

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private ladonService: LadonService) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.costApiUrl);
        this.estimationFlowAuthorizations = this.ladonService.getUserAuthorizationsForURI(environment.costApiUrl + '/estimation/flow');
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

    getTree(): Observable<Map<string, CostModel>> {
        return this.http.get<Map<string, CostModel>>(environment.costApiUrl+'/tree').pipe(
            catchError(
                this.errorHandlerService.handleError(CostService.name, 'getTree: Error', new Map()),
            ),
            map((resp) => resp || new Map()),
        );
    }


    userMayGetFlowCostEstimations(): boolean {
        return this.estimationFlowAuthorizations['POST'];
    }
    getFlowCostEstimations(flowIds: string[]): Observable<CostEstimationModel[]> {
        return this.http.post<CostEstimationModel[]>(environment.costApiUrl+'/estimation/flow', flowIds).pipe(
            catchError(
                this.errorHandlerService.handleError(CostService.name, 'getFlowCostEstimations: Error', []),
            )
        );
    }
}
