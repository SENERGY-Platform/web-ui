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

import {NgModule} from '@angular/core';

import {RouterModule} from '@angular/router';
import {CommonModule} from '@angular/common';
import {CoreModule} from '../../../core/core.module';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule} from '@angular/forms';
import {NewExportComponent} from './new-export/new-export.component';
import {ExportDetailsComponent} from './export-details/export-details.component';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatDividerModule} from '@angular/material/divider';
import {MatListModule} from '@angular/material/list';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSelectModule} from '@angular/material/select';
import {MatRadioModule} from '@angular/material/radio';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatCardModule} from '@angular/material/card';


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
