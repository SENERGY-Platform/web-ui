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
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { NameValuePair } from './dwd-pollen.model';

@Injectable({
    providedIn: 'root',
})
export class DWDPollenService {
    private pollenLevel: NameValuePair[] = [
        {
            name: 'keine Belastung',
            value: 1,
        },
        {
            name: 'keine bis geringe Belastung',
            value: 2,
        },
        {
            name: 'geringe Belastung',
            value: 3,
        },
        {
            name: 'geringe bis mittlere Belastung',
            value: 4,
        },
        {
            name: 'mittlere Belastung',
            value: 5,
        },
        {
            name: 'mittlere bis hohe Belastung',
            value: 6,
        },
        {
            name: 'hohe Belastung',
            value: 7,
        },
    ];

    constructor(private errorHandlerService: ErrorHandlerService, private http: HttpClient) {}

    getPollenAreaResponse(): Observable<any> {
        return this.http
            .get(
                'https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=2.0.0&request=GetFeature' +
                    '&typeName=dwd:Pollenfluggebiete' +
                    '&outputFormat=application/json',
            )
            .pipe(
                map((resp) => resp || []),
                catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getPollenArea', {})),
            );
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
