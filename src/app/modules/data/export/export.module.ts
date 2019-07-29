/*
 * Copyright 2018 InfAI (CC SES)
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

import {NgModule} from '@angular/core';

import {RouterModule} from '@angular/router';
import {CommonModule} from '@angular/common';
import {
    MatButtonModule, MatCheckboxModule, MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule, MatInputModule,
    MatListModule, MatRadioModule, MatSelectModule,
    MatTooltipModule, MatAutocompleteModule, MatCardModule
} from '@angular/material';
import {CoreModule} from '../../../core/core.module';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule} from '@angular/forms';
import {NewExportComponent} from './new-export/new-export.component';
import {ExportDetailsComponent} from './export-details/export-details.component';


const exp = {path: 'data/export/new', pathMatch: 'full', component: NewExportComponent, data: { header: 'Analytics' }};
const details = {path: 'data/export/details/:id', pathMatch: 'full', component: ExportDetailsComponent, data: { header: 'Analytics' }};

@NgModule({
    imports: [
        RouterModule.forChild([exp, details]),
        CoreModule,
        CommonModule,
        MatGridListModule,
        MatIconModule,
        MatTooltipModule,
        MatDividerModule,
        MatListModule,
        FlexLayoutModule,
        MatButtonModule,
        MatFormFieldModule,
        MatDialogModule,
        MatInputModule,
        FormsModule,
        MatCheckboxModule,
        MatSelectModule,
        MatRadioModule,
        MatAutocompleteModule,
        MatCardModule
    ],
    declarations: [
        NewExportComponent,
        ExportDetailsComponent
    ],
})
export class ExportModule {
}
