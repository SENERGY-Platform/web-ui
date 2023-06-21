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

import { ExportValueModel } from '../../../../modules/exports/shared/export.model';
import { ChartsExportRequestPayloadGroupModel, ChartsExportRequestPayloadTimeModel } from './charts-export-request-payload.model';
import {DeviceInstancesModel} from '../../../../modules/devices/device-instances/shared/device-instances.model';

export interface ChartsExportPropertiesModel {
    chartType?: string;
    interval?: number; // deprecated
    hAxisLabel?: string;
    hAxisFormat?: string;
    vAxis?: ExportValueModel; // deprecated
    vAxes?: ChartsExportVAxesModel[];
    vAxisLabel?: string;
    secondVAxisLabel?: string;
    exports?: (ChartsExportMeasurementModel | DeviceInstancesModel)[];
    measurement?: ChartsExportMeasurementModel; // deprecated
    math?: string;
    curvedFunction?: boolean;
    calculateIntervals?: boolean;
    timeRangeType?: string;
    time?: ChartsExportRequestPayloadTimeModel;
    group?: ChartsExportRequestPayloadGroupModel;
    breakInterval?: string;
    zoomTimeFactor?: number;
}

export interface ChartsExportMeasurementModel {
    id: string;
    name: string;
    values: ExportValueModel[];
    exportDatabaseId?: string;
}

export interface ChartsExportVAxesModel {
    instanceId?: string;
    deviceId?: string;
    serviceId?: string;
    exportName: string;
    valueName: string;
    valueAlias?: string;
    valueType: string;
    valuePath?: string;
    math: string;
    color: string;
    filterType?: '=' | '<>' | '!=' | '>' | '>=' | '<' | '<=';
    filterValue?: number | string;
    tagSelection?: string[];
    isDuplicate?: boolean;
    displayOnSecondVAxis?: boolean;
    conversions?: { from: any; to: any; color?: string }[];
    conversionDefault?: number;
}
