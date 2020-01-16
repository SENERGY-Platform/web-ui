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

export enum DashboardTypesEnum {
    Switch = 'switch',
    Chart = 'chart',
    DevicesState = 'devices_state',
    ProcessState = 'process_state',
    EventList = 'event_list',
    RankingList = 'ranking_list',
    ProcessModelList = 'process_model_list',
    DeviceDowntimeList = 'device_downtime_list',
    SingleValue = 'single_value',
    MultiValue = 'multi_value',
    EnergyPrediction = 'energy_prediction',
    AirQuality = 'air_quality',
    ProcessIncidentList = 'process_incident_list',
}
