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
import {YrWeatherModel} from './yr-weather.model';
import {environment} from '../../../../environments/environment';
import {Geoname} from './geonames.model';
import * as X2JS from 'x2js';

@Injectable({
    providedIn: 'root'
})
export class YrWeatherService {

    x2js: X2JS;

    constructor(private errorHandlerService: ErrorHandlerService,
                private http: HttpClient) {
        this.x2js = new X2JS();
    }

    getYrPath(geoname: Geoname): string {
        return '/place/' + geoname.countryName + '/' + geoname.adminName1 + '/' + geoname.name;
    }

    getYrForecast(yrPath: string): Observable<YrWeatherModel> {
        return new Observable<YrWeatherModel>(obs => {
            this.http.get(environment.yrUrl +
                yrPath + '/forecast_hour_by_hour.xml',
                {responseType: 'text'})
                .pipe(map(resp => resp || []),
                    catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getYrForecast', '' as string))
                ).subscribe(resp => {
                const model: YrWeatherModel =
                    this.convertXMLtoJSON(resp as string) as unknown as YrWeatherModel;
                const cacheUntil = new Date();
                cacheUntil.setHours(cacheUntil.getHours() + 1); // automagically increases day if >23
                model.cacheUntil = cacheUntil;
                obs.next(model);
                obs.complete();
            });
        });
    }

    convertXMLtoJSON(xml: string): string {
        return this.x2js.xml2js(xml);
    }
}

