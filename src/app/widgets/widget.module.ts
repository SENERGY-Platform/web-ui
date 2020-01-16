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
    MatCheckboxModule,
    MatDialogModule,
    MatDividerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatTableModule,
    MatTooltipModule
} from '@angular/material';
import {FlexLayoutModule} from '@angular/flex-layout';
import {WidgetHeaderComponent} from './components/widget-header/widget-header.component';
import {SwitchEditDialogComponent} from './switch/dialogs/switch-edit-dialog.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule, registerLocaleData} from '@angular/common';
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
import {DeviceDowntimeGatewayComponent} from './charts/device/device-downtime-gateway/device-downtime-gateway.component';
import {DeviceDowntimeGatewayEditDialogComponent} from './charts/device/device-downtime-gateway/dialogs/device-downtime-gateway-edit-dialog.component';
import {WidgetFooterComponent} from './components/widget-footer/widget-footer.component';
import {DeviceTotalDowntimeComponent} from './charts/device/device-total-downtime/device-total-downtime.component';
import {DeviceTotalDowntimeEditDialogComponent} from './charts/device/device-total-downtime/dialogs/device-total-downtime-edit-dialog.component';
import {DeviceGatewayComponent} from './charts/device/device-gateway/device-gateway.component';
import {DeviceGatewayEditDialogComponent} from './charts/device/device-gateway/dialogs/device-gateway-edit-dialog.component';
import {ProcessStateComponent} from './process-state/process-state.component';
import {ProcessStateEditDialogComponent} from './process-state/dialog/process-state-edit-dialog.component';
import {ProcessModelListComponent} from './process-model-list/process-model-list.component';
import {ProcessModelListEditDialogComponent} from './process-model-list/dialogs/process-model-list-edit-dialog.component';
import {DeviceDowntimeListComponent} from './device-downtime-list/device-downtime-list.component';
import {DeviceDowntimeListEditDialogComponent} from './device-downtime-list/dialogs/device-downtime-list-edit-dialog.component';
import {RouterModule} from '@angular/router';
import {SingleValueComponent} from './single-value/single-value.component';
import {SingleValueEditDialogComponent} from './single-value/dialog/single-value-edit-dialog.component';
import {EnergyPredictionComponent} from './energy-prediction/energy-prediction.component';
import {EnergyPredictionEditDialogComponent} from './energy-prediction/dialog/energy-prediction-edit-dialog.component';
import {AirQualityComponent} from './air-quality/air-quality.component';
import {AirQualityEditDialogComponent} from './air-quality/dialog/air-quality-edit-dialog.component';
import {AngularFittextModule} from 'angular-fittext';
import {MultiValueComponent} from './multi-value/multi-value.component';
import {MultiValueEditDialogComponent} from './multi-value/dialog/multi-value-edit-dialog.component';
import {ProcessIncidentListComponent} from './process-incident-list/process-incident-list.component';
import {ProcessIncidentListEditDialogComponent} from './process-incident-list/dialogs/process-incident-list-edit-dialog.component';

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
        MatCheckboxModule,
        RouterModule,
        MatStepperModule,
        MatGridListModule,
        MatExpansionModule,
        AngularFittextModule
    ],
    declarations: [
        SwitchComponent,
        WidgetHeaderComponent,
        SwitchEditDialogComponent,
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
        DeviceDowntimeGatewayComponent,
        DeviceDowntimeGatewayEditDialogComponent,
        WidgetFooterComponent,
        DeviceTotalDowntimeComponent,
        DeviceTotalDowntimeEditDialogComponent,
        DeviceGatewayComponent,
        DeviceGatewayEditDialogComponent,
        ProcessStateComponent,
        ProcessStateEditDialogComponent,
        ProcessModelListComponent,
        ProcessModelListEditDialogComponent,
        DeviceDowntimeListComponent,
        DeviceDowntimeListEditDialogComponent,
        SingleValueComponent,
        SingleValueEditDialogComponent,
        MultiValueComponent,
        MultiValueEditDialogComponent,
        EnergyPredictionComponent,
        EnergyPredictionEditDialogComponent,
        AirQualityComponent,
        AirQualityEditDialogComponent,
        ProcessIncidentListComponent,
        ProcessIncidentListEditDialogComponent,
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
        WidgetFooterComponent,
    ],
    entryComponents: [
        SwitchEditDialogComponent,
        DevicesStateEditDialogComponent,
        EventListEditDialogComponent,
        ChartsProcessInstancesEditDialogComponent,
        ChartsExportEditDialogComponent,
        RankingListEditDialogComponent,
        ChartsProcessDeploymentsEditDialogComponent,
        DeviceDowntimeGatewayEditDialogComponent,
        DeviceTotalDowntimeEditDialogComponent,
        DeviceGatewayEditDialogComponent,
        ProcessStateEditDialogComponent,
        ProcessModelListEditDialogComponent,
        DeviceDowntimeListEditDialogComponent,
        SingleValueEditDialogComponent,
        MultiValueEditDialogComponent,
        EnergyPredictionEditDialogComponent,
        AirQualityEditDialogComponent,
        ProcessIncidentListEditDialogComponent
    ],
    providers: [{provide: LOCALE_ID, useValue: 'de'}] // todo: language;

})

export class WidgetModule {

}
