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

import { AppRoutingModule } from './app-routing.module';
import {TestBed} from '@angular/core/testing';
import {CoreModule, keycloakServiceToken} from './core/core.module';
import {RouterTestingModule} from '@angular/router/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {AppComponent} from './app.component';
import {MockKeycloakService} from './core/services/keycloak.mock';
import {AuthorizationServiceMock} from './core/services/authorization.service.mock';
import {KeycloakService} from 'keycloak-angular';

describe('AppRoutingModule', () => {
    let appRoutingModule: AppRoutingModule;

    beforeEach(() => {

        TestBed.configureTestingModule({
            imports: [CoreModule, RouterTestingModule, HttpClientTestingModule, MatSnackBarModule],
            declarations: [AppComponent],
            providers: [{ provide: KeycloakService, useClass: MockKeycloakService }, { provide: AuthorizationServiceMock, useClass: AuthorizationServiceMock }],
        }).compileComponents();
        appRoutingModule = new AppRoutingModule();
    });

    it('should create an instance', () => {
        expect(appRoutingModule).toBeTruthy();
    });
});
