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


export interface TimeValuePairModel {
    time: string | null;
    value: string | number | boolean | null;
}

export interface LastValuesRequestElementModel {
    measurement: string;
    columnName: string;
    math?: string;
}

export interface QueriesRequestElementModel {
    columns: QueriesRequestColumnModel[];
    filters?: QueriesRequestFilterModel [];
    groupTime?: string;
    limit?: number;
    measurement: string;
    time?: QueriesRequestTimeModel;
}

export interface QueriesRequestColumnModel {
    groupType?: string;
    math?: string;
    name: string;
}

export interface QueriesRequestFilterModel {
    column: string;
    math?: string;
    type: string;
    value: any;
}

export interface QueriesRequestTimeModel {
    end?: string;
    last?: string;
    start?: string;
}
