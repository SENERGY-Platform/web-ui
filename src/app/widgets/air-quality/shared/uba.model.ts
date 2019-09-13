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

export interface UBAStation {
    station_id: number;
    station_code?: string;
    station_name: string;
    station_city?: string;
    station_synonym?: string;
    station_active_from?: string;
    station_active_to?: string;
    station_longitude: number;
    station_latitude: number;
    network_id?: number;
    station_setting_id?: number;
    station_type_id?: number;
    network_code?: string;
    network_name?: string;
    station_setting_name?: string;
    station_setting_short_name?: string;
    station_type_name?: string;
    distance?: number;
}

export interface UBAStationResponse {
    request?: UBARequestResponse;
    indices?: string[];
    data?: {

    };
    count?: number;
}

export interface UBADataResponse {
    request?: UBARequestResponse;
    data?: {

    };
    indices?: {

    };
    count?: number;
}

export interface UBAMetaResponse {
    components?: {

    };
    limits?: {

    };
    networks?: {

    };
    scopes?: {

    };
    stations?: {

    };
    request?: UBARequestResponse;
}

export interface UBARequestResponse {
    date_from: string;
    date_to: string;
    time_from: string;
    time_to: string;
    lang: string;
    index: string;
    datetime_from: string;
    datetime_to: string;
    station?: string;
    use?: string;
}

export interface UBAComponent {
    id: number;
    short_name: string;
    pretty_name: string;
    unit: string;
    friendly_name: string;
}

export interface UBAData {
    short_name: string;
    value: number;
    unit: string;
    timestamp: string;
}
