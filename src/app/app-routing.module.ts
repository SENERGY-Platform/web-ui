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

import {StartComponent} from './modules/start/start.component';
import {DashboardComponent} from './modules/dashboard/dashboard.component';

const init = {path: '', redirectTo: '/dashboard', pathMatch: 'full'};
const start = {path: 'start', pathMatch: 'full',  component: StartComponent};
const dashboard = {path: 'dashboard', pathMatch: 'full',  component: DashboardComponent};

@NgModule({
    imports: [RouterModule.forRoot([init, start, dashboard])]
})
export class AppRoutingModule {

}


