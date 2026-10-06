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

import { ChartsExportVAxesModel } from '../../../export/shared/charts-export-properties.model';

/** One bar of a timeline row, from start to end in ms. */
export interface TimelineBar {
    row: string;
    start: number;
    end: number;
}

/** The bars of one state (conversion alias) across all rows, in its colour. */
export interface TimelineSeries {
    name: string;
    color: string;
    bars: TimelineBar[];
}

/** Used for a state whose conversion has no colour. */
const fallbackColors = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'];

/*
 * Input data is shaped [NUMBER_TIMELINE_ROWS, NUMBER_COLUMNS, NUMBER_TIMESTAMPS, 2]; the row index
 * matches the vAxes index, the last dimension is [timestamp, value], sorted descending by timestamp.
 */

/** The name a conversion's bars are collected under: its alias, else its target value. */
function seriesName(conversion: { alias?: string; to: any }): string {
    return conversion.alias || String(conversion.to);
}

/** One series per state that matched at least once, coloured by the first conversion of that name. */
export function timelineSeries(data: any[], vAxes: ChartsExportVAxesModel[]): TimelineSeries[] {
    const bars: Record<string, TimelineBar[]> = {};
    vAxes.forEach((vAxis) => (vAxis?.conversions || []).forEach((conversion) => (bars[seriesName(conversion)] = [])));
    data.forEach((dataForOneEntity: any, i: number) => {
        if (dataForOneEntity.length > 0) { // only when requested entitity has any data
            processDataForOneEntity(dataForOneEntity, bars, vAxes[i]);
        }
    });
    const series: TimelineSeries[] = [];
    Object.entries(bars).forEach(([name, barsOfState]) => {
        if (barsOfState.length > 0) {
            series.push({ name, color: seriesColor(name, vAxes) || fallbackColors[series.length % fallbackColors.length], bars: barsOfState });
        }
    });
    return series;
}

/** Every row label in order of its first bar. */
export function timelineRows(series: TimelineSeries[]): string[] {
    const rows: string[] = [];
    series.forEach((s) => s.bars.forEach((bar) => {
        if (!rows.includes(bar.row)) {
            rows.push(bar.row);
        }
    }));
    return rows;
}

/** [earliest, latest] timestamp in ms over all rows, from the first column of each row. */
export function timelineXRange(data: any[]): [number, number] | [undefined, undefined] {
    const xMax: Date[] = [];
    const xMin: Date[] = [];

    for (let i = 0; i < data.length; i++) {
        const dataEntity = data[i];
        if (dataEntity.length > 0) {
            const endSeries = dataEntity[dataEntity.length - 1];
            const startSeries = dataEntity[0];
            const maxSeries = endSeries[0][0];
            const minSeries = startSeries[(startSeries.length - 1)][0];
            xMin.push(new Date(minSeries));
            xMax.push(new Date(maxSeries));
        }
    }

    if (xMax.length > 0 && xMin.length > 0) {
        const maxPoint = xMax.reduce(function (a, b) {
            return a > b ? a : b;
        }, xMax[0]);
        const minPoint = xMin.reduce(function (a, b) {
            return a < b ? a : b;
        }, xMin[0]);
        return [minPoint.getTime(), maxPoint.getTime()];
    } else {
        return [undefined, undefined];
    }
}

function seriesColor(name: string, vAxes: ChartsExportVAxesModel[]): string | undefined {
    for (const vAxis of vAxes) {
        const conversion = (vAxis?.conversions || []).find((c) => seriesName(c) === name);
        if (conversion !== undefined) {
            return conversion.color;
        }
    }
    return undefined;
}

/** Merges consecutive rows of the first column with the same value into their first and last row. */
export function mergeTimelineData(data: any) {
    /* Merge intervals with the same value
       [3.5 false]
       [2.5 false]
       [1.5 false]
       => [3.5 false], [1.5 false]
    */
    const mergedData: any = [];
    data = data[0];
    let endRow: any = data[0];
    data.forEach((row: any, i: any) => {
        let changeDetected = false;
        let nextRow;
        // last value should be the last value even when no change
        if (i === data.length - 1) {
            changeDetected = true;
        } else {
            nextRow = data[i + 1];
            changeDetected = row[1] !== nextRow[1];
        }
        if (changeDetected) {
            mergedData.push(endRow);
            mergedData.push(row);
            endRow = nextRow;
        }
    });
    return mergedData;
}

/** The series name of the first conversion from firstValue to lastValue, compared as strings; undefined without match. */
export function aliasOfMatchingRule(vAxis: ChartsExportVAxesModel, firstValue: any, lastValue: any): string | undefined {
    // compared as strings, as booleans in the conversions are sometimes strings and sometimes bool
    const conversion = (vAxis?.conversions || []).find((c) => String(c.to) === String(lastValue) && String(c.from) === String(firstValue));
    return conversion === undefined ? undefined : seriesName(conversion);
}

function processDataForOneEntity(data: any, bars: Record<string, TimelineBar[]>, vAxis: ChartsExportVAxesModel) {
    const mergedData = mergeTimelineData(data);
    mergedData.forEach((row: any, i: any) => {
        if (i === mergedData.length - 1) {
            return;
        }
        const nextRow = mergedData[i + 1];
        const ruleAlias = aliasOfMatchingRule(vAxis, nextRow[1], row[1]);
        if (ruleAlias != null) {
            // the newest bar ends at its own row, every other one at the previous (newer) row, the operator output being valid until the next input
            const end = i === 0 ? row[0] : mergedData[i - 1][0];
            bars[ruleAlias].push({ row: vAxis.valueAlias || vAxis.exportName, start: new Date(nextRow[0]).getTime(), end: new Date(end).getTime() });
        }
    });
}
