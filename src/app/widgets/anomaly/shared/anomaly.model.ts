/*
 * Copyright 2025 InfAI (CC SES)
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

import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ChartsExportMeasurementModel, ChartsExportVAxesModel } from '../../charts/export/shared/charts-export-properties.model';
import { DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';

export interface AnomaliesPerDevice {
    [device_id: string]: AnomalyResultModel[];
}

export interface AnomalyResultModel {
    value: string;
    type: string;
    subType: string;
    timestamp: string;
    start_time: string;
    end_time: string;
    threshold: number;
    mean: number;
    initial_phase: string;
    device_id: string;
    original_reconstructed_curves: [number, number, number][]; // list of data points. [0]=timestamp [1]=trueValue [2]=reconstructedValue
    lower_bound?: number;
    upper_bound?: number;
}

export interface AnomalyWidgetTimeline {
    hAxisLabel?: string;
    vAxisLabel?: string;
}

export interface AnomalyWidgetProperties {
    showDebug: boolean;
    showFrequencyAnomalies: boolean;
    export: string;
    timelineConfig: AnomalyWidgetTimeline;
    timeRangeConfig: {
        timeRange: { // This extra key is needed, so that it can be passed directly in the data source selector component which expects this key for time range configs
            time?: number;
            start?: string;
            end?: string;
            level?: string;
            type?: string;
        };
    };
    deviceValueConfig: {
        exports: (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[];
        fields: ChartsExportVAxesModel[];
    };
    visualizationType: string;
}

export interface AnomalyWidgetPropertiesModel {
    anomalyDetection?: AnomalyWidgetProperties;
}

export interface DeviceValue {
    timestamp: string;
    value: number;
}