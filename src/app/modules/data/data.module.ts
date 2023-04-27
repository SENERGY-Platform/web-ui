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

import {Route, RouterModule} from '@angular/router';
import {OperatorRepoComponent} from './operator-repo/operator-repo.component';
import {CommonModule} from '@angular/common';
import {CoreModule} from '../../core/core.module';
import {FlexLayoutModule} from '@angular/flex-layout';
import {OperatorRepoModule} from './operator-repo/operator-repo.module';
import {ExportModule} from '../exports/export.module';
import {FlowDesignerComponent} from './flow-designer/flow-designer.component';
import {FormsModule} from '@angular/forms';
import {FlowRepoComponent} from './flow-repo/flow-repo.component';
import {FlowRepoModule} from './flow-repo/flow-repo.module';
import {PipelineRegistryComponent} from './pipeline-registry/pipeline-registry.component';
import {PipelineRegistryModule} from './pipeline-registry/pipeline-registry.module';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {MatDividerModule} from '@angular/material/divider';
import {MatLegacyListModule as MatListModule} from '@angular/material/legacy-list';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatSortModule} from '@angular/material/sort';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyOptionModule as MatOptionModule} from '@angular/material/legacy-core';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatLegacyPaginatorModule as MatPaginatorModule} from '@angular/material/legacy-paginator';

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
        MatSelectModule,
    ],
    declarations: [OperatorRepoComponent, FlowDesignerComponent, FlowRepoComponent, PipelineRegistryComponent],
})
export class DataModule {}
