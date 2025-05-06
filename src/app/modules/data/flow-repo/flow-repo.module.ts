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
import { CoreModule } from '../../../core/core.module';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DeployFlowComponent } from './deploy-flow/deploy-flow.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { DeployFlowClassicComponent } from './deploy-flow/classic/deploy-flow-component-classic.component';
import { MtxOption, MtxSelect } from '@ng-matero/extensions/select';

const deploy: Route = { path: 'data/flow-repo/deploy/:id', pathMatch: 'full', component: DeployFlowComponent, data: { header: 'Analytics' } };
const deployClassic: Route = {
    path: 'data/flow-repo/deploy-classic/:id',
    pathMatch: 'full',
    component: DeployFlowClassicComponent,
    data: { header: 'Analytics' },
};

@NgModule({
    imports: [
        RouterModule.forChild([deploy, deployClassic]),
        CoreModule,
        CommonModule,
        MatGridListModule,
        MatExpansionModule,
        MatIconModule,
        MatTooltipModule,
        MatDividerModule,
        MatListModule,
        FlexLayoutModule,
        MatButtonModule,
        MatFormFieldModule,
        MatDialogModule,
        MatInputModule,
        FormsModule,
        MatCheckboxModule,
        MatCardModule,
        ReactiveFormsModule,
        MtxSelect,
        MtxOption,
    ],
    declarations: [DeployFlowComponent, DeployFlowClassicComponent],
})
export class FlowRepoModule {}
