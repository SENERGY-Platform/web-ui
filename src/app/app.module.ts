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

import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, LOCALE_ID, NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { AppRoutingModule } from './app-routing.module';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { KeycloakAngularModule } from 'keycloak-angular';
import { initializerService } from './core/services/initializer.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PermissionsModule } from './modules/permissions/permissions.module';
import localeDe from '@angular/common/locales/de';
import { registerLocaleData } from '@angular/common';
import { SettingsModule } from './modules/settings/settings.module';
import { ClipboardModule } from 'ngx-clipboard';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthorizationService } from './core/services/authorization.service';
import { LadonService } from './modules/admin/permissions/shared/services/ladom.service';

registerLocaleData(localeDe);

@NgModule({
    declarations: [AppComponent],
    bootstrap: [AppComponent],
    imports: [
        BrowserModule,
        CoreModule,
        AppRoutingModule,
        KeycloakAngularModule,
        MatProgressSpinnerModule,
        BrowserAnimationsModule,
        PermissionsModule,
        SettingsModule,
        ClipboardModule,
    ], providers: [
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
        provideHttpClient(withInterceptorsFromDi()),
    ]
})
export class AppModule { }
