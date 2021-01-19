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
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {environment} from '../../../../../environments/environment';
import {catchError} from 'rxjs/internal/operators';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

export interface PathOption {
    service_id: string;
    json_path: string[];
}

@Injectable({
    providedIn: 'root'
})
export class PathOptionsService {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    getPathOptions(deviceTypeIds: string[], functionId: string, aspectId: string, without_envelope: boolean = false,
                   characteristic_id_filter: string[] = []): Observable<Map<string, PathOption[]>> {
        return this.http.post<any>(environment.marshallerUrl + '/query/path-options', {
            device_type_ids: deviceTypeIds,
            function_id: functionId,
            aspect_id: aspectId,
            characteristic_id_filter: characteristic_id_filter,
            without_envelope: without_envelope,
        }).pipe(map(obj => {
                const m = new Map<string, PathOption[]>();
                for (const key of Object.keys(obj)) {
                    m.set(key, obj[key]);
                }
                return m;
            }),
            catchError(_ => this.errorHandlerService.handleError<Map<string, PathOption[]>>(
                'PathOptionsService', 'getPathOptions', new Map<string, PathOption[]>()))
        );
    }

}
