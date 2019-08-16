/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {NgModule} from '@angular/core';

import {RouterModule} from '@angular/router';
import {
    MatButtonModule, MatDialogModule, MatFormFieldModule,
    MatGridListModule,
    MatIconModule, MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule
} from '@angular/material';
import {FlexLayoutModule} from '@angular/flex-layout';
import {CommonModule} from '@angular/common';
import {CoreModule} from '../../../core/core.module';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CharacteristicsComponent} from './characteristics/characteristics.component';
import {CharacteristicsNewDialogComponent} from './characteristics/dialogs/characteristics-new-dialog.component';

const characteristics = {path: 'devices/concepts/:id', pathMatch: 'full', component: CharacteristicsComponent, data: { header: 'Devices' }};

@NgModule({
    imports: [
        FlexLayoutModule,
        MatIconModule,
        MatButtonModule,
        CommonModule,
        CoreModule,
        FormsModule,
        ReactiveFormsModule,
        InfiniteScrollModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        MatGridListModule,
        MatMenuModule,
        MatFormFieldModule,
        MatDialogModule,
        RouterModule.forChild([characteristics]),
    ],
    declarations: [
        CharacteristicsComponent,
        CharacteristicsNewDialogComponent,
    ],
    entryComponents: [
        CharacteristicsNewDialogComponent,
    ]
})
export class ConceptsModule {
}
