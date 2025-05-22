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


export enum DashboardTypesEnum {
    Switch = 'switch',
    RangeSlider = 'range_slider',
    Chart = 'chart',
    ChartExport = 'charts_export',
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
    ProcessScheduler = 'process_scheduler',
    DeviceStatus = 'device_status',
    DataTable = 'data_table',
    AcControl = 'ac_control',
    AnomalyDetection = 'anomaly_detection',
    OpenWindow = 'open_window',
    FakeAnomalyDetection = 'fake-anomaly',
    PVPrediction = 'pv_prediction',
    PVLoadRecommendation = 'pv_load_recommendation',
    LeakageDetection = 'leakage_detection',
    ConsumptionProfile = 'consumption_profile',
    BadVentilation = 'bad_ventilation',
    Floorplan = 'floorplan',
    ChartsProcessInstances = 'charts_process_instances',
    ChartsProcessDeployments = 'charts_process_deployments',
    ChartsDevicePerGateway = 'charts_device_per_gateway',
    ChartsDeviceDowntimeRatePerGateway = 'charts_device_downtime_rate_per_gateway',
    ChartsDeviceTotalDowntime = 'charts_device_total_downtime',
}

export function dashboardTypesEnumFromString(s: string): DashboardTypesEnum {
    return s as DashboardTypesEnum;
}

export function resizable(type: DashboardTypesEnum): boolean {
    switch (type) {
        case DashboardTypesEnum.Switch: return true;
        case DashboardTypesEnum.RangeSlider: return true;
        case DashboardTypesEnum.Chart: return true;
        case DashboardTypesEnum.ChartExport: return true; 
        case DashboardTypesEnum.DevicesState: return false;
        case DashboardTypesEnum.ProcessState: return true;
        case DashboardTypesEnum.EventList: return true;
        case DashboardTypesEnum.RankingList: return true;
        case DashboardTypesEnum.ProcessModelList: return true;
        case DashboardTypesEnum.DeviceDowntimeList: return true;
        case DashboardTypesEnum.SingleValue: return false;
        case DashboardTypesEnum.MultiValue: return false;
        case DashboardTypesEnum.EnergyPrediction: return false;
        case DashboardTypesEnum.AirQuality: return false;
        case DashboardTypesEnum.ProcessIncidentList: return true;
        case DashboardTypesEnum.ProcessScheduler: return true;
        case DashboardTypesEnum.DeviceStatus: return false;
        case DashboardTypesEnum.DataTable: return true;
        case DashboardTypesEnum.AcControl: return true;
        case DashboardTypesEnum.AnomalyDetection: return false;
        case DashboardTypesEnum.OpenWindow: return false;
        case DashboardTypesEnum.FakeAnomalyDetection: return false;
        case DashboardTypesEnum.PVPrediction: return false;
        case DashboardTypesEnum.PVLoadRecommendation: return false;
        case DashboardTypesEnum.LeakageDetection: return false;
        case DashboardTypesEnum.ConsumptionProfile: return false;
        case DashboardTypesEnum.BadVentilation: return false;
        case DashboardTypesEnum.Floorplan: return true;
        case DashboardTypesEnum.ChartsProcessInstances: return true;
        case DashboardTypesEnum.ChartsProcessDeployments: return true;
        case DashboardTypesEnum.ChartsDevicePerGateway: return true;
        case DashboardTypesEnum.ChartsDeviceDowntimeRatePerGateway: return true;
        case DashboardTypesEnum.ChartsDeviceTotalDowntime: return true;
    }
}