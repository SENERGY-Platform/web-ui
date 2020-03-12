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

import {from, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {UtilService} from '../../../core/services/util.service';
import {HttpClient} from '@angular/common/http';
import {Geoname, GeonamesResponse} from './geonames.model';
import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class GeonamesService {

    constructor(private errorHandlerService: ErrorHandlerService,
                private utilService: UtilService,
                private http: HttpClient) {
    }

    getClosestGeoname(lat: number, lon: number): Observable<Geoname> {
        return new Observable<Geoname>(obs => {
            this.http.get<GeonamesResponse>(environment.geonamesUrl +
                '/findNearbyPlaceNameJSON' +
                '?formatted=true' +
                '&lat=' + lat +
                '&lng=' + lon +
                '&style=medium')
                .pipe(map(resp => resp || []),
                    catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getClosestGeoname', {} as GeonamesResponse))
                ).subscribe(resp => {
                const geo: Geoname = resp.geonames.sort((a: Geoname, b: Geoname) => Number(a.distance) - Number(b.distance))[0];
                obs.next(geo);
                obs.complete();
            });
        });
    }

    searchPlaces(q: string): Observable<Geoname[]> {
        if (q.length < 3) {
            return from([]);
        }
        return new Observable<Geoname[]>(obs => {
            this.http.get<GeonamesResponse>(environment.geonamesUrl +
                '/searchJSON' +
                '?formatted=true' +
                '&q=' + q +
                '&maxRows=100' +
                //'&featureCode=PPL' +
                //'&&featureClass=P' +
                '&isNameRequired=true' +
                '&countryBias=DE' +
                '&style=medium')
                .pipe(map(resp => resp || []),
                    catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'searchPlaces', {} as GeonamesResponse))
                ).subscribe(resp => {
                obs.next(resp.geonames);
                obs.complete();
            });
        });
    }
}
