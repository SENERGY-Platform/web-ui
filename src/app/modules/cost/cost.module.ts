/*
 * Copyright 2023 InfAI (CC SES)
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
import { CostOverviewComponent } from './cost-overview/cost-overview.component';
import { RouterModule } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { CoreModule } from 'src/app/core/core.module';
import { CostElementComponent } from './cost-element/cost-element.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MtxSelectModule } from '@ng-matero/extensions/select';



@NgModule({
    declarations: [
        CostOverviewComponent,
        CostElementComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild([ { path: 'costs/overview', pathMatch: 'full', component: CostOverviewComponent, data: { header: 'Cost Overview' } }]),
        MatExpansionModule,
        CoreModule,
        MatIconModule,
        MatTooltipModule,
        MatFormFieldModule,
        MatDatepickerModule,
        ReactiveFormsModule,
        MatInputModule,
        MtxSelectModule,
    ]
})
export class CostModule { }
