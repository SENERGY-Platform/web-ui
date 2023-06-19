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
import { Injectable, OnInit } from '@angular/core';
import { ImportTypeContentVariableModel, ImportTypeModel, ImportTypePermissionSearchModel } from './import-types.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { delay } from 'rxjs/operators';
import { ExportValueModel } from '../../../exports/shared/export.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { AllowedMethods, PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

@Injectable({
    providedIn: 'root',
})
export class ImportTypesService {
    eventualConsistencyDelay = 2000;

    STRING = 'https://schema.org/Text';
    INTEGER = 'https://schema.org/Integer';
    FLOAT = 'https://schema.org/Float';
    BOOLEAN = 'https://schema.org/Boolean';
    STRUCTURE = 'https://schema.org/StructuredValue';
    LIST = 'https://schema.org/ItemList';
    types: Map<string, string> = new Map();
    authorizationObs: Observable<PermissionTestResponse> = new Observable()

    constructor(
        private http: HttpClient, 
        private ladonService: LadonService
    ) {
        this.authorizationObs = this.ladonService.getUserAuthorizationsForURI(environment.importRepoUrl, ["GET", "DELETE", "POST", "PUT"])
    }

    listImportTypes(
        search: string,
        limit: number | undefined,
        offset: number | undefined,
        sort: string,
    ): Observable<ImportTypePermissionSearchModel[]> {
        let url = environment.permissionSearchUrl + '/v3/resources/import-types?';
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
        return this.http
            .get<ImportTypePermissionSearchModel[]>(url)
            .pipe(map((types) => types || []))
            .pipe(
                map((types) => {
                    types.forEach((type) => {
                        type.aspect_functions = type.aspect_functions || [];
                        type.content_aspect_ids = type.content_aspect_ids || [];
                        type.content_function_ids = type.content_function_ids || [];
                    });
                    return types;
                }),
            );
    }

    getImportType(id: string): Observable<ImportTypeModel> {
        return this.http.get<ImportTypeModel>(environment.importRepoUrl + '/import-types/' + id);
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
        return this.http.delete<void>(environment.importRepoUrl + '/import-types/' + id).pipe(delay(this.eventualConsistencyDelay));
    }

    parseImportTypeExportValues(importType: ImportTypeModel, includeComplex = false): ExportValueModel[] {
        this.types.set(this.STRING, 'string');
        this.types.set(this.INTEGER, 'int');
        this.types.set(this.FLOAT, 'float');
        this.types.set(this.BOOLEAN, 'bool');
        this.types.set(this.LIST, 'string_json');

        let exportContent = importType.output.sub_content_variables?.find((sub) => sub.name === 'value' && sub.type === this.STRUCTURE);
        if (exportContent === undefined) {
            exportContent = importType.output;
        }
        const values: ExportValueModel[] = [];
        this.fillValuesAndTags(values, exportContent, '', includeComplex);
        return values;
    }

    private fillValuesAndTags(
        values: ExportValueModel[],
        content: ImportTypeContentVariableModel,
        parentPath: string,
        includeComplex = false,
    ) {
        if (
            includeComplex ||
            ((content.sub_content_variables === null || content.sub_content_variables.length === 0) && this.types.has(content.type))
        ) {
            // can only export primitive types
            const model = {
                Name: content.name,
                Path: parentPath + (parentPath === '' ? '' : '.') + content.name,
                Type: this.types.get(content.type),
                Tag: content.use_as_tag && content.type === this.STRING,
            } as ExportValueModel;
            values.push(model);

            // check if tag is needed
            if (content.use_as_tag && content.type !== this.STRING) {
                const tag = {
                    Name: content.name + '_tag',
                    Path: parentPath + '.' + content.name,
                    Type: this.types.get(this.STRING),
                    Tag: true,
                } as ExportValueModel;
                values.push(tag);
            }
        }
        if (content.sub_content_variables !== null && content.sub_content_variables.length > 0) {
            const path = parentPath === '' ? content.name : parentPath + '.' + content.name;
            content.sub_content_variables?.forEach((sub) => this.fillValuesAndTags(values, sub, path, includeComplex));
        }
    }

    userHasDeleteAuthorization(): Observable<boolean> {
        return this.userHasAuthorization("DELETE")      
    }

    userHasUpdateAuthorization(): Observable<boolean> {
        return this.userHasAuthorization("PUT")      
    }

    userHasCreateAuthorization(): Observable<boolean> {
        return this.userHasAuthorization("POST")   
    }

    userHasReadAuthorization(): Observable<boolean> {
        return this.userHasAuthorization("GET")   
    }

    userHasAuthorization(method: AllowedMethods): Observable<boolean> {
        return new Observable(obs => {
            this.authorizationObs.subscribe(result => {
                obs.next(result[method])
                obs.complete()
            })
        })    
    }
}
