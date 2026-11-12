/*
 * Copyright 2026 InfAI (CC SES)
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

import { ChartsExportVAxesModel } from './charts-export-properties.model';

/** Label of the remainder series when the axis names none. */
export const DEFAULT_REMAINDER_LABEL = 'Unclear';

/** Neutral grey, so the remainder reads as the part nothing accounts for rather than as another measurement. */
export const REMAINDER_COLOR = '#9e9e9e';

/**
 * The extra series that carries the parent's own value while its sub-axes are drawn, or undefined when
 * the axis does not ask for one. It queries exactly what the undrilled axis queried; applyRemainder
 * turns that value into the part the sub-axes leave.
 */
export function remainderAxis(parent: ChartsExportVAxesModel): ChartsExportVAxesModel | undefined {
    if (parent.showRemainder !== true) {
        return undefined;
    }
    const axis = JSON.parse(JSON.stringify(parent)) as ChartsExportVAxesModel;
    // without this the remainder would offer a drill of its own, back into the sub-axes already shown
    delete axis.subAxes;
    delete axis.showRemainder;
    delete axis.remainderAlias;
    axis.isRemainder = true;
    axis.valueAlias = (parent.remainderAlias || '').trim() || DEFAULT_REMAINDER_LABEL;
    axis.color = REMAINDER_COLOR;
    return axis;
}

/**
 * Replaces the remainder series' parent value with what the other series leave of it, bucket by bucket.
 * A bucket without a parent value keeps no remainder, and sub-values reaching past the parent leave
 * nothing rather than a bar below the baseline.
 *
 * Rows sharing a time are netted together: the parent and a sub-axis can be answered in rows of their
 * own, and two backends may spell the same instant differently. The bucket's one remainder goes into the
 * first cell that held a parent value, so legend and tooltip name a series that contributed to it.
 *
 * Mutates the table in place, as it is handed over right after the service built it.
 */
export function applyRemainder(table: (Date | number | string | null)[][], columnAxes: number[] | undefined, axes: ChartsExportVAxesModel[]): void {
    const axisIndex = axes.findIndex((axis) => axis.isRemainder === true);
    if (axisIndex === -1 || columnAxes === undefined || table.length < 2) {
        return;
    }
    // columnAxes is indexed by data column, while a table row carries the time in column 0
    const remainderColumns: number[] = [];
    const otherColumns: number[] = [];
    columnAxes.forEach((axis, column) => (axis === axisIndex ? remainderColumns : otherColumns).push(column + 1));
    if (remainderColumns.length === 0) {
        return;
    }
    const numeric = (value: Date | number | string | null): number | undefined =>
        typeof value === 'number' && isFinite(value) ? value : undefined;

    const buckets = new Map<number, number[]>();
    table.forEach((row, index) => {
        if (index === 0) {
            return;
        }
        const time = row[0] instanceof Date ? (row[0] as Date).valueOf() : NaN;
        // a row without a usable time stands for itself rather than joining every other such row
        const key = isFinite(time) ? time : -index;
        const rows = buckets.get(key);
        if (rows === undefined) {
            buckets.set(key, [index]);
        } else {
            rows.push(index);
        }
    });

    buckets.forEach((rows) => {
        let total = 0;
        let used = 0;
        let target: [number, number] | undefined;
        rows.forEach((row) => {
            remainderColumns.forEach((column) => {
                const value = numeric(table[row][column]);
                if (value !== undefined) {
                    total += value;
                    target = target || [row, column];
                }
            });
            otherColumns.forEach((column) => {
                used += numeric(table[row][column]) || 0;
            });
        });
        rows.forEach((row) => remainderColumns.forEach((column) => {
            table[row][column] = target !== undefined && target[0] === row && target[1] === column ? Math.max(total - used, 0) : null;
        }));
    });
}
