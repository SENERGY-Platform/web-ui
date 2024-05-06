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
import { DeviceGroupCriteriaModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import {
    ApexAxisChartSeries,
    ApexChart,
    ApexXAxis,
    ApexTitleSubtitle,
    ApexYAxis,
    ApexPlotOptions,
    ApexLegend,
    ApexTooltip,
    ApexAnnotations,
    ApexMarkers
} from 'ng-apexcharts';
import { DeviceGroupsPermSearchModel } from 'src/app/modules/devices/device-groups/shared/device-groups-perm-search.model';

export interface ChartsExportPropertiesModel {
    chartType?: string;
    interval?: number; // deprecated
    hAxisLabel?: string;
    hAxisFormat?: string;
    vAxis?: ExportValueModel; // deprecated
    vAxes?: ChartsExportVAxesModel[];
    vAxisLabel?: string;
    secondVAxisLabel?: string;
    exports?: (ChartsExportMeasurementModel | DeviceInstancesModel | DeviceGroupsPermSearchModel)[];
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

// eslint-disable-next-line no-shadow
export enum ChartsExportDeviceGroupMergingStrategy {
    Separate,
    Sum,
    Merge,
}

export interface ChartsExportConversion {
    from: any;
    to: any;
    color?: string;
    alias?: string;
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
    conversions?: ChartsExportConversion[];
    conversionDefault?: number;
    criteria?: DeviceGroupCriteriaModel;
    deviceGroupId?: string;
    deviceGroupMergingStrategy?: ChartsExportDeviceGroupMergingStrategy;
}

export interface ApexChartOptions {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    title: ApexTitleSubtitle;
    colors: any;
    plotOptions: ApexPlotOptions;
    legend: ApexLegend;
    tooltip: ApexTooltip;
    annotations: ApexAnnotations;
    markers: ApexMarkers;
}
