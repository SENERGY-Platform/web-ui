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

import { Route, RouterModule } from '@angular/router';
import { OperatorRepoComponent } from './operator-repo/operator-repo.component';
import { CommonModule } from '@angular/common';
import { CoreModule } from '../../core/core.module';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { OperatorRepoModule } from './operator-repo/operator-repo.module';
import { ExportModule } from '../exports/export.module';
import { FlowDesignerComponent } from './flow-designer/flow-designer.component';
import { FormsModule } from '@angular/forms';
import { FlowRepoComponent } from './flow-repo/flow-repo.component';
import { FlowRepoModule } from './flow-repo/flow-repo.module';
import { PipelineRegistryComponent } from './pipeline-registry/pipeline-registry.component';
import { PipelineRegistryModule } from './pipeline-registry/pipeline-registry.module';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSortModule } from '@angular/material/sort';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { CostModule } from '../cost/cost.module';

const operatorRepo: Route = { path: 'data/operator-repo', pathMatch: 'full', component: OperatorRepoComponent, data: { header: 'Operators' } };
const designer: Route = { path: 'data/designer', pathMatch: 'full', component: FlowDesignerComponent, data: { header: 'Designer' } };
const designerEdit: Route = { path: 'data/designer/:id', pathMatch: 'full', component: FlowDesignerComponent, data: { header: 'Designer' } };
const flowRepo: Route = { path: 'data/flow-repo', pathMatch: 'full', component: FlowRepoComponent, data: { header: 'Flows' } };
const pipelineRegistry: Route = { path: 'data/pipelines', pathMatch: 'full', component: PipelineRegistryComponent, data: { header: 'Pipelines' } };

@NgModule({
    imports: [
        RouterModule.forChild([operatorRepo, designer, designerEdit, flowRepo, pipelineRegistry]),
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
        MatPaginatorModule,
        FlexLayoutModule,
        MatButtonModule,
        MatSnackBarModule,
        FormsModule,
        MatTableModule,
        MatInputModule,
        MatCardModule,
        MatSortModule,
        InfiniteScrollModule,
        MatCheckboxModule,
        MatOptionModule,
        CostModule,
    ],
    declarations: [OperatorRepoComponent, FlowDesignerComponent, FlowRepoComponent, PipelineRegistryComponent],
})
export class DataModule {}
