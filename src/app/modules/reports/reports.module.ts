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
import {FlexModule} from '@angular/flex-layout';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';
import {MatTooltipModule} from '@angular/material/tooltip';
import {ReportComponent} from './report/report.component';
import {MatCardModule} from '@angular/material/card';
import {ReportObjectComponent} from './report/report-object/report-object.component';
import {MatInputModule} from '@angular/material/input';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatRadioModule} from "@angular/material/radio";
import {CoreModule} from "../../core/core.module";

const templateList: Route = { path: 'reports/templates', pathMatch: 'full', component: TemplatesComponent, data: { header: 'Templates' } };
const newReport: Route = { path: 'reports/new/:templateId', pathMatch: 'full', component: ReportComponent, data: { header: 'Report' } };

@NgModule({
  declarations: [TemplatesComponent, ReportComponent, ReportObjectComponent],
    imports: [
        RouterModule.forChild([templateList, newReport]),
        CommonModule,
        FlexModule,
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatPaginatorModule,
        MatSortModule,
        MatTableModule,
        MatTooltipModule,
        MatCardModule,
        MatInputModule,
        ReactiveFormsModule,
        FormsModule,
        MatRadioModule,
        CoreModule
    ]
})
export class ReportsModule { }
