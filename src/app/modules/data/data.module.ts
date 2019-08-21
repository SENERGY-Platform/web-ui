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
import {OperatorRepoComponent} from './operator-repo/operator-repo.component';
import {CommonModule} from '@angular/common';
import {
    MatButtonModule, MatCardModule,
    MatDividerModule,
    MatGridListModule,
    MatIconModule, MatInputModule,
    MatListModule, MatSnackBarModule, MatSortModule, MatTableModule,
    MatTooltipModule
} from '@angular/material';
import {CoreModule} from '../../core/core.module';
import {FlexLayoutModule} from '@angular/flex-layout';
import {OperatorRepoModule} from './operator-repo/operator-repo.module';
import {ExportComponent} from './export/export.component';
import {ExportModule} from './export/export.module';
import {FlowDesignerComponent} from './flow-designer/flow-designer.component';
import {FormsModule} from '@angular/forms';
import {FlowRepoComponent} from './flow-repo/flow-repo.component';
import {FlowRepoModule} from './flow-repo/flow-repo.module';
import {PipelineRegistryComponent} from './pipeline-registry/pipeline-registry.component';
import {PipelineRegistryModule} from './pipeline-registry/pipeline-registry.module';


const operatorRepo = {path: 'data/operator-repo', pathMatch: 'full', component: OperatorRepoComponent, data: { header: 'Analytics' }};
const dataExport = {path: 'data/export', pathMatch: 'full', component: ExportComponent, data: { header: 'Analytics' }};
const designer = {path: 'data/designer', pathMatch: 'full', component: FlowDesignerComponent, data: { header: 'Analytics' }};
const designerEdit = {path: 'data/designer/:id', pathMatch: 'full', component: FlowDesignerComponent, data: { header: 'Analytics' }};
const flowRepo = {path: 'data/flow-repo', pathMatch: 'full', component: FlowRepoComponent, data: { header: 'Analytics' }};
const pipelineRegistry = {path: 'data/pipelines', pathMatch: 'full', component: PipelineRegistryComponent, data: { header: 'Analytics' }};

@NgModule({
    imports: [
        RouterModule.forChild([operatorRepo, dataExport, designer, designerEdit, flowRepo, pipelineRegistry]),
        CoreModule,
        OperatorRepoModule,
        FlowRepoModule,
        ExportModule,
        PipelineRegistryModule,
        CommonModule,
        MatGridListModule,
        MatIconModule,
        MatTooltipModule,
        MatDividerModule,
        MatListModule,
        FlexLayoutModule,
        MatButtonModule,
        MatSnackBarModule,
        FormsModule,
        MatTableModule,
        MatInputModule,
        MatCardModule,
        MatSortModule
    ],
    declarations: [
        OperatorRepoComponent,
        ExportComponent,
        FlowDesignerComponent,
        FlowRepoComponent,
        PipelineRegistryComponent
    ],
})
export class DataModule {
}
