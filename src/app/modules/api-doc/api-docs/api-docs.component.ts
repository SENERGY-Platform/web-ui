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

import {Component, OnInit} from '@angular/core';
import { SwaggerModel } from '../shared/swagger/swagger.model';
import { SwaggerService } from '../shared/swagger/swagger.service';

@Component({
    selector: 'app-docs',
    templateUrl: './api-docs.component.html',
    styleUrls: ['./api-docs.component.css'],
})
export class ApiDocsComponent implements OnInit {
    public title = 'SEPL API Documentation';
    public swaggerList: SwaggerModel[] = [];
    public swaggerListShown: SwaggerModel[] = [];
    public query: any;
    public searchPlaceholder: any;
    public ready = false;

    constructor(private swaggerService: SwaggerService) {
    }

    public ngOnInit(): void {
        this.swaggerService.getSwagger().subscribe((swaggerList) => {
            this.swaggerList = swaggerList;
            this.swaggerListShown = swaggerList;
            this.ready = true;
        });
    }

    public search() {
        const insensitiveQuery = new RegExp(this.query, 'gi');
        this.swaggerListShown = this.swaggerList.filter((api) => {
            return insensitiveQuery.test(api.info.description) || insensitiveQuery.test(api.info.title);
        });
    }
}
