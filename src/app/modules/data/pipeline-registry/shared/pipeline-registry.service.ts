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
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {PipelineModel, PipelineResponse} from './pipeline.model';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class PipelineRegistryService {
    authorizations: PermissionTestResponse;

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private ladonService: LadonService) {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.pipelineRegistryUrl);
    }

    getPipelines(order: string = 'id:asc', limit: number | undefined = undefined, offset: number | undefined = undefined, userId: string | undefined = undefined): Observable<PipelineModel[]> {
        return this.getPipelinesNew(order, limit, offset, userId, ).pipe(
            map((pipes) => pipes?.data || []),
        );
    }

    getPipelinesNew(order: string = 'id:asc',
                    limit: number | undefined = undefined,
                    offset: number | undefined = undefined,
                    search: string | undefined = undefined,
                    userId: string | undefined = undefined):
        Observable<PipelineResponse | null> {
        let url = environment.pipelineRegistryUrl + '/pipeline?order=' + order;
        if (limit !== undefined){
            url = url += '&limit='+limit;
        }
        if (offset !== undefined){
            url = url += '&offset='+offset;
        }
        if (search !== undefined){
            url = url += '&search='+search;
        }
        if (userId !== undefined) {
            url += '&for_user=' + userId;
        }
        return this.http.get<PipelineResponse>(url).pipe(
            map((resp) => {
                resp.data.forEach((pipe) => this.fixMaps(pipe));
                return resp;
            }),
            catchError(this.errorHandlerService.handleError(PipelineRegistryService.name, 'getPipelines: Error', null)),
        );
    }

    getPipelinesWithSelectable(selectableId: string): Observable<PipelineModel[]> {
        return this.getPipelines().pipe(
            map((pipes) => pipes || []),
            map((pipes) =>
                pipes.filter(
                    (pipe) =>
                        pipe.operators.findIndex(
                            (operator) =>
                                operator.inputSelections !== undefined &&
                                operator.inputSelections.findIndex((selection) => selection.selectableId === selectableId) !== -1,
                        ) !== -1,
                ),
            ),
        );
    }

    getPipeline(id: string): Observable<PipelineModel | null> {
        return this.http.get<PipelineModel>(environment.pipelineRegistryUrl + '/pipeline/' + id).pipe(
            map((resp) => {
                if (!resp) {
                    return null;
                }
                this.fixMaps(resp);
                return resp;
            }),
            catchError(this.errorHandlerService.handleError(PipelineRegistryService.name, 'getPipeline: Error', null)),
        );
    }

    private fixMaps(pipe: PipelineModel) {
        if(!!pipe.operators) {
            pipe.operators.forEach((op) => {
                if (op.config !== undefined) {
                    const m = new Map<string, string>();
                    for (const key of Object.keys(op.config)) {
                        // @ts-expect-error this is ok, api gives object not map
                        m.set(key, op.config[key]);
                    }
                    op.config = m;
                }
            });
        }
    }
    userHasReadAuthorization(): boolean {
        return this.authorizations['GET'];
    }
}
