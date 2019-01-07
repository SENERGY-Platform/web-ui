/*
 * Copyright 2019 InfAI (CC SES)
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

import {CoreModule} from "../../core/core.module";
import {ProcessRepoComponent} from "../processes/process-repo/process-repo.component";
import {ProcessDeploymentsComponent} from "../processes/deployments/deployments.component";
import {ProcessMonitorComponent} from "../processes/monitor/monitor.component";
import {ProcessDesignerComponent} from "../processes/designer/designer.component";

const processRepo = {path: 'processes/repository', pathMatch: 'full', component: ProcessRepoComponent, data: { header: 'Processes' }};
const processDeployments = {path: 'processes/deployments', pathMatch: 'full', component: ProcessDeploymentsComponent, data: { header: 'Processes' }};
const processMonitor = {path: 'processes/monitor', pathMatch: 'full', component: ProcessMonitorComponent, data: { header: 'Processes' }};
const processEdit = {path: 'processes/designer', pathMatch: 'full', component: ProcessDesignerComponent, data: { header: 'Processes' }};
const processDesigner = {path: 'processes/designer/:id', pathMatch: 'full', component: ProcessDesignerComponent, data: { header: 'Processes' }};

@NgModule({
    imports: [
        RouterModule.forChild([processRepo, processDeployments, processMonitor, processEdit, processDesigner]),
        CoreModule
    ],
    declarations: [
        ProcessRepoComponent,
        ProcessDeploymentsComponent,
        ProcessMonitorComponent,
        ProcessDesignerComponent
    ],
})

export class ProcessesModule {
}