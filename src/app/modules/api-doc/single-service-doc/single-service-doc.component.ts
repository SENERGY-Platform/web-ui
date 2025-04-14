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
import { ActivatedRoute } from '@angular/router';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { SwaggerService } from '../shared/swagger/swagger.service';
import SwaggerUI from 'swagger-ui';
import '@asyncapi/web-component/lib/asyncapi-web-component';

@Component({
    selector: 'senergy-single-service-doc',
    templateUrl: './single-service-doc.component.html',
    styleUrls: ['./single-service-doc.component.css'],
})
export class SingleServiceDocComponent implements OnInit {
    public id: any;
    public swagger: any;
    public ui: any;
    public ready = false;
    public type = '';

    constructor(private authService: AuthorizationService, private route: ActivatedRoute, private swaggerService: SwaggerService) {
    }

    public ngOnInit() {
        this.route.params.subscribe((params) => {
            this.type = params.type;
            if (params.type === 'openapi') {
                this.swaggerService.getSingleSwagger(decodeURIComponent(params.id)).subscribe((api) => {
                    if (api === null) {
                        return;
                    }
                    this.swagger = api;
                    this.authService.getToken().then((token: any) => {
                        this.ui = SwaggerUI({
                            spec: this.swagger,
                            dom_id: '#swagger',
                            requestInterceptor(req) {
                                req.headers['Authorization'] = token;
                                return req;
                            }
                        });
                        this.ready = true;
                    });

                });
            } else if (params.type === 'asyncapi') {
                this.swaggerService.getSingleAsync(decodeURIComponent(params.id)).subscribe((api) => {
                    this.swagger = api;
                    this.ready = true;
                });
            }
        });
    }
}
