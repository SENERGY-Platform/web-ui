/*
 * Copyright 2018 InfAI (CC SES)
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
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {DWDPollenForecast, DWDSinglePollenForecast, NameValuePair} from './dwd-pollen.model';
import {environment} from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class DWDPollenService {

    private pollenLevel: NameValuePair[] = [
        {
            name: 'keine Belastung',
            value: 0,
        },
        {
            name: 'keine bis geringe Belastung',
            value: 0.5,
        },
        {
            name: 'geringe Belastung',
            value: 1,
        },
        {
            name: 'geringe bis mittlere Belastung',
            value: 1.5,
        },
        {
            name: 'mittlere Belastung',
            value: 2,
        },
        {
            name: 'mittlere bis hohe Belastung',
            value: 2.5,
        },
        {
            name: 'hohe Belastung',
            value: 3,
        },
    ];

    constructor(private errorHandlerService: ErrorHandlerService,
                private http: HttpClient) {
    }

    getPollenAreaResponse(): Observable<any> {
        return this.http.get(
                'https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=2.0.0&request=GetFeature' +
                '&typeName=dwd:Pollenfluggebiete' +
                '&outputFormat=application/json')
                .pipe(map(resp => resp || []),
                    catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getPollenArea', {}))
                );
    }

    extractPollenArea(lat: number, lon: number, pollenAreaResponse: any): string {
        let area = ' ';
        // @ts-ignore
        pollenAreaResponse['features'].forEach(feature => {
            // @ts-ignore
            feature['geometry']['coordinates'].forEach(poly => {
                let inside = false;
                const x = lon, y = lat;
                for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                    const xi = poly[i][0], yi = poly[i][1];
                    const xj = poly[j][0], yj = poly[j][1];

                    const intersect = ((yi > y) !== (yj > y))
                        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                    if (intersect) { inside = !inside; }
                }
                if (inside) {
                    area = feature['properties']['GEN'];
                }
            });
        });
        return area;
    }


    getPollenForecast(): Observable<any> {
        return this.http.get<any>(
                    environment.dwdOpenUrl + '/climate_environment/health/alerts/s31fg.json')
                    .pipe(map(resp => resp || []),
                        catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getPollenForecast', {}))
                    );
    }

    extractPollenForecast(partregion_name: string, pollenForecastResponse: any): DWDPollenForecast {
        // @ts-ignore
        const areaForecast = pollenForecastResponse['content'].find(region => region['partregion_name'] === partregion_name);
        const pollen = areaForecast['Pollen'];
        const arr: DWDSinglePollenForecast[] = [];
        Object.keys(pollen).map(key => {
           const singlePollenForecast: DWDSinglePollenForecast = {
               name: key,
               today: pollen[key]['today'],
               tomorrow: pollen[key]['tomorrow'],
               dayafter_to: pollen[key]['dayafter_to'],
           };
           arr.push(singlePollenForecast);
        });
        const forecast: DWDPollenForecast = {
            forecast: arr,
            next_update: pollenForecastResponse['next_update'],
        };
        return forecast;
    }

    getNameValuePairs(): NameValuePair[] {
        return this.pollenLevel;
    }

    getNameForValue(value: number): string {
        for (const level in this.pollenLevel) {
            if (this.pollenLevel[level].value === value) {
                return this.pollenLevel[level].name;
            }
        }
        return 'No level for this value';
    }

    getValueForName(name: string): number {
        for (const level in this.pollenLevel) {
            if (this.pollenLevel[level].name === name) {
                return this.pollenLevel[level].value;
            }
        }
        return -1;
    }
}

