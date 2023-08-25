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

import { TestBed, ComponentFixture, waitForAsync } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { KeycloakService } from 'keycloak-angular';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MockKeycloakService } from './core/services/keycloak.mock';
import { AuthorizationServiceMock } from './core/services/authorization.service.mock';
import {AuthorizationService} from "./core/services/authorization.service";
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { SettingsDialogService } from './modules/settings/shared/settings-dialog.service';
import { NotificationService } from './core/components/toolbar/notification/shared/notification.service';
import { LadonService } from './modules/admin/permissions/shared/services/ladom.service';

describe('AppComponent', () => {
    let component: AppComponent;
    let fixture: ComponentFixture<AppComponent>;
    const ladonServiceSpy: Spy<LadonService> = createSpyFromClass(LadonService);
    ladonServiceSpy.getUserAuthorizationsForURI.and.returnValue({
        "GET": true,
        "POST": false,
        "DELETE": false,
        "PUT": false,
        "PATCH": false,
        "HEAD": true,
    })

    const notificationServiceSpy: Spy<NotificationService> = createSpyFromClass(NotificationService, {
        observablePropsToSpyOn: ['notificationEmitter']
    })

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [CoreModule, RouterTestingModule, HttpClientTestingModule, MatSnackBarModule],
            declarations: [AppComponent],
            providers: [
                { provide: KeycloakService, useClass: MockKeycloakService }, 
                { provide: AuthorizationService, useClass: AuthorizationServiceMock },
                { provide: LadonService, useValue: ladonServiceSpy},
                { provide: NotificationService, useValue: notificationServiceSpy}
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the app', () => {
        expect(component).toBeTruthy();
    });
});
