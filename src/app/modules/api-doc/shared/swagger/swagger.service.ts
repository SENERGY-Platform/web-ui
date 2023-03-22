/*
 *
 *     Copyright 2018 InfAI (CC SES)
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

import { HttpClient } from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import { environment } from 'src/environments/environment';
import {SwaggerModel} from './swagger.model';

@Injectable({
    providedIn: 'root',
})
export class SwaggerService {
    private cachedSwagger: SwaggerModel[] = [];
    private invalidAfter: Date = new Date();

    public baseUrl: string = environment.swaggerUrl;

    constructor(private http: HttpClient) {
    }

    public getSwagger(): Observable<SwaggerModel[]> {
        if (this.needsReload()) {
            return this.loadSwagger();
        } else {
            return of(this.cachedSwagger);
        }
    }

    public getSingleSwagger(title: string): Observable<SwaggerModel> {
        if (this.needsReload()) {
            return new Observable<SwaggerModel>((obs) => {
                this.loadSwagger().subscribe((_) => {
                    obs.next(this.filterSingleSwagger(title));
                    obs.complete();
                });
            });
        }
        return of(this.filterSingleSwagger(title));
    }

    private loadSwagger(): Observable<SwaggerModel[]> {
        return new Observable<SwaggerModel[]>((obs) => {
            this.http.get(this.baseUrl).subscribe((res) => {
                this.cachedSwagger = res as SwaggerModel[];
                const d = new Date();
                d.setHours(d.getHours() + 1);
                this.invalidAfter = d;
                obs.next(this.cachedSwagger);
                obs.complete();
            });
        });
    }

    private needsReload(): boolean {
        return this.cachedSwagger === undefined || new Date() > this.invalidAfter;
    }

    private filterSingleSwagger(title: string): SwaggerModel {
        for (const api of this.cachedSwagger) {
            if (api.info.title === title) {
                return api;
            }
        }
        return {} as SwaggerModel;
    }
}
