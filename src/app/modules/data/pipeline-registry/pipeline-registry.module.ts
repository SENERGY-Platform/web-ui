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
import {CommonModule} from '@angular/common';
import {CoreModule} from '../../../core/core.module';
import {PipelineDetailsComponent} from './pipeline-details/pipeline-details.component';
import {MatButtonModule, MatCardModule, MatExpansionModule, MatIconModule} from '@angular/material';


const details = {path: 'data/pipelines/details/:id', pathMatch: 'full', component: PipelineDetailsComponent, data: { header: 'Analytics' }};

@NgModule({
    imports: [
        RouterModule.forChild([details]),
        CoreModule,
        CommonModule,
        MatExpansionModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule
    ],
    declarations: [
        PipelineDetailsComponent
    ],
})
export class PipelineRegistryModule {
}
