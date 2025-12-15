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
import { HttpClient, HttpParams, HttpResponseBase } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { SmartServiceReleaseCreateModel, SmartServiceReleaseModel, SmartServiceExtendedReleaseModel } from './release.model';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class SmartServiceReleasesService {
    authorizations: PermissionTestResponse;

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private ladonService: LadonService) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.smartServiceRepoUrl);
    }

    getExtendedReleaseList(limit: number, offset: number, search: string, rights: string, latest: boolean): Observable<SmartServiceExtendedReleaseModel[]> {
        const params = ['limit=' + limit, 'offset=' + offset, 'rights='+rights];
        if (search !== '') {
            params.push('search=' + encodeURIComponent(search));
        }
        if(latest) {
            params.push('latest=true');
        }
        const paramsStr = params.join('&');
        return this.http
            .get<SmartServiceExtendedReleaseModel[]>(environment.smartServiceRepoUrl + '/extended-releases?'+paramsStr)
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(SmartServiceReleasesService.name, 'getExtendedReleaseList()', []))
            );
    }

    getReleaseList(limit: number, offset: number, search: string, rights: string, latest: boolean): Observable<SmartServiceReleaseModel[]> {
        const params = ['limit=' + limit, 'offset=' + offset, 'rights='+rights];
        if (search !== '') {
            params.push('search=' + encodeURIComponent(search));
        }
        if(latest) {
            params.push('latest=true');
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
            .pipe(catchError(this.errorHandlerService.handleError(SmartServiceReleasesService.name, 'getRelease()', null)));
    }

    getExtendedRelease(id: string): Observable<SmartServiceExtendedReleaseModel | null> {
        return this.http
            .get<SmartServiceExtendedReleaseModel>(environment.smartServiceRepoUrl + '/extended-releases/' + id)
            .pipe(catchError(this.errorHandlerService.handleError(SmartServiceReleasesService.name, 'getExtendedRelease()', null)));
    }

    deleteRelease(id: string, deletePreviousReleases?: boolean): Observable<{ status: number }> {
        let params = new HttpParams();
        if (deletePreviousReleases) {
            params = params.set('delete_previous_releases', 'true');
        }
        return this.http.delete<HttpResponseBase>(environment.smartServiceRepoUrl + '/releases/' + id, { observe: 'response', params }).pipe(
            map((resp) => ({ status: resp.status })),
            catchError(this.errorHandlerService.handleError(SmartServiceReleasesService.name, 'deleteProcess', { status: 500 })),
        );
    }

    createRelease(model: SmartServiceReleaseCreateModel): Observable<SmartServiceReleaseCreateModel | null> {
        return this.http
            .post<SmartServiceReleaseModel>(environment.smartServiceRepoUrl+'/releases', model)
            .pipe(catchError(this.errorHandlerService.handleError(SmartServiceReleasesService.name, 'saveProcess', null)));
    }

    userHasDeleteAuthorization(): boolean {
        return this.authorizations['DELETE'];
    }
}
