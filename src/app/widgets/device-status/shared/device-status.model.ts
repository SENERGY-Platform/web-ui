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

export interface MultiValuePropertiesModel {
    multivaluemeasurements?: MultiValueMeasurement[];
    order?: number;
    valueAlias?: string;
}

export interface MultiValueMeasurement {
    name: string;
    type: string;
    format: string;
    export: ChartsExportMeasurementModel;
    column: ExportValueModel;
    unit: string;
    math?: string;
    data?: (number | string);
    lowerBoundary?: number;
    upperBoundary?: number;
    warning_enabled?: boolean;
}

export enum MultiValueOrderEnum {
    Default,
    AlphabeticallyAsc,
    AlphabeticallyDesc,
    ValueAsc,
    ValueDesc
}
