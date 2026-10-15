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

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthorizationServiceMock } from './core/services/authorization.service.mock';
import { AuthorizationService } from './core/services/authorization.service';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { NotificationService } from './core/components/notifications/shared/notification.service';
import { LadonService } from './modules/admin/permissions/shared/services/ladom.service';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { GeneratedResourceJanitor } from './widgets/shared/generated-resource-janitor';

describe('AppComponent', () => {
    let component: AppComponent;
    let fixture: ComponentFixture<AppComponent>;
    const ladonServiceSpy: Spy<LadonService> = createSpyFromClass(LadonService);
    ladonServiceSpy.getUserAuthorizationsForURI.and.returnValue({
        GET: true,
        POST: false,
        DELETE: false,
        PUT: false,
        PATCH: false,
        HEAD: true,
    });

    const notificationServiceSpy: Spy<NotificationService> = createSpyFromClass(NotificationService, {    });
    notificationServiceSpy.getNotifications.and.returnValue(of([]));
    let start: jasmine.Spy;
    // the clean-up chunk is loaded lazily; once the spec has it too, the component's import has resolved
    const chunkLoaded = async () => {
        await import('./widgets/shared/generated-resource-janitor');
        await new Promise((resolve) => setTimeout(resolve));
    };

    beforeEach(() => {
        start = spyOn(GeneratedResourceJanitor.prototype, 'start');
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, MatSnackBarModule, NoopAnimationsModule, AppComponent],
            providers: [
                provideRouter([]),
                { provide: AuthorizationService, useClass: AuthorizationServiceMock },
                { provide: LadonService, useValue: ladonServiceSpy },
                { provide: NotificationService, useValue: notificationServiceSpy },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting()
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the app', () => {
        expect(component).toBeTruthy();
    });

    it('starts the clean-up of generated resources once its chunk is loaded', async () => {
        await chunkLoaded();

        expect(start).toHaveBeenCalledTimes(1);
    });

    it('neither starts the clean-up nor warns when it was destroyed before the chunk loaded', async () => {
        const warn = spyOn(console, 'warn');
        TestBed.resetTestingModule();

        await chunkLoaded();

        expect(start).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
    });
});
