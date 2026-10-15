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

import { Injectable, inject } from '@angular/core';
import {HttpClient, HttpResponse} from '@angular/common/http';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import {IOModel, OperatorModel, OperatorVersionBody} from './operator.model';
import { Observable } from 'rxjs';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class OperatorRepoService {
    private http = inject(HttpClient);
    private errorHandlerService = inject(ErrorHandlerService);
    private ladonService = inject(LadonService);

    authorizations: PermissionTestResponse;

    constructor() {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.operatorRepoUrl);
    }

    getOperators(
        search: string,
        limit: number,
        offset: number,
        feature: string,
        order: string,
        userId: string | undefined = undefined,
    ): Observable<{ operators: OperatorModel[]; totalCount: number }> {
        let url = environment.operatorRepoUrl +
            '/operator?limit=' +
            limit +
            '&offset=' +
            offset +
            '&sort=' +
            feature +
            ':' +
            order +
            (search ? '&search=' + search : '');
        if (userId !== undefined) {
            url += '&for_user=' + userId;
        }
        return this.http
            .get<{ operators: OperatorModel[]; totalCount: number }>(url)
            .pipe(
                map((resp) => resp || []),
                catchError(
                    this.errorHandlerService.handleError(OperatorRepoService.name, 'getOperators: Error', {
                        operators: [],
                        totalCount: 0,
                    }),
                ),
            );
    }

    /** Every operator, name ascending; the repository caps limit at 1000 and reads 0 as no limit. */
    getAllOperators(userId: string | undefined = undefined): Observable<{ operators: OperatorModel[]; totalCount: number }> {
        return this.getOperators('', 0, 0, 'name', 'asc', userId);
    }

    getOperator(id: string): Observable<OperatorModel | null> {
        return this.http.get<OperatorModel>(environment.operatorRepoUrl + '/operator/' + id).pipe(
            map((resp) => resp),
            catchError(this.errorHandlerService.handleError(OperatorRepoService.name, 'getOperator: Error', null)),
        );
    }

    /** A created operator is answered with {"_id": "..."} as the body; older repositories answer without one. */
    saveOperator(operator: OperatorModel): Observable<HttpResponse<unknown> | null> {
        if (operator._id === undefined) {
            return this.http
                .put<{_id?: string} | null>(environment.operatorRepoUrl + '/operator/', operator, {observe: 'response'})
                .pipe(catchError(this.errorHandlerService.handleErrorWithSnackBar('Error saving operator',OperatorRepoService.name, 'saveOperator()', null )));
        } else {
            const id = operator._id;
            delete operator._id;
            return this.http
                .post<string>(environment.operatorRepoUrl + '/operator/' + id + '/', operator, {observe: 'response'})
                .pipe(catchError(this.errorHandlerService.handleErrorWithSnackBar('Error saving operator',OperatorRepoService.name, 'saveOperator()', null )));
        }
    }

    /** Errors are not swallowed: the caller has to tell a refused delete (409, 502) from a successful one. */
    deleteOperator(operator: OperatorModel): Observable<unknown> {
        return this.http.delete(environment.operatorRepoUrl + '/operator/' + operator._id + '/');
    }

    /** Creates or replaces one version (201 or 200). Errors are not swallowed: the caller reports a refused write. */
    putOperatorVersion(id: string, version: string, body: OperatorVersionBody): Observable<unknown> {
        return this.http.put(environment.operatorRepoUrl + '/operator/' + id + '/versions/' + version, body);
    }

    /** Errors are not swallowed, see deleteOperator: 409 and 502 mean the version is still there. */
    deleteOperatorVersion(id: string, version: string): Observable<unknown> {
        return this.http.delete(environment.operatorRepoUrl + '/operator/' + id + '/versions/' + version);
    }

    /** Errors are not swallowed, see deleteOperator. */
    deleteOperators(operators: string[]): Observable<{ status: number }> {
        return this.http
            .request('DELETE', environment.operatorRepoUrl + '/operator', {
                body: operators,
                observe: 'response',
            })
            .pipe(map((resp) => ({ status: resp.status })));
    }

    setPaths(om: OperatorModel | null): Map<string, string | undefined> {
        const paths = new Map<string, string | undefined>();
        if (om !== null && om.outputs !== undefined) {
            om.outputs.forEach((out: IOModel) => {
                paths.set('analytics.' + out.name, out.type);
            });
        }
        return paths;
    };

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
}
