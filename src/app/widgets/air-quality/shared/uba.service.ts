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
import { UBAComponent, UBAData, UBADataResponse, UBAMetaResponse, UBAStation, UBAStationResponse } from './uba.model';
import { catchError, map } from 'rxjs/operators';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class UBAService {
    constructor(private errorHandlerService: ErrorHandlerService, private http: HttpClient) {}

    getUBAStations(): Observable<UBAStation[]> {
        const arr: UBAStation[] = [];
        return new Observable<UBAStation[]>((obs) => {
            this.makeUBAStationsRequest().subscribe((response) => {
                if (response.indices !== undefined && response.data !== undefined) {
                    const id = response.indices.indexOf('station id');
                    const code = response.indices.indexOf('station code');
                    const name = response.indices.indexOf('station name');
                    const city = response.indices.indexOf('station city');
                    const synonym = response.indices.indexOf('station synonym');
                    const af = response.indices.indexOf('station active from');
                    const at = response.indices.indexOf('station active to');
                    const lon = response.indices.indexOf('station longitude');
                    const lat = response.indices.indexOf('station latitude');
                    const nid = response.indices.indexOf('network id');
                    const sid = response.indices.indexOf('station setting id');
                    const tid = response.indices.indexOf('station type id');
                    const ncode = response.indices.indexOf('network code');
                    const nname = response.indices.indexOf('network name');
                    const ssname = response.indices.indexOf('station setting name');
                    const sssname = response.indices.indexOf('station setting short name');
                    const stname = response.indices.indexOf('station type name');
                    Object.keys(response.data).forEach((key) => {
                        const sub = response.data ? response.data[key] as string[] : [];

                        const station: UBAStation = {
                            station_id: Number(sub[id]),
                            station_code: sub[code],
                            station_name: sub[name],
                            station_city: sub[city],
                            station_synonym: sub[synonym],
                            station_active_from: sub[af],
                            station_active_to: sub[at],
                            station_longitude: Number(sub[lon]),
                            station_latitude: Number(sub[lat]),
                            network_id: Number(sub[nid]),
                            station_setting_id: Number(sub[sid]),
                            station_type_id: Number(sub[tid]),
                            network_code: sub[ncode],
                            network_name: sub[nname],
                            station_setting_name: sub[ssname],
                            station_setting_short_name: sub[sssname],
                            station_type_name: sub[stname],
                        };
                        arr.push(station);
                        return arr;
                    });
                }
                obs.next(arr);
                obs.complete();
            });
        });
    }

    private makeUBAStationsRequest(): Observable<UBAStationResponse> {
        return this.http
            .get<UBAStationResponse>(
                environment.ubaUrl +
                    '/air_data/v2/stations/json?date_from=' +
                    UBAService.getDateString() +
                    '&time_from=1&date_to=' +
                    UBAService.getDateString() +
                    '&lang=de&time_to=24',
            )
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getData', {} as UBAStationResponse)),
            );
    }

    getUBAComponents(): Observable<UBAComponent[]> {
        return new Observable<UBAComponent[]>((obs) => {
            this.http
                .get<UBAMetaResponse>(
                    environment.ubaUrl +
                        '/air_data/v2/meta/json?use=airquality&date_from=' +
                        UBAService.getDateString() +
                        '&time_from=1&date_to=' +
                        UBAService.getDateString() +
                        '&lang=de&time_to=24',
                )
                .pipe(
                    map((resp) => resp || []),
                    catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getData', {} as UBAMetaResponse)),
                )
                .subscribe((response) => {
                    const arr: UBAComponent[] = [];
                    if (response.components !== undefined) {
                        Object.keys(response.components).forEach((key) => {
                            const sub = response.components ? response.components[key] as string[] : [];
                            const component: UBAComponent = {
                                id: Number(sub[0]),
                                short_name: sub[1],
                                pretty_name: sub[2],
                                unit: sub[3],
                                friendly_name: sub[4],
                            };
                            arr.push(component);
                            return arr;
                        });
                    }
                    obs.next(arr);
                    obs.complete();
                });
        });
    }

    getUBAData(stationId: number, ubaComponents: UBAComponent[]): Observable<UBAData[]> {
        const date = new Date();
        return new Observable<UBAData[]>((obs) => {
            this.http
                .get<UBADataResponse>(
                    environment.ubaUrl +
                        '/air_data/v2/airquality/json?date_from=' +
                        UBAService.getDateString() +
                        '&date_to=' +
                        UBAService.getDateString() +
                        '&lang=de&time_to=' +
                        date.getHours() +
                        '&time_from=' +
                        (date.getHours() - 12 < 1 ? 1 : date.getHours() - 12) +
                        '&station=' +
                        stationId,
                )
                .pipe(
                    map((resp) => resp || []),
                    catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getData', {} as UBADataResponse)),
                )
                .subscribe((response) => {
                    const stationData = (response.data as any)[stationId];
                    const arr: UBAData[] = [];
                    if (stationData !== undefined) {
                        const keys = Object.keys(stationData);
                        const lastKey = keys[keys.length - 1];
                        const currentData = stationData[lastKey];
                        for (let i = 3; i < currentData.length; i++) {
                            const componentData = currentData[i];
                            const component = ubaComponents.find((comp: UBAComponent) => comp.id === componentData[0]);
                            if (component !== undefined) {
                                const data: UBAData = {
                                    short_name: component.short_name,
                                    value: componentData[1],
                                    unit: component.unit,
                                    timestamp: lastKey,
                                };
                                arr.push(data);
                            }
                        }
                    }
                    obs.next(arr);
                    obs.complete();
                });
        });
    }

    getUBAStationCapabilities(stationId: number): Observable<string[]> {
        return new Observable<string[]>((obs) => {
            this.getUBAComponents().subscribe((components) => {
                this.getUBAData(stationId, components).subscribe((ubadata) => {
                    const rv: string[] = [];
                    ubadata.forEach((u) => rv.push(u.short_name));
                    obs.next(rv);
                    obs.complete();
                });
            });
        });
    }

    private static getDateString(): string {
        const date = new Date();
        const month = date.getMonth() + 1; // Jan = 0
        return (
            date.getFullYear() +
            '-' +
            (month < 10 ? '0' + month : month) +
            '-' +
            (date.getDate() < 10 ? '0' + date.getDate() : date.getDate())
        );
    }
}
