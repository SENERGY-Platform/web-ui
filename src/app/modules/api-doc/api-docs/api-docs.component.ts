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

import { Component, OnInit } from '@angular/core';
import { DocInfo, SwaggerModel } from '../shared/swagger/swagger.model';
import { SwaggerService } from '../shared/swagger/swagger.service';
import { forkJoin, map, Observable, of } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';

@Component({
    selector: 'senergy-api-docs',
    templateUrl: './api-docs.component.html',
    styleUrls: ['./api-docs.component.css'],
})
export class ApiDocsComponent implements OnInit {
    public title = 'SEPL API Documentation';
    public swaggerList: SwaggerModel[] = [];
    public swaggerListShown: SwaggerModel[] = [];
    public asyncList: DocInfo[] = [];
    public asyncListShown: DocInfo[] = [];
    public searchPlaceholder: any;
    public ready = false;
    searchSub: any;

    constructor(
        public swaggerService: SwaggerService,
        private searchbarService: SearchbarService,
    ) {
    }

    public ngOnInit(): void {
        const obs: Observable<unknown>[] = [of(null)];

        if (this.swaggerService.authorizationsSwagger['GET']) {
            obs.push(this.swaggerService.getSwagger().pipe(map(swaggerList => {
                this.swaggerList = swaggerList;
                this.swaggerListShown = swaggerList;
            })));
        }
        if (this.swaggerService.authorizationsAsyncAPI['GET']) {
            obs.push(this.swaggerService.getAsync().pipe(map(asyncList => {
                this.asyncList = asyncList;
                this.asyncListShown = asyncList;
            })));
        }
        forkJoin(obs).subscribe(_ => this.ready = true);

        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            const insensitiveQuery = new RegExp(searchText, 'gi');
            this.swaggerListShown = this.swaggerList.filter((api) => insensitiveQuery.test(api.info.description) || insensitiveQuery.test(api.info.title));
            this.asyncListShown = this.asyncList.filter((api) => insensitiveQuery.test(api.description) || insensitiveQuery.test(api.title));
        });
    }

}
