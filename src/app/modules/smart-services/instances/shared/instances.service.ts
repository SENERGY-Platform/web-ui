/*
 * Copyright 2025 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { catchError, map, Observable } from 'rxjs';
import { SmartServiceInstanceModel } from './instances.model';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SmartServiceInstanceService {
    constructor(private http: HttpClient,
        private errorHandlerService: ErrorHandlerService) { }

    getInstances(options: { limit?: number; offset?: number; sort?: string; }): Observable<SmartServiceInstanceModel[]> {
        let params = new HttpParams();
        if (options.limit) {
            params = params.set('limit', options.limit);
        }
        if (options.offset) {
            params = params.set('offset', options.offset);
        }
        if (options.sort) {
            params = params.set('sort', options.sort);
        }
        return this.http.get<SmartServiceInstanceModel[] | null>(environment.smartServiceRepoUrl+'/instances', {params}).pipe(
            map(r => r || []),
            catchError(this.errorHandlerService.handleError(SmartServiceInstanceService.name, 'getInstances()', []))
        );
    }

    getAllInstances(): Observable<SmartServiceInstanceModel[]> {
        const instances: SmartServiceInstanceModel[] = [];
        return new Observable<SmartServiceInstanceModel[]>(o => {
            let offset = 0;
            const limit = 9999;
            const f = () => {
                this.getInstances({limit, offset}).subscribe(r => {
                    instances.push(...r);
                    if (r.length < limit) {
                        o.next(instances);
                        o.complete();
                        return;
                    }
                    offset += r.length;
                    f();
                });
            };
            f();
        });
    }

}