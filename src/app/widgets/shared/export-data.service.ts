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
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LastValuesRequestElementModel, QueriesRequestElementModel, TimeValuePairModel } from './export-data.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root',
})
export class ExportDataService {
    constructor(private http: HttpClient) {}

    getLastValues(requestElements: LastValuesRequestElementModel[]): Observable<TimeValuePairModel[]> {
        return this.http.post<TimeValuePairModel[]>(environment.influxAPIURL + '/v2/last-values', requestElements);
    }

    query(query: QueriesRequestElementModel[]): Observable<any[][][]> {
        return this.http.post<any[][][]>(environment.influxAPIURL + '/v2/queries?format=per_query', query);
    }

    queryAsTable(
        query: QueriesRequestElementModel[],
        orderColumnIndex: number = 0,
        orderDirection: 'asc' | 'desc' = 'desc',
    ): Observable<any[][] | null> {
        return this.http.post<any[][] | null>(
            environment.influxAPIURL +
                '/v2/queries?format=table&order_column_index=' +
                orderColumnIndex +
                '&order_direction=' +
                orderDirection,
            query,
        );
    }
}
