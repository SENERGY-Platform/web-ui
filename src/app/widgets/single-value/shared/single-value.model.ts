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
import {DeviceInstanceModel} from '../../../modules/devices/device-instances/shared/device-instances.model';
import {DeviceTypeServiceModel} from '../../../modules/metadata/device-types-overview/shared/device-type.model';

export interface SingleValueModel {
    value: number | string;
    type: string;
    date: Date;
}

interface TimestampConfig {
    showTimestamp?: boolean;
    highlightTimestamp?: boolean;
    warningAge: number;
    problemAge: number;
    warningTimeLevel: string;
    problemTimeLevel: string;
}

export interface ValueHighlightConfig {
    threshold: number;
    color: string;
    direction: string;
}

export interface SingleValuePropertiesModel {
    type?: string;
    format?: string;
    math?: string;
    sourceType?: string;
    device?: DeviceInstanceModel;
    service?: DeviceTypeServiceModel;
    deviceGroupId?: string;
    deviceGroupCriteria?: DeviceGroupCriteriaModel;
    targetCharacteristic?: string;
    deviceGroupAggregation?: SingleValueAggregations;
    timestampConfig?: TimestampConfig;
    valueHighlightConfig?: {
        highlight: boolean;
        thresholds: ValueHighlightConfig[];
    };
}

export enum SingleValueAggregations {
    Latest = 'latest',
    Sum = 'sum',
}
