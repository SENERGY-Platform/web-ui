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
import {ActivatedRoute} from '@angular/router';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { SwaggerService } from '../shared/swagger/swagger.service';
import SwaggerUI from 'swagger-ui';


@Component({
    selector: 'app-single-service-doc',
    templateUrl: './single-service-doc.component.html',
    styleUrls: ['./single-service-doc.component.css'],
})
export class SingleServiceDocComponent implements OnInit {
    public id: any;
    public swagger: any;
    public ui: any;
    public ready = false;

    constructor(private authService: AuthorizationService, private route: ActivatedRoute, private swaggerService: SwaggerService) {
    }

    public ngOnInit() {
        this.route.params.subscribe((params) => {
            this.swaggerService.getSingleSwagger(decodeURIComponent(params.id)).subscribe((api) => {
                this.swagger = api;
                this.authService.getToken().then((token: any) => {
                    this.ui = SwaggerUI({
                        spec: this.swagger,
                        dom_id: '#swagger',
                    });
                    this.ready = true;

                    this.ui.authActions.authorize({JWT: {name: "JWT", schema: {type: "apiKey", in: "header", name: "Authorization", description: ""}, value: "Bearer " + token}})
                });

            });
        });
    }
}
