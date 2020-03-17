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

import {RouterModule} from '@angular/router';
import {CommonModule} from '@angular/common';
import {CoreModule} from '../../../core/core.module';
import {FlexLayoutModule} from '@angular/flex-layout';
import {OperatorComponent} from './operator/operator.component';
import {FormsModule} from '@angular/forms';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatDividerModule} from '@angular/material/divider';
import {MatListModule} from '@angular/material/list';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSelectModule} from '@angular/material/select';


const operator = {path: 'data/operator-repo/op', pathMatch: 'full', component: OperatorComponent, data: { header: 'Analytics' }};
const operatorEdit = {path: 'data/operator-repo/op/:id', pathMatch: 'full', component: OperatorComponent, data: { header: 'Analytics' }};

@NgModule({
    imports: [
        RouterModule.forChild([operator, operatorEdit]),
        CoreModule,
        CommonModule,
        MatGridListModule,
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
        MatSelectModule

    ],
    declarations: [
        OperatorComponent
    ],
})
export class OperatorRepoModule {
}
