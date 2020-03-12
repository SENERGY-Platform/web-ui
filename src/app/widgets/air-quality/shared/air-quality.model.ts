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

import {ChartsExportMeasurementModel} from '../../charts/export/shared/charts-export-properties.model';
import {ExportValueModel} from '../../../modules/data/export/shared/export.model';
import {UBAData, UBAStation} from './uba.model';
import {DWDSinglePollenForecast} from './dwd-pollen.model';
import {YrWeatherModel} from './yr-weather.model';


export interface AirQualityPropertiesModel {
    location?: (Location);
    ubaStation?: (UBAStation);
    formatted_address?: (string);
    measurements?: (MeasurementModel[]);
    dwd_partregion_name?: (string);
    pollen?: (MeasurementModel[]);
    weather?: (YrWeatherModel);
    yrPath?: string;
}

export interface MeasurementModel {
    name_html: (string);
    short_name: (string);
    description_html?: (string);
    is_enabled?: (boolean);
    has_outside?: (boolean);
    is_warning?: (boolean);
    is_critical?: (boolean);
    can_web?: boolean;
    export?: (ChartsExportMeasurementModel);
    math?: string;
    outsideExport?: (ChartsExportMeasurementModel);
    outsideMath?: string;
    unit_html: (string);
    data: (SensorDataModel);
    outsideData: (SensorDataModel);
    boundaries: (BoundaryModel);
    pollenData?: (DWDSinglePollenForecast);
}

export interface SensorDataModel {
    value: (number);
    column?: (ExportValueModel);
}

export interface BoundaryModel {
    warn: (UpperLowerModel);
    critical: (UpperLowerModel);
}

export interface UpperLowerModel {
    lower: number;
    upper: number;
}

export interface Location {
    longitude: number;
    latitude: number;
}

