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
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';
import {
    LastValuesRequestElementInfluxModel,
    LastValuesRequestElementTimescaleModel,
    QueriesRequestElementInfluxModel,
    QueriesRequestElementTimescaleModel,
    QueriesRequestV2ElementTimescaleModel,
    TimeValuePairModel
} from './export-data.model';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';

@Injectable({
    providedIn: 'root',
})
export class ExportDataService {
    usageAuthorizations: PermissionTestResponse
   
    constructor(private http: HttpClient,  private ladonService: LadonService) {
        this.usageAuthorizations = this.ladonService.getUserAuthorizationsForURI(environment.timescaleAPIURL + '/usage')

    }

    getLastValuesInflux(requestElements: LastValuesRequestElementInfluxModel[]): Observable<TimeValuePairModel[]> {
        return this.http.post<TimeValuePairModel[]>(environment.influxAPIURL + '/v2/last-values', requestElements);
    }

    getLastValuesTimescale(requestElements: LastValuesRequestElementTimescaleModel[]): Observable<TimeValuePairModel[]> {
        return this.http.post<TimeValuePairModel[]>(environment.timescaleAPIURL + '/last-values', requestElements);
    }

    queryInflux(query: QueriesRequestElementInfluxModel[]): Observable<any[][][]> {
        return this.http.post<any[][][]>(environment.influxAPIURL + '/v2/queries?format=per_query', query);
    }

    queryTimescale(query: QueriesRequestElementTimescaleModel[]): Observable<any[][][]> {
        return this.http.post<any[][][]>(environment.timescaleAPIURL + '/queries?format=per_query', query);
    }

    queryTimescaleV2(query: QueriesRequestV2ElementTimescaleModel[]): Observable<{requestIndex: number; data: any[][][]}[]> {
        return this.http.post<{requestIndex: number; data: any[][][]}[]>(environment.timescaleAPIURL + '/queries/v2', query);
    }

    queryAsTableInflux(
        query: QueriesRequestElementInfluxModel[],
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

    queryAsTabletimescale(
        query: QueriesRequestElementTimescaleModel[],
        orderColumnIndex: number = 0,
        orderDirection: 'asc' | 'desc' = 'desc',
    ): Observable<any[][] | null> {
        return this.http.post<any[][] | null>(
            environment.timescaleAPIURL +
            '/queries?format=table&order_column_index=' +
            orderColumnIndex +
            '&order_direction=' +
            orderDirection,
            query,
        );
    }

    queryTimescaleCsv(query: QueriesRequestElementTimescaleModel[]): Observable<string> {
        const headers = {Accept: 'text/csv'};
        return this.http.post(environment.timescaleAPIURL + '/queries?format=per_query', query, {
            headers,
            responseType: 'text'
        });
    }

    getTimescaleDataAvailability(deviceId: string): Observable<{
        serviceId: string;
        from?: Date;
        to?: Date;
        groupType?: string;
        groupTime?: string;
    }[]> {
        return this.http.get<{
            serviceId: string;
            from?: string;
            to?: string;
            groupType?: string;
            groupTime?: string;
        }[]>(environment.timescaleAPIURL + '/data-availability?device_id=' + deviceId).pipe(map(a => {
            const res: {
                serviceId: string;
                from?: Date;
                to?: Date;
                groupType?: string;
                groupTime?: string;
            }[] = [];
            a.forEach(elem => res.push({
                serviceId: elem.serviceId,
                from: elem.from === undefined ? undefined : new Date(elem.from),
                to: elem.to === undefined ? undefined : new Date(elem.to),
                groupType: elem.groupType,
                groupTime: elem.groupTime,
            }));
            return res;
        }));
    }

    userHasUsageAuthroization(): boolean {
        return this.usageAuthorizations["POST"]      
    }

    getTimescaleDeviceUsage(deviceIds: string[]): Observable<{
        deviceId: string;
        updateAt: Date;
        bytes: number;
        bytesPerDay: number;
    }[]> {
        return this.http.post<{
            deviceId: string;
            updateAt: Date;
            bytes: number;
            bytesPerDay: number;
        }[]>(environment.timescaleAPIURL + '/usage/devices', deviceIds).pipe(map(res => {
            res.forEach(r => r.updateAt = new Date(r.updateAt))
            return res;
        }))
    }
}
