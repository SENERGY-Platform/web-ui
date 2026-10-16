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

export const OPERATOR_ID = 'operatorId';
export const IMPORT_ID = 'import_id';

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
    UserId?: string;
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

/** A value as far as its column name goes; the value of a typed form row has a nullable, optional name. */
interface ColumnNamed {
    Name?: string | null;
}

/** The column analytics-serving adds to every timescale export for the timestamp. */
export const timescaleTimeColumn = 'time';

/** The value names that occur more than once; a timescale export needs a column name of its own per value. Values without a name are skipped. */
export function duplicateValueNames(values: ColumnNamed[]): Set<string> {
    const counts = new Map<string, number>();
    for (const value of values) {
        if (value.Name) {
            counts.set(value.Name, (counts.get(value.Name) ?? 0) + 1);
        }
    }
    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
}

/**
 * Why a name cannot be a column of a database export, or '' if it can. analytics-serving splits "name:type" at the colon,
 * and the worker quotes column names without escaping them.
 */
export function columnNameError(name: string | null | undefined, duplicates: Set<string>): string {
    if (!name?.trim()) {
        return 'Name required';
    }
    if (name === timescaleTimeColumn) {
        return 'Name is taken by the time column';
    }
    if (/[:"]/.test(name)) {
        return 'Name must not contain : or "';
    }
    return duplicates.has(name) ? 'Name is used more than once' : '';
}

/** The distinct names among the values that cannot be columns, for a summary where not every row is on screen. */
export function invalidColumnNames(values: ColumnNamed[]): string[] {
    const duplicates = duplicateValueNames(values);
    const invalid = values.filter((value) => columnNameError(value.Name, duplicates) !== '');
    return [...new Set(invalid.map((value) => (value.Name?.trim() ? value.Name : '(empty)')))];
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

 
export enum DatabaseType {
    influxdb = 'influxdb',
    timescaledb = 'timescaledb',
}
