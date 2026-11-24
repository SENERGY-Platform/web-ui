/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DeviceTypeModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { ThingReadingModel, ThingUntilValueModel } from './things.model';

/** `Get-Energy` and `Get-Volume`: the measuring functions a counter column of a meter carries (as in the dashboard). */
export const METER_FUNCTION_IDS: readonly string[] = [
    'urn:infai:ses:measuring-function:474471c3-e401-4b54-8963-53739a3b1de4',
    'urn:infai:ses:measuring-function:f5344662-63d2-40b7-9b9e-0b28a2d34252',
];

/** One counter column of a device: the service and the column name (the path in the service's output). */
export interface MeterColumn {
    service_id: string;
    column: string;
    label: string;
}

export function columnKey(item: { service_id: string; column: string }): string {
    return item.service_id + '\u0000' + item.column;
}

/**
 * The counter columns of a device type: the outputs whose content variable carries an energy or volume function.
 * `pathsOf` is DeviceTypeService.getValuePathsAndContentVariables, passed in so this stays free of services.
 */
export function meterColumnsOf(
    deviceType: Pick<DeviceTypeModel, 'services'> | null | undefined,
    pathsOf: (output: { content_variable: any }) => { path: string; contentVariable: { function_id?: string } }[],
): MeterColumn[] {
    const columns: MeterColumn[] = [];
    for (const service of deviceType?.services ?? []) {
        for (const output of service.outputs ?? []) {
            for (const p of pathsOf(output)) {
                if (p.contentVariable.function_id && METER_FUNCTION_IDS.includes(p.contentVariable.function_id)) {
                    columns.push({ service_id: service.id, column: p.path, label: service.name + ': ' + p.path });
                }
            }
        }
    }
    return columns;
}

/** One row of the readings editor, as typed. */
export interface ReadingRow {
    service_id: string;
    column: string;
    /** Counter position at installation. */
    from: string;
    /** Counter position at removal. */
    until: string;
}

/**
 * Why the rows cannot be sent, or null. A row needs its service and column and numbers where something is typed;
 * the same column may not appear twice.
 */
export function readingRowsError(rows: ReadingRow[], parse: (raw: string) => number | null | undefined): string | null {
    const seen = new Set<string>();
    for (const row of rows) {
        const hasValue = row.from.trim() !== '' || row.until.trim() !== '';
        if (!hasValue && row.service_id.trim() === '' && row.column.trim() === '') {
            continue;
        }
        if (row.service_id.trim() === '' || row.column.trim() === '') {
            return 'Enter service and column for every reading.';
        }
        if (parse(row.from) === null || parse(row.until) === null) {
            return 'Readings are numbers, e.g. 1234.5';
        }
        const key = columnKey(row);
        if (seen.has(key)) {
            return 'Each column may appear once.';
        }
        seen.add(key);
    }
    return null;
}

/** Installation readings of the rows that have one; a row without a from value is dropped, `until_value` only where typed. */
export function toReadings(rows: ReadingRow[], parse: (raw: string) => number | null | undefined, withUntil: boolean): ThingReadingModel[] {
    const readings: ThingReadingModel[] = [];
    for (const row of rows) {
        const from = parse(row.from);
        if (typeof from !== 'number') {
            continue;
        }
        const reading: ThingReadingModel = { service_id: row.service_id.trim(), column: row.column.trim(), from_value: from };
        const until = withUntil ? parse(row.until) : undefined;
        if (typeof until === 'number') {
            reading.until_value = until;
        }
        readings.push(reading);
    }
    return readings;
}

/** Removal readings of the rows that have one. */
export function toUntilValues(rows: ReadingRow[], parse: (raw: string) => number | null | undefined): ThingUntilValueModel[] {
    const values: ThingUntilValueModel[] = [];
    for (const row of rows) {
        const until = parse(row.until);
        if (typeof until === 'number') {
            values.push({ service_id: row.service_id.trim(), column: row.column.trim(), until_value: until });
        }
    }
    return values;
}

/** Fixed rows for the given columns, e.g. the readings of the link that ends. */
export function rowsFor(columns: { service_id: string; column: string }[]): ReadingRow[] {
    return columns.map((c) => ({ service_id: c.service_id, column: c.column, from: '', until: '' }));
}
