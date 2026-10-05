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

/** One bar of a timeline row: x is the row label, y the [start, end] time in ms. */
export interface TimelineBar {
    x: string;
    y: [number, number];
}

export interface TimelineSeries {
    name: string;
    data: TimelineBar[];
}

/*
 * Input data is shaped [NUMBER_TIMELINE_ROWS, NUMBER_COLUMNS, NUMBER_TIMESTAMPS, 2]; the row index
 * matches the vAxes index, the last dimension is [timestamp, value], sorted descending by timestamp.
 */

/** One series per conversion alias that matched at least once, coloured by the first conversion carrying that alias. */
export function timelineSeries(data: any[], vAxes: ChartsExportVAxesModel[]): { data: TimelineSeries[]; colors: string[] } {
    const chartData = setupTimelineChart(vAxes);
    data.forEach((dataForOneEntity: any, i: any) => {
        if (dataForOneEntity.length > 0) { // only when requested entitity has any data
            processDataForOneEntity(dataForOneEntity, chartData, vAxes[i]);
        }
    });
    const convertedCartData = convertTimelineChartData(chartData);
    return {
        data: convertedCartData,
        colors: setupTimelineColors(convertedCartData, vAxes)
    };
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

function setupTimelineColors(chartData: any, vAxes: ChartsExportVAxesModel[]) {
    const colors: string[] = [];
    chartData.forEach((serie: any) => {
        let aliasFound = false;
        vAxes.forEach((vAxis: any) => {
            vAxis.conversions.forEach((conversion: any) => {
                if (aliasFound) {
                    return;
                }
                if (conversion.alias === serie.name || conversion.alias === serie.to) {
                    colors.push(conversion.color);
                    aliasFound = true;
                }
            });
            if (aliasFound) {
                return;
            }
        });
    });
    return colors;
}

function convertTimelineChartData(chartData: any): TimelineSeries[] {
    const convertedChartData = [];
    for (const [key, value] of Object.entries(chartData)) {
        const data = (value as any)['data'];
        if (data.length === 0) {
            continue;
        }
        convertedChartData.push({
            name: key,
            data
        });
    }
    return convertedChartData;
}

function setupTimelineChart(vAxes: ChartsExportVAxesModel[]) {
    const chartData: any = {};
    vAxes.forEach(vAxis => {
        (vAxis?.conversions || []).forEach(conversion => {
            chartData[conversion.alias || conversion.to] = {
                data: []
            };
        });
    });
    return chartData;
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

/** The alias of the last conversion from firstValue to lastValue, compared as strings; undefined without match. */
export function aliasOfMatchingRule(vAxis: ChartsExportVAxesModel, firstValue: any, lastValue: any): string | undefined {
    let alias: string | undefined;
    (vAxis?.conversions || []).forEach(conversion => {
        // convert everything to string, as there are problems with booleans in the conversion that are sometimes strings or bool
        if (String(conversion.to) === String(lastValue) && String(conversion.from) === String(firstValue)) {
            alias = conversion.alias || String(conversion.to);
            return;
        }
    });
    return alias;
}

function processDataForOneEntity(data: any, chartData: any, vAxis: ChartsExportVAxesModel) {
    const mergedData = mergeTimelineData(data);
    mergedData.forEach((row: any, i: any) => {
        if (i === mergedData.length - 1) {
            return;
        }
        const nextRow = mergedData[i + 1];
        const firstValue = nextRow[1];
        const lastValue = row[1];
        const ruleAlias = aliasOfMatchingRule(vAxis, firstValue, lastValue);
        if (ruleAlias != null) {
            const startDate = new Date(nextRow[0]);
            let endDate;
            if (i === 0) {
                endDate = new Date(row[0]);
            } else {
                // the previous row gives the end, this assumes that the operator output is valid until the next input
                const prevRow = mergedData[i - 1];
                endDate = new Date(prevRow[0]);
            }

            chartData[ruleAlias]['data'].push({
                x: vAxis.valueAlias || vAxis.exportName,
                y: [
                    startDate.getTime(),
                    endDate.getTime()
                ]
            });
        }
    });
}
