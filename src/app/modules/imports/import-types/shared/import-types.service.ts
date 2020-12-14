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
import {Injectable} from '@angular/core';
import {ImportTypeModel, ImportTypePermissionSearchModel} from './import-types.model';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../../../environments/environment';
import {Observable} from 'rxjs';
import {map} from 'rxjs/internal/operators';
import {delay} from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ImportTypesService {
    eventualConsistencyDelay = 2000;

    constructor(private http: HttpClient) {
    }

    listImportTypes(search: string, limit: number | undefined, offset: number | undefined, sort: string): Observable<ImportTypePermissionSearchModel[]> {
        let url = environment.permissionSearchUrl + '/v2/import-types?';
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
        return this.http.get<ImportTypePermissionSearchModel[]>(url)
            .pipe(map(types => types || []))
            .pipe(map(types => {
                types.forEach(type => {
                    type.aspect_functions = type.aspect_functions || [];
                    type.aspect_ids = type.aspect_ids || [];
                    type.function_ids = type.function_ids || [];
                });
                return types;
            }));
    }

    getImportType(id: string): Observable<ImportTypeModel> {
        return this.http.get<ImportTypeModel>(environment.importRepoUrl + '/import-types/' + id).pipe(map(type => {
            type.aspect_ids = type.aspect_ids || [];
            type.function_ids = type.function_ids || [];
            return type;
        }));
    }

    saveImportType(importType: ImportTypeModel): Observable<void> {
        let obs: Observable<void>;
        if (importType.id.length > 0) {
            obs = this.http.put<void>(environment.importRepoUrl + '/import-types/' + importType.id, importType);
        } else {
            obs = this.http.post<void>(environment.importRepoUrl + '/import-types', importType);
        }
        return obs.pipe(delay(this.eventualConsistencyDelay));
    }

    deleteImportInstance(id: string): Observable<void> {
        return this.http.delete<void>(environment.importRepoUrl + '/import-types/' + id)
            .pipe(delay(this.eventualConsistencyDelay));
    }
}
