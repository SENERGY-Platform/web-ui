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

import {ExportValueModel} from '../../../../modules/data/export/shared/export.model';

export interface ChartsExportPropertiesModel {
        chartType?: string;
        interval?: number;
        hAxisLabel?: string;
        vAxis?: ExportValueModel;
        vAxes?: ChartsExportVAxesModel[];
        vAxisLabel?: string;
        exports?: ChartsExportMeasurementModel[];
        measurement?: ChartsExportMeasurementModel;
        math?: string;
        curvedFunction?: boolean;
}

export interface ChartsExportMeasurementModel {
    id: string;
    name: string;
    values: ExportValueModel [];
}

export interface ChartsExportVAxesModel {
    instanceId: string;
    exportName: string;
    valueName: string;
    valueType: string;
    math: string;
    color: string;
}

