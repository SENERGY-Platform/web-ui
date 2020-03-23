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

import {BrowserModule} from '@angular/platform-browser';
import {APP_INITIALIZER, LOCALE_ID, NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {CoreModule} from './core/core.module';
import {AppRoutingModule} from './/app-routing.module';
import {HttpClientModule} from '@angular/common/http';
import {KeycloakAngularModule, KeycloakService} from 'keycloak-angular';
import {keycloakInitializerService} from './core/services/keycloak-initializer.service';
import {DevicesModule} from './modules/devices/devices.module';
import {DashboardModule} from './modules/dashboard/dashboard.module';
import {DataModule} from './modules/data/data.module';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ProcessesModule} from './modules/processes/processes.module';
import {PermissionsModule} from './modules/permissions/permissions.module';
import localeDe from '@angular/common/locales/de';
import {registerLocaleData} from '@angular/common';
import {SettingsModule} from './modules/settings/settings.module';
import {ClipboardModule} from 'ngx-clipboard';

registerLocaleData(localeDe);

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        CoreModule,
        AppRoutingModule,
        DashboardModule,
        DevicesModule,
        KeycloakAngularModule,
        DataModule,
        ProcessesModule,
        BrowserAnimationsModule,
        PermissionsModule,
        SettingsModule,
        ClipboardModule,
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: keycloakInitializerService,
            multi: true,
            deps: [KeycloakService]
        },
        {
            provide: LOCALE_ID,
            useValue: 'de'
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
