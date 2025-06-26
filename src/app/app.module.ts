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
import { DevicesModule } from './modules/devices/devices.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DataModule } from './modules/data/data.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ProcessesModule } from './modules/processes/processes.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import localeDe from '@angular/common/locales/de';
import { registerLocaleData } from '@angular/common';
import { SettingsModule } from './modules/settings/settings.module';
import { ClipboardModule } from 'ngx-clipboard';
import { ImportsModule } from './modules/imports/imports.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { SmartServicesModule } from './modules/smart-services/smart-services.module';
import { AdminModule } from './modules/admin/admin.module';
import { ApiDocModule } from './modules/api-doc/api-doc.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthorizationService } from './core/services/authorization.service';
import { LadonService } from './modules/admin/permissions/shared/services/ladom.service';
import { CostModule } from './modules/cost/cost.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { CredentialsModule } from './modules/credentials/credentials.module';

registerLocaleData(localeDe);

@NgModule({
    declarations: [AppComponent],
    bootstrap: [AppComponent],
    imports: [
        BrowserModule,
        CoreModule,
        AppRoutingModule,
        DashboardModule,
        DevicesModule,
        ApiDocModule,
        KeycloakAngularModule,
        AdminModule,
        DataModule,
        ProcessesModule,
        SmartServicesModule,
        MatProgressSpinnerModule,
        ImportsModule,
        MetadataModule,
        BrowserAnimationsModule,
        PermissionsModule,
        SettingsModule,
        ClipboardModule,
        CostModule,
        ReportingModule,
        CredentialsModule,
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
