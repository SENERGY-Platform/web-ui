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

import { Attribute } from './device-instances.model';

/**
 * @deprecated This relies on the apiAggreagtor and should not be used. Use {@link ResourceHistoricalConnectionStatesModelV2} instead.
 */
export interface DeviceInstancesHistoryModel {
    creator: string;
    date: number;
    name: string;
    display_name: string;
    log_state: string;
    log_history: { values: LogHistoryValues[] | null };
    log_edge: (string | boolean)[] | null;
    attributes?: Attribute[];
}

/**
 * @deprecated This relies on the apiAggreagtor and should not be used. Use {@link ResourceHistoricalConnectionStatesModelV2} instead.
 */
interface LogHistoryValues {
    0: number /** time          */;
    1: boolean /** connected     */;
    2: string /** connectorName */;
}

/**
 * @deprecated This relies on the apiAggreagtor and should not be used. Use {@link ResourceHistoricalConnectionStatesModelV2} instead.
 */
export interface DeviceInstancesHistoryModelWithId extends DeviceInstancesHistoryModel {
    id: string;
}


export interface ResourceHistoricalConnectionStatesModelV2 {
    id: string;
    next_state: ConnectionStateModelV2 | null,
    prev_state: ConnectionStateModelV2 | null;
    states: ConnectionStateModelV2[] | null;
}

export interface ConnectionStateModelV2 {
    connected: boolean;
    time: string;
}