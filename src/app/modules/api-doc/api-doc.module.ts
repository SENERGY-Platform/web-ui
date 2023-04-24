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

import {CommonModule} from '@angular/common';
import {Component, NgModule} from '@angular/core';
import {FlexLayoutModule} from '@angular/flex-layout';

import {FormsModule} from '@angular/forms';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatLegacyFormFieldModule as MatFormFieldModule} from '@angular/material/legacy-form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import {RouterModule, Routes} from '@angular/router';
import {CoreModule} from '../../core/core.module';
import {ApiDocsComponent} from './api-docs/api-docs.component';
import {SingleServiceDocComponent} from './single-service-doc/single-service-doc.component';


const routes: Routes = [
    {
        path: 'dev/api',
        data: { header: 'API Documentation' },
        component: ApiDocsComponent,
    },
    {
        path: 'dev/api/:id',
        data: { header: 'API Documentation' },
        component: SingleServiceDocComponent,
    }
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        CoreModule,
        FlexLayoutModule,
        MatIconModule,
    ],
    declarations: [
        SingleServiceDocComponent,
        ApiDocsComponent,
    ],
})
export class ApiDocModule {
}
