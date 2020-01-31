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

import {SwitchPropertiesModel} from '../../../widgets/switch/shared/switch-properties.model';
import {ChartsExportPropertiesModel} from '../../../widgets/charts/export/shared/charts-export-properties.model';
import {DeviceDowntimeGatewayPropertiesModel} from '../../../widgets/charts/device/device-downtime-gateway/shared/device-downtime-gateway-properties.model';
import {EnergyPredictionPropertiesModel} from '../../../widgets/energy-prediction/shared/energy-prediction.model';
import {AirQualityPropertiesModel} from '../../../widgets/air-quality/shared/air-quality.model';
import {SingleValuePropertiesModel} from '../../../widgets/single-value/shared/single-value.model';
import {MultiValuePropertiesModel} from '../../../widgets/multi-value/shared/multi-value.model';
import {ProcessIncidentPropertiesModel} from '../../../widgets/process-incident-list/shared/process-incident-properties.model';

export interface WidgetModel {
    id: string;
    name: string;
    type: string;
    properties: WidgetPropertiesModels;
    x?: number;
    y?: number;
}

export interface WidgetPropertiesModels extends SwitchPropertiesModel, ChartsExportPropertiesModel, DeviceDowntimeGatewayPropertiesModel,
    EnergyPredictionPropertiesModel, AirQualityPropertiesModel, SingleValuePropertiesModel, MultiValuePropertiesModel, ProcessIncidentPropertiesModel {
}
