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

import { DeviceGroupCriteriaModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { TimeValuePairModel } from '../../shared/export-data.model';

export interface DataTableWidgetPropertiesModel {
    dataTable?: DataTablePropertiesModel;
}

export interface DataTablePropertiesModel {
    elements: DataTableElementModel[];
    order: DataTableOrderEnum;
    valueAlias: string;
    refreshTime: number;
    convertRules: DataTableConfigConvertRuleModel[];
    valuesPerElement?: number;
}

export interface DataTableConfigConvertRuleModel {
    status: string;
    icon: string;
    color: string;
}

export interface DataTableElementModel {
    id: string;
    name: string;
    valueType: ExportValueTypes;
    format?: string;
    exportId: string;
    exportValuePath: string;
    exportValueName: string;
    exportCreatedByWidget: boolean;
    exportTagSelection?: string[];
    exportDbId?: string;
    groupTime?: string | null;
    groupType?: string | null;
    unit?: string;
    warning?: DataTableElementWarningModel;
    elementDetails: {
        elementType: DataTableElementTypesEnum;
        device?: {
            aspectId: string;
            functionId: string;
            deviceId: string;
            serviceId: string;
            deploymentId?: string;
            requestDevice: boolean;
            scheduleId?: string;
        };
        pipeline?: {
            pipelineId: string;
            operatorId: string;
        };
        import?: {
            typeId: string;
            instanceId: string;
        };
        deviceGroup?: {
            deviceGroupId?: string;
            deviceGroupCriteria?: DeviceGroupCriteriaModel;
            targetCharacteristic?: string;
            deviceGroupAggregation?: DataTableAggregations;
        };
    };
}

 
export enum DataTableElementTypesEnum {
    DEVICE,
    PIPELINE,
    IMPORT,
    DEVICE_GROUP,
}

export interface DataTableElementWarningModel {
    enabled: boolean;
    lowerBoundary?: number;
    upperBoundary?: number;
}

 
export enum ExportValueTypes {
    INTEGER = 'int',
    FLOAT = 'float',
    STRING = 'string',
    BOOLEAN = 'bool',
    STRING_JSON = 'string_json',
}

 
export enum DataTableOrderEnum {
    Default = 0,
    AlphabeticallyAsc = 1,
    AlphabeticallyDesc = 2,
    ValueAsc = 3,
    ValueDesc = 4,
    TimeAsc = 5,
    TimeDesc = 6,
}

export enum DataTableAggregations {
    Latest = 'latest',
    Sum = 'sum',
    Separate = 'separate',
}

export interface  DataTableTimeValuePairModel extends TimeValuePairModel {
    name?: string;
    index: number;
}
