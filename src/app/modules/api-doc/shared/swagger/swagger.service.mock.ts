/*
 *
 *     Copyright 2020 InfAI (CC SES)
 *
 *     Licensed under the Apache License, Version 2.0 (the “License”);
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an “AS IS” BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {SwaggerModel} from './swagger.model';

@Injectable()
export class SwaggerServiceMock {
    constructor() {
    }

    /**
     * Get all Swagger files from the service.
     * giIterate through the array and retrieve necessary information(name, version)
     * and add it to the list using currently unavailable descriptions.
     */
    public getSwagger(): Observable<SwaggerModel[]> {
        return of([] as SwaggerModel[]);
    }

    public getSingleSwagger(_: string): Observable<SwaggerModel> {
        return of({} as SwaggerModel);
    }
}
