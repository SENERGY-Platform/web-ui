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

import { NgModule } from '@angular/core';

import {Route, RouterModule} from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule } from '../../core/core.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NewExportComponent } from './new-export/new-export.component';
import { ExportDetailsComponent } from './export-details/export-details.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { ExportComponent } from './export.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';

const exp: Route = { path: 'exports/new', pathMatch: 'full', component: NewExportComponent, data: { header: 'New Export' } };
const dataExport: Route = { path: 'exports/db', pathMatch: 'full', component: ExportComponent, data: { header: 'Exports' } };
const exportEdit: Route = { path: 'exports/edit/:id', pathMatch: 'full', component: NewExportComponent, data: { header: 'Edit Export' } };
const details: Route = { path: 'exports/details/:id', pathMatch: 'full', component: ExportDetailsComponent, data: { header: 'Export Details' } };
const brokerDataExport: Route = { path: 'exports/broker', pathMatch: 'full', component: ExportComponent, data: { header: 'Exports' } };

@NgModule({
    imports: [
        RouterModule.forChild([dataExport, exp, exportEdit, details, brokerDataExport]),
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
        ReactiveFormsModule,
        MatCheckboxModule,
        MatSelectModule,
        MatRadioModule,
        InfiniteScrollModule,
        MatAutocompleteModule,
        MatCardModule,
        MatTableModule,
        MatExpansionModule,
        MatSlideToggleModule,
    ],
    declarations: [ExportComponent, NewExportComponent, ExportDetailsComponent],
})
export class ExportModule {}
