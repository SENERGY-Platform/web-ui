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

export interface DeviceValue {
    timestamp: string;
    value: number;
}

export interface VentilationResult {
    humidity_too_fast_too_high: string;
    window_open: boolean;
    timestamp: string;
}

export interface VentilationWidgetProperties {
    deviceConfig: {
        exports: DeviceInstanceModel[];
        fields: ChartsExportVAxesModel[];
    };
    exportConfig: {
        exports: ChartsExportMeasurementModel[];
    };
    timeRangeConfig: {
        timeRange: { // This extra key is needed, so that it can be passed directly in the data source selector component which expects this key for time range configs
            time?: number;
            start?: string;
            end?: string;
            level?: string;
            type?: string;
        };
    };
}

export interface VentilationWidgetPropertiesModel {
    badVentilation?: VentilationWidgetProperties;
}
