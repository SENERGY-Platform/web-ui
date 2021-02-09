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
import {CoreModule} from '../../core/core.module';
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
import {MatTableModule} from '@angular/material/table';
import {ExportComponent} from "./export.component";
import {InfiniteScrollModule} from "ngx-infinite-scroll";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatSortModule} from "@angular/material/sort";

const dataExport = {path: 'exports', pathMatch: 'full', component: ExportComponent, data: { header: 'Exports' }};
const exp = {path: 'exports/new', pathMatch: 'full', component: NewExportComponent, data: { header: 'Exports' }};
const exportEdit = {path: 'exports/edit/:id', pathMatch: 'full', component: NewExportComponent, data: { header: 'Exports' }};
const details = {path: 'exports/details/:id', pathMatch: 'full', component: ExportDetailsComponent, data: { header: 'Exports' }};

@NgModule({
    imports: [
        RouterModule.forChild([dataExport, exp, exportEdit, details]),
        CoreModule,
        CommonModule,
        MatGridListModule,
        MatIconModule,
        MatTooltipModule,
        MatPaginatorModule,
        MatSortModule,
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
        InfiniteScrollModule,
        MatAutocompleteModule,
        MatCardModule,
        MatTableModule
    ],
    declarations: [
        ExportComponent,
        NewExportComponent,
        ExportDetailsComponent
    ],
})
export class ExportModule {
}
