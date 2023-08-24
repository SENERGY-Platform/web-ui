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
import { HttpClient, HttpResponseBase } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {SmartServiceDesignModel} from './design.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { AllowedMethods, PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

@Injectable({
    providedIn: 'root',
})
export class SmartServiceDesignsService {
    authorizations: PermissionTestResponse

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private ladonService: LadonService) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.smartServiceRepoUrl)
    }

    getDesignList(limit: number, offset: number, search: string): Observable<SmartServiceDesignModel[]> {
        const params = ['limit=' + limit, 'offset=' + offset];
        if (search !== '') {
            params.push('search=' + encodeURIComponent(search));
        }
        const paramsStr = params.join('&');
        return this.http
            .get<SmartServiceDesignModel[]>(environment.smartServiceRepoUrl + '/designs?'+paramsStr)
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(SmartServiceDesignsService.name, 'getDesignList()', []))
            );
    }

    getDesign(id: string): Observable<SmartServiceDesignModel | null> {
        return this.http
            .get<SmartServiceDesignModel>(environment.smartServiceRepoUrl + '/designs/' + id)
            .pipe(catchError(this.errorHandlerService.handleError(SmartServiceDesignsService.name, 'getProcessModel()', null)));
    }

    deleteDesign(id: string): Observable<{ status: number }> {
        return this.http.delete<HttpResponseBase>(environment.smartServiceRepoUrl + '/designs/' + id, { observe: 'response' }).pipe(
            map((resp) => ({ status: resp.status })),
            catchError(this.errorHandlerService.handleError(SmartServiceDesignsService.name, 'deleteProcess', { status: 500 })),
        );
    }

    saveDesign(model: SmartServiceDesignModel): Observable<SmartServiceDesignModel | null> {
        const id = model.id;
        if (id === '') {
            return this.http
                .post<SmartServiceDesignModel>(environment.smartServiceRepoUrl+'/designs', model)
                .pipe(catchError(this.errorHandlerService.handleError(SmartServiceDesignsService.name, 'saveProcess', null)));
        } else {
            return this.http
                .put<SmartServiceDesignModel>(environment.smartServiceRepoUrl + '/designs/' + id, model)
                .pipe(catchError(this.errorHandlerService.handleError(SmartServiceDesignsService.name, 'updateProcess', null)));
        }
    }


    userHasDeleteAuthorization(): boolean {
        return this.authorizations["DELETE"]      
    }

    userHasUpdateAuthorization(): boolean {
        return this.authorizations["PUT"]      
    }

    userHasCreateAuthorization(): boolean {
        return this.authorizations["POST"]   
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations["GET"]   
    }
}
