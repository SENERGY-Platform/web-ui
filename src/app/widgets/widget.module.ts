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

import {LOCALE_ID, NgModule} from '@angular/core';
import {SwitchComponent} from './switch/switch.component';
import {
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatDividerModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatListModule,
    MatMenuModule, MatOptionModule, MatProgressSpinnerModule, MatSelectModule,
    MatSlideToggleModule, MatTableModule, MatTooltipModule
} from '@angular/material';
import {FlexLayoutModule} from '@angular/flex-layout';
import {WidgetHeaderComponent} from './components/widget-header/widget-header.component';
import {SwitchEditDialogComponent} from './switch/dialogs/switch-edit-dialog.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule, registerLocaleData} from '@angular/common';
import {WidgetHeaderDeleteDialogComponent} from './components/widget-header/dialogs/widget-header-delete-dialog.component';
import {DevicesStateComponent} from './devices-state/devices-state.component';
import {DevicesStateEditDialogComponent} from './devices-state/dialog/devices-state-edit-dialog.component';
import {EventListComponent} from './event-list/event-list.component';
import {EventListEditDialogComponent} from './event-list/dialogs/event-list-edit-dialog.component';
import {ChartsExportComponent} from './charts/export/charts-export.component';
import {ChartsProcessInstancesComponent} from './charts/process/process-instances/charts-process-instances.component';
import {Ng2GoogleChartsModule} from 'ng2-google-charts';
import {ChartsProcessInstancesEditDialogComponent} from './charts/process/process-instances/dialogs/charts-process-instances-edit-dialog.component';
import {ChartsExportEditDialogComponent} from './charts/export/dialog/charts-export-edit-dialog.component';
import localeDe from '@angular/common/locales/de';
import {RankingListComponent} from './ranking-list/ranking-list.component';
import {CoreModule} from '../core/core.module';
import {WidgetSpinnerComponent} from './components/widget-spinner/widget-spinner.component';
import {RankingListEditDialogComponent} from './ranking-list/dialogs/ranking-list-edit-dialog.component';
import {GridsterModule} from 'angular-gridster2';
import {WidgetComponent} from './widget.component';
import {ChartsProcessDeploymentsComponent} from './charts/process/process-deployments/charts-process-deployments.component';
import {ChartsProcessDeploymentsEditDialogComponent} from './charts/process/process-deployments/dialogs/charts-process-deployments-edit-dialog.component';

registerLocaleData(localeDe, 'de'); // todo: language;

@NgModule({
    imports: [
        MatCardModule,
        MatMenuModule,
        MatIconModule,
        MatDividerModule,
        MatSlideToggleModule,
        MatButtonModule,
        FlexLayoutModule,
        MatDialogModule,
        MatFormFieldModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        FormsModule,
        MatOptionModule,
        CommonModule,
        MatInputModule,
        MatTableModule,
        MatSelectModule,
        MatListModule,
        Ng2GoogleChartsModule,
        CoreModule,
        MatProgressSpinnerModule,
        GridsterModule,
        MatTooltipModule,
    ],
    declarations: [
        SwitchComponent,
        WidgetHeaderComponent,
        SwitchEditDialogComponent,
        WidgetHeaderDeleteDialogComponent,
        DevicesStateComponent,
        DevicesStateEditDialogComponent,
        EventListComponent,
        EventListEditDialogComponent,
        ChartsExportComponent,
        ChartsProcessInstancesComponent,
        ChartsProcessInstancesEditDialogComponent,
        ChartsExportEditDialogComponent,
        RankingListComponent,
        RankingListEditDialogComponent,
        WidgetSpinnerComponent,
        WidgetComponent,
        ChartsProcessDeploymentsComponent,
        ChartsProcessDeploymentsEditDialogComponent,
    ],
    exports: [
        SwitchComponent,
        WidgetHeaderComponent,
        DevicesStateComponent,
        EventListComponent,
        ChartsExportComponent,
        ChartsProcessInstancesComponent,
        RankingListComponent,
        WidgetSpinnerComponent,
        WidgetComponent,
    ],
    entryComponents: [
        SwitchEditDialogComponent,
        WidgetHeaderDeleteDialogComponent,
        DevicesStateEditDialogComponent,
        EventListEditDialogComponent,
        ChartsProcessInstancesEditDialogComponent,
        ChartsExportEditDialogComponent,
        RankingListEditDialogComponent,
        ChartsProcessDeploymentsEditDialogComponent,
    ],
    providers: [{provide: LOCALE_ID, useValue: 'de'}] // todo: language;

})

export class WidgetModule {

}