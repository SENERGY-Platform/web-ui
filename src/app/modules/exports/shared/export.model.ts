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

export interface ExportResponseModel {
    count?: number;
    instances?: ExportModel[];
    total?: number;
}

export interface ExportModel {
    ID: string | undefined;
    Filter: string;
    FilterType: string | undefined;
    Name: string | undefined;
    Description: string | undefined;
    EntityName: string | undefined;
    Topic: string | undefined;
    Measurement: string | undefined;
    Database: string | undefined;
    TimePath: string | undefined;
    TimePrecision?: string;
    RancherServiceId: string;
    ServiceName: string;
    Offset: string;
    Generated: boolean;
    Values: ExportValueModel[];
    CreatedAt: string;
    UpdatedAt: string;
    CustomMqttBroker?: string;
    CustomMqttBaseTopic?: string;
    CustomMqttUser?: string;
    CustomMqttPassword?: string;
    ExportDatabaseID?: string;
    ExportDatabase?: ExportDatabaseModel;
    TimestampFormat?: string;
}

export interface ExportValueBaseModel {
    Name: string;
    Path: string;
    Type: string;
    Tag?: boolean;
}

export interface ExportValueModel extends ExportValueBaseModel {
    InstanceID: string;
    LastValue?: any;
    LastTimeStamp?: string;
}

export interface ExportValueCharacteristicModel extends ExportValueBaseModel {
    characteristicId: string;
}

export interface ExportDatabaseModel {
    ID?: string;
    Name: string;
    Description: string;
    Type: DatabaseType;
    External: boolean;
    Url: string;
    EwFilterTopic: string;
    UserId: string;
    Public: boolean;
}

// eslint-disable-next-line no-shadow
export enum DatabaseType {
    influxdb = 'influxdb',
    timescaledb = 'timescaledb',
}
