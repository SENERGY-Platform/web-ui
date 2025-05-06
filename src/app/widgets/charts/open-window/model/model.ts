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
import { ChartsExportMeasurementModel } from '../../export/shared/charts-export-properties.model';
import { DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';

export interface OpenWindowPropertiesModel {
    windowExports?: ChartsExportMeasurementModel[] | DeviceInstanceModel[] | DeviceGroupModel[];
    windowTimeRange?: {
        time?: number;
        start?: string;
        end?: string;
        level?: string;
        type?: string;
    };
    hAxisLabel?: string;
    vAxisLabel?: string;
};