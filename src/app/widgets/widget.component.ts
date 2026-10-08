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

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { WidgetModel } from '../modules/dashboard/shared/dashboard-widget.model';
import { SwitchComponent } from './switch/switch.component';
import { RangeSliderComponent } from './range-slider/range-slider.component';
import { DevicesStateComponent } from './devices-state/devices-state.component';
import { ProcessStateComponent } from './process-state/process-state.component';
import { EventListComponent } from './event-list/event-list.component';
import { RankingListComponent } from './ranking-list/ranking-list.component';
import { ChartsExportComponent } from './charts/export/charts-export.component';
import { ChartsProcessInstancesComponent } from './charts/process/process-instances/charts-process-instances.component';
import { ChartsProcessDeploymentsComponent } from './charts/process/process-deployments/charts-process-deployments.component';
import { DeviceDowntimeGatewayComponent } from './charts/device/device-downtime-gateway/device-downtime-gateway.component';
import { DeviceTotalDowntimeComponent } from './charts/device/device-total-downtime/device-total-downtime.component';
import { DeviceGatewayComponent } from './charts/device/device-gateway/device-gateway.component';
import { ProcessModelListComponent } from './process-model-list/process-model-list.component';
import { DeviceDowntimeListComponent } from './device-downtime-list/device-downtime-list.component';
import { SingleValueComponent } from './single-value/single-value.component';
import { MultiValueComponent } from './multi-value/multi-value.component';
import { EnergyPredictionComponent } from './energy-prediction/energy-prediction.component';
import { AirQualityComponent } from './air-quality/air-quality.component';
import { ProcessIncidentListComponent } from './process-incident-list/process-incident-list.component';
import { ProcessSchedulerComponent } from './process-scheduler/process-scheduler.component';
import { DeviceStatusComponent } from './device-status/device-status.component';
import { DataTableComponent } from './data-table/data-table.component';
import { AcControlComponent } from './ac-control/ac-control.component';
import { AnomalyComponent } from './anomaly/anomaly.component';
import { OpenWindowComponent } from './charts/open-window/open-window.component';
import { FakeAnomalyComponent } from './anomaly/fake/fake.component';
import { PvPredictionComponent } from './pv-prediction/pv-prediction.component';
import { PvLoadRecommendationComponent } from './pv-load-recommendation/pv-load-recommendation.component';
import { LeakageDetectionComponent } from './leakage-detection/leakage-detection.component';
import { ConsumptionProfileComponent } from './consumption-profile/consumption-profile.component';
import { BadVentilationComponent } from './bad-ventilation/bad-ventilation.component';
import { FloorplanComponent } from './floorplan/floorplan.component';

@Component({
    selector: 'senergy-widget',
    templateUrl: './widget.component.html',
    styleUrls: ['./widget.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SwitchComponent, RangeSliderComponent, DevicesStateComponent, ProcessStateComponent, EventListComponent, RankingListComponent, ChartsExportComponent, ChartsProcessInstancesComponent, ChartsProcessDeploymentsComponent, DeviceDowntimeGatewayComponent, DeviceTotalDowntimeComponent, DeviceGatewayComponent, ProcessModelListComponent, DeviceDowntimeListComponent, SingleValueComponent, MultiValueComponent, EnergyPredictionComponent, AirQualityComponent, ProcessIncidentListComponent, ProcessSchedulerComponent, DeviceStatusComponent, DataTableComponent, AcControlComponent, AnomalyComponent, OpenWindowComponent, FakeAnomalyComponent, PvPredictionComponent, PvLoadRecommendationComponent, LeakageDetectionComponent, ConsumptionProfileComponent, BadVentilationComponent, FloorplanComponent]
})
export class WidgetComponent {
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    @Input() initialWidgetData: any;

    constructor() {}

}
