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
import { ImportTypeContentVariableModel, ImportTypeModel } from './import-types.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { delay } from 'rxjs/operators';
import { ExportValueModel } from '../../../exports/shared/export.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

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
    authorizations: PermissionTestResponse;

    constructor(
        private http: HttpClient,
        private ladonService: LadonService
    ) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.importRepoUrl);
    }

    listImportTypes(
        search: string,
        limit: number | undefined,
        offset: number | undefined,
        sort: string,
    ): Observable<{ result: ImportTypeModel[]; total: number }> {
        let url = environment.importRepoUrl + '/import-types?';
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
            .get<ImportTypeModel[]>(url, { observe: 'response' }).pipe(
                map(resp => {
                    const totalStr = resp?.headers.get('X-Total-Count') || '0';
                    return {
                        total: parseInt(totalStr, 10),
                        result: resp?.body || [],
                    };
                }));
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
