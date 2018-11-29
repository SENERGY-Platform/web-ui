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

import {DashboardComponent} from './dashboard/dashboard.component';
import {ScheduleComponent} from './schedule/schedule.component';
import {RouterModule} from '@angular/router';


const dashboard = {path: 'apps/dashboard', pathMatch: 'full', component: DashboardComponent, data: { header: 'Applications' }};
const schedule = {path: 'apps/schedule', pathMatch: 'full', component: ScheduleComponent,  data: { header: 'Applications' } };

@NgModule({
    imports: [RouterModule.forChild([dashboard, schedule])],
    declarations: [
        DashboardComponent,
        ScheduleComponent,
    ],
})
export class AppsModule {
}
