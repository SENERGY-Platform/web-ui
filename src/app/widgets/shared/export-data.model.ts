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

export interface TimeValuePairModel {
    time: string | null;
    value: string | number | boolean | null;
}

export interface LastValuesRequestElementInfluxModel {
    measurement: string;
    columnName: string;
    math?: string;
}

export interface LastValuesRequestElementTimescaleModel {
    exportId?: string;
    deviceId?: string;
    serviceId?: string;
    columnName: string;
    math?: string;
}

export interface QueriesRequestElementInfluxModel extends QueriesRequestElementBaseModel{
    measurement?: string;
}

export interface QueriesRequestElementTimescaleModel extends QueriesRequestElementBaseModel{
    exportId?: string;
    deviceId?: string;
    serviceId?: string;
}

export interface QueriesRequestV2ElementTimescaleModel extends QueriesRequestElementTimescaleModel{
    deviceGroupId?: string;
    locationid?: string;
}

export interface QueriesRequestElementBaseModel {
    columns: QueriesRequestColumnModel[];
    filters?: QueriesRequestFilterModel[];
    groupTime?: string;
    limit?: number;
    time?: QueriesRequestTimeModel;
    orderColumnIndex?: number; // must not be set if querying as table
    orderDirection?: 'asc' | 'desc'; // must not be set if querying as table
}

export interface QueriesRequestColumnModel {
    groupType?: string;
    math?: string;
    name?: string;
    criteria?: DeviceGroupCriteriaModel;
    targetCharacteristicId?: string;
}

export interface QueriesRequestFilterModel {
    column: string;
    math?: string;
    type: string;
    value: any;
}

export interface QueriesRequestTimeModel {
    end?: string;
    ahead?: string;
    last?: string;
    start?: string;
}
