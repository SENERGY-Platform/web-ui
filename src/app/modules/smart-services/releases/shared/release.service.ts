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
import { catchError, map } from 'rxjs/internal/operators';
import { Observable } from 'rxjs';
import {SmartServiceReleaseCreateModel, SmartServiceReleaseModel, SmartServiceExtendedReleaseModel} from './release.model';

@Injectable({
    providedIn: 'root',
})
export class SmartServiceReleasesService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {}


    getExtendedReleaseList(limit: number, offset: number, search: string, latest: boolean) : Observable<SmartServiceExtendedReleaseModel[]> {
        const params = ['limit=' + limit, 'offset=' + offset];
        if (search != "") {
            params.push('search=' + encodeURIComponent(search));
        }
        if(latest) {
            params.push("latest=true");
        }
        const paramsStr = params.join('&');
        return this.http
            .get<SmartServiceExtendedReleaseModel[]>(environment.smartServiceRepoUrl + '/extended-releases?'+paramsStr)
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(SmartServiceReleasesService.name, 'getReleaseList()', []))
            );
    }

    getReleaseList(limit: number, offset: number, search: string, latest: boolean) : Observable<SmartServiceReleaseModel[]> {
        const params = ['limit=' + limit, 'offset=' + offset];
        if (search != "") {
            params.push('search=' + encodeURIComponent(search));
        }
        if(latest) {
            params.push("latest=true");
        }
        const paramsStr = params.join('&');
        return this.http
            .get<SmartServiceExtendedReleaseModel[]>(environment.smartServiceRepoUrl + '/releases?'+paramsStr)
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(SmartServiceReleasesService.name, 'getReleaseList()', []))
            );
    }

    getRelease(id: string): Observable<SmartServiceReleaseModel | null> {
        return this.http
            .get<SmartServiceReleaseModel>(environment.smartServiceRepoUrl + '/releases/' + id)
            .pipe(catchError(this.errorHandlerService.handleError(SmartServiceReleasesService.name, 'getProcessModel()', null)));
    }

    deleteRelease(id: string): Observable<{ status: number }> {
        return this.http.delete<HttpResponseBase>(environment.smartServiceRepoUrl + '/releases/' + id, { observe: 'response' }).pipe(
            map((resp) => ({ status: resp.status })),
            catchError(this.errorHandlerService.handleError(SmartServiceReleasesService.name, 'deleteProcess', { status: 500 })),
        );
    }

    createRelease(model: SmartServiceReleaseCreateModel): Observable<SmartServiceReleaseCreateModel | null> {
        return this.http
            .post<SmartServiceReleaseModel>(environment.smartServiceRepoUrl+"/releases", model)
            .pipe(catchError(this.errorHandlerService.handleError(SmartServiceReleasesService.name, 'saveProcess', null)));
    }

}
