/*
 * Copyright 2026 InfAI (CC SES)
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

import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { KeycloakAngularModule } from 'keycloak-angular';
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { provideIconFontSet } from './core/icon-font-set';
import { provideOverlayDefaults } from './core/overlay-defaults';
import { AuthorizationService } from './core/services/authorization.service';
import { initializerService } from './core/services/initializer.service';
import { LadonService } from './modules/admin/permissions/shared/services/ladom.service';

registerLocaleData(localeDe);

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection(),
        // CoreModule before AppRoutingModule: its forChild route ('notifications') has to precede the root routes.
        importProvidersFrom(CoreModule, AppRoutingModule, KeycloakAngularModule),
        provideAnimations(),
        {
            provide: APP_INITIALIZER,
            useFactory: initializerService,
            multi: true,
            deps: [AuthorizationService, LadonService],
        },
        {
            provide: LOCALE_ID,
            useValue: 'de',
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthorizationService,
            multi: true,
        },
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideNativeDateAdapter(),
        provideIconFontSet(),
        provideOverlayDefaults(),
    ],
};
