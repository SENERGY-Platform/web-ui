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

import {LOCALE_ID, NgModule} from '@angular/core';
import {SwitchComponent} from './switch/switch.component';
import {FlexLayoutModule} from '@angular/flex-layout';
import {WidgetHeaderComponent} from './components/widget-header/widget-header.component';
import {SwitchEditDialogComponent} from './switch/dialogs/switch-edit-dialog.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule, DecimalPipe, registerLocaleData} from '@angular/common';
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
import {MultiValueComponent} from './multi-value/multi-value.component';
import {MultiValueEditDialogComponent} from './multi-value/dialog/multi-value-edit-dialog.component';
import {ProcessIncidentListComponent} from './process-incident-list/process-incident-list.component';
import {ProcessIncidentListEditDialogComponent} from './process-incident-list/dialogs/process-incident-list-edit-dialog.component';
import {MatCardModule} from '@angular/material/card';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {MatDividerModule} from '@angular/material/divider';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatOptionModule} from '@angular/material/core';
import {MatInputModule} from '@angular/material/input';
import {MatTableModule} from '@angular/material/table';
import {MatSelectModule} from '@angular/material/select';
import {MatListModule} from '@angular/material/list';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatStepperModule} from '@angular/material/stepper';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatRadioModule} from '@angular/material/radio';
import {MatSortModule} from '@angular/material/sort';
import {ProcessSchedulerComponent} from './process-scheduler/process-scheduler.component';
import {ProcessSchedulerScheduleDialogComponent} from './process-scheduler/dialogs/process-scheduler-schedule-dialog.component';
import {ProcessSchedulerScheduleEditDialogComponent} from './process-scheduler/dialogs/process-scheduler-schedule-edit-dialog.component';
import {DeviceStatusComponent} from './device-status/device-status.component';
import {DeviceStatusEditDialogComponent} from './device-status/dialog/device-status-edit-dialog.component';
import {DataTableComponent} from './data-table/data-table.component';
import {DataTableEditDialogComponent} from './data-table/dialog/data-table-edit-dialog.component';
import {RangeSliderComponent} from './range-slider/range-slider.component';
import {RangeSliderEditDialogComponent} from './range-slider/dialogs/range-slider-edit-dialog.component';
import {MatSliderModule} from '@angular/material/slider';
import { AcControlComponent } from './ac-control/ac-control.component';
import {AcControlEditDialogComponent} from './ac-control/dialog/ac-control-edit-dialog.component';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { ValueComponent } from './single-value/value/value.component';
import { AnomalyComponent } from './anomaly/anomaly.component';
import { EditComponent } from './anomaly/dialog/edit/edit.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AddRuleComponent } from './charts/export/dialog/add-rule/add-rule.component';
import { ListRulesComponent } from './charts/export/dialog/list-rules/list-rules.component';
import { OpenWindowComponent } from './charts/open-window/open-window.component';
import { TimelineComponent } from './charts/shared/chart-types/timeline/timeline.component';
import { DataSourceSelectorComponent } from './charts/shared/data-source-selector/data-source-selector.component';
import { OpenWindowEditComponent } from './charts/open-window/dialog/edit/edit.component';

registerLocaleData(localeDe, 'de');

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
        MatRadioModule,
        MatSortModule,
        MatSliderModule,
        MatDatepickerModule,
        NgApexchartsModule
    ],
    declarations: [
        RangeSliderComponent,
        RangeSliderEditDialogComponent,
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
        ProcessSchedulerComponent,
        ProcessSchedulerScheduleDialogComponent,
        ProcessSchedulerScheduleEditDialogComponent,
        DeviceStatusComponent,
        DeviceStatusEditDialogComponent,
        DataTableComponent,
        DataTableEditDialogComponent,
        AcControlComponent,
        AcControlEditDialogComponent,
        ValueComponent,
        AnomalyComponent,
        EditComponent,
        AddRuleComponent,
        ListRulesComponent,
        OpenWindowComponent,
        TimelineComponent,
        DataSourceSelectorComponent,
        OpenWindowEditComponent
    ],
    exports: [
        SwitchComponent,
        RangeSliderComponent,
        WidgetHeaderComponent,
        DevicesStateComponent,
        EventListComponent,
        ChartsExportComponent,
        ChartsProcessInstancesComponent,
        RankingListComponent,
        WidgetSpinnerComponent,
        WidgetComponent,
        WidgetFooterComponent
    ],
    providers: [
        {provide: LOCALE_ID, useValue: 'de'},
        DecimalPipe,
    ],
})
export class WidgetModule {
}
