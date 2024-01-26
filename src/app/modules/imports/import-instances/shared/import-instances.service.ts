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
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Observable, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ImportInstancesModel } from './import-instances.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

@Injectable({
    providedIn: 'root',
})
export class ImportInstancesService {
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private ladonService: LadonService
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.importDeployUrl);
    }

    listImportInstances(
        search: string,
        limit: number | undefined,
        offset: number | undefined,
        sort: string,
        excludeGenerated: boolean = false,
        forUser: string | undefined = undefined,
    ): Observable<ImportInstancesModel[]> {
        let url = environment.importDeployUrl + '/instances?';
        if (search.length > 0) {
            url += '&search=' + search;
        }
        if (limit !== undefined) {
            url += '&limit=' + limit;
        }
        if (offset !== undefined) {
            url += '&offset=' + offset;
        }
        if (sort.length > 0) {
            url += '&sort=' + sort;
        }
        if (excludeGenerated) {
            url += '&exclude_generated=true';
        }
        if (forUser !== undefined) {
            url += '&for_user=' + forUser;
        }
        return this.http.get<ImportInstancesModel[]>(url).pipe(map((types) => types || []));
    }

    deleteImportInstance(id: string): Observable<void> {
        return this.http.delete<void>(environment.importDeployUrl + '/instances/' + id);
    }

    saveImportInstance(importInstance: ImportInstancesModel): Observable<ImportInstancesModel> {
        if (importInstance.id !== undefined && importInstance.id.length > 0) {
            return this.http.put<ImportInstancesModel>(environment.importDeployUrl + '/instances/' + importInstance.id, importInstance);
        } else {
            return this.http.post<ImportInstancesModel>(environment.importDeployUrl + '/instances', importInstance);
        }
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

    getTotalCountOfInstances(searchText: string, excludeGenerated: boolean): Observable<any> {
        const options = {params: {}};
        let params = new HttpParams().set('exclude_generated', excludeGenerated);
        if(searchText) {
            params = params.set('search', searchText);
        }
        options['params'] = params;
        return this.http
            .get(environment.importDeployUrl + '/total/instances', options);
    }
}
