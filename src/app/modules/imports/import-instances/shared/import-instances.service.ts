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
import { environment } from '../../../../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ImportInstancesModel } from './import-instances.model';

@Injectable({
    providedIn: 'root',
})
export class ImportInstancesService {
    constructor(private http: HttpClient) {}

    listImportInstances(
        search: string,
        limit: number | undefined,
        offset: number | undefined,
        sort: string,
        excludeGenerated: boolean = false,
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
}
