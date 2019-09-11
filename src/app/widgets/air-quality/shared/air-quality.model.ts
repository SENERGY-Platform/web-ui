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

import {ChartsExportMeasurementModel} from '../../charts/export/shared/charts-export-properties.model';
import {ExportValueModel} from '../../../modules/data/export/shared/export.model';
import {Location} from '@angular-material-extensions/google-maps-autocomplete';


export interface AirQualityPropertiesModel {
    location?: (Location);
    formatted_address?: (string);
    measurements?: (MeasurementModel[]);
}

export interface MeasurementModel {
    name_html: (string);
    description_html?: (string);
    is_enabled?: (boolean);
    is_warning?: (boolean);
    is_critical?: (boolean);
    tooltip?: (string);
    export?: (ChartsExportMeasurementModel);
    unit_html: (string);
    data: (SensorDataModel);
    boundaries: (BoundaryModel);
}

export interface SensorDataModel {
    value: (number);
    column: (ExportValueModel);
}

export interface BoundaryModel {
    warn: (UpperLowerModel);
    critical: (UpperLowerModel);
}

export interface UpperLowerModel {
    lower: number;
    upper: number;
}
