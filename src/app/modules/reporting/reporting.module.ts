/*
 * Copyright 2024 InfAI (CC SES)
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
import { CommonModule } from '@angular/common';
import {Route, RouterModule} from '@angular/router';
import {TemplatesComponent} from './templates/templates.component';
import {FlexModule} from '@ngbracket/ngx-layout';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {ReportComponent} from './report/report.component';
import {MatSelectModule} from '@angular/material/select';
import {MatCardModule} from '@angular/material/card';
import {ReportObjectComponent} from './report/report-object/report-object.component';
import {MatInputModule} from '@angular/material/input';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatRadioModule} from '@angular/material/radio';
import {CoreModule} from '../../core/core.module';
import {ReportsComponent} from './reports/reports.component';
import {ReportFilesComponent} from './reportFiles/reportFiles.component';
import {QueryPreviewDialogComponent} from './report/report-object/query-preview/query-preview-dialog.component';
import {MatDialogModule} from '@angular/material/dialog';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDatepickerModule} from "@angular/material/datepicker";

const templateList: Route = { path: 'reporting/templates', pathMatch: 'full', component: TemplatesComponent, data: { header: 'Templates' } };
const reportsList: Route = { path: 'reporting/reports', pathMatch: 'full', component: ReportsComponent, data: { header: 'Reports' } };
const newReport: Route = { path: 'reporting/new/:templateId', pathMatch: 'full', component: ReportComponent, data: { header: 'New Report' } };
const editReport: Route = { path: 'reporting/edit/:reportId', pathMatch: 'full', component: ReportComponent, data: { header: 'Edit Report' } };
const reportFilesList: Route = { path: 'reporting/files/:reportId', pathMatch: 'full', component: ReportFilesComponent, data: { header: 'Report Files' } };

@NgModule({
    declarations: [TemplatesComponent, ReportComponent, ReportObjectComponent, ReportsComponent, ReportFilesComponent, QueryPreviewDialogComponent],
    imports: [
        RouterModule.forChild([templateList, reportsList, newReport, editReport, reportFilesList]),
        CommonModule,
        FlexModule,
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatPaginatorModule,
        MatSelectModule,
        MatAutocompleteModule,
        MatFormFieldModule,
        MatSortModule,
        MatTableModule,
        MatTooltipModule,
        MatCardModule,
        MatInputModule,
        ReactiveFormsModule,
        FormsModule,
        MatRadioModule,
        CoreModule,
        MatDialogModule,
        MatExpansionModule,
        MatDatepickerModule
    ]
})
export class ReportingModule { }
