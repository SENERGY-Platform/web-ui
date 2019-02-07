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
import {DashboardComponent} from './dashboard.component';
import {
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatOptionModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule
} from '@angular/material';
import {CommonModule} from '@angular/common';
import {FlexLayoutModule} from '@angular/flex-layout';
import {DashboardNewDialogComponent} from './dialogs/dashboard-new-dialog.component';
import {WidgetModule} from '../../widgets/widget.module';
import {DashboardNewWidgetDialogComponent} from './dialogs/dashboard-new-widget-dialog.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {GridsterModule} from 'angular-gridster2';
import {DashboardEditDialogComponent} from './dialogs/dashboard-edit-dialog.component';


@NgModule({
    imports: [MatTabsModule,
        MatIconModule,
        MatButtonModule,
        CommonModule,
        MatGridListModule,
        FlexLayoutModule,
        MatDividerModule,
        MatMenuModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        WidgetModule,
        MatSelectModule,
        MatOptionModule,
        FormsModule,
        GridsterModule,
        MatTooltipModule,
        ReactiveFormsModule,
    ],
    declarations: [
        DashboardComponent,
        DashboardNewDialogComponent,
        DashboardNewWidgetDialogComponent,
        DashboardEditDialogComponent,
    ],
    entryComponents: [DashboardNewDialogComponent,
        DashboardNewWidgetDialogComponent,
        DashboardEditDialogComponent]
})
export class DashboardModule {
}
