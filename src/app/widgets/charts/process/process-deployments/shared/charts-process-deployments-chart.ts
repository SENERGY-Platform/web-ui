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

import { ChartDataTableModel } from '../../../../../core/model/chart/chart-data-table.model';
import { MonitorProcessModel } from '../../../../../modules/processes/monitor/shared/monitor-process.model';
import { ChartElementSize, ChartsModel } from '../../../shared/charts.model';

export const processDeploymentsColumnColor = '#4484ce';

export interface DeploymentsPerDay {
    /** midnight UTC of the day, parsed from the first 10 characters of the start time */
    date: Date;
    count: number;
}

/** Process instances per start day, oldest day first. Sorts the given array in place. */
export function deploymentsPerDay(processes: MonitorProcessModel[]): DeploymentsPerDay[] {
    processes.sort((a, b) => {
        if (a.startTime > b.startTime) {
            return 1;
        }
        if (a.startTime < b.startTime) {
            return -1;
        }
        return 0;
    });

    const dateCount: Map<string, number> = new Map();
    processes.forEach((process: MonitorProcessModel) => {
        const key = process.startTime.substring(0, 10);
        const value = (dateCount.get(key) || 0) + 1;
        dateCount.set(key, value);
    });

    const result: DeploymentsPerDay[] = [];
    dateCount.forEach((count, date) => result.push({ date: new Date(date), count }));
    return result;
}

/** e.g. "5.10.2026\ncount: 3"; the date is formatted in the browser's locale unless one is given. */
export function deploymentsTooltip(date: Date, count: number, locales?: string | string[]): string {
    return date.toLocaleDateString(locales) + '\n' + 'count: ' + count;
}

/** Google data table: one column per day with its tooltip. */
export function deploymentsTable(days: DeploymentsPerDay[]): ChartDataTableModel {
    const dataTable = new ChartDataTableModel([['Date', 'Count', { role: 'tooltip' }]]);
    days.forEach(({ date, count }) => dataTable.data.push([date, count, deploymentsTooltip(date, count)]));
    return dataTable;
}

export function deploymentsChart(dataTable: ChartDataTableModel, element: ChartElementSize): ChartsModel {
    return new ChartsModel('ColumnChart', dataTable.data, {
        chartArea: { width: element.widthPercentage, height: element.heightPercentage },
        width: element.width,
        height: element.height,
        legend: 'none',
        hAxis: { gridlines: { count: -1 } },
        colors: [processDeploymentsColumnColor],
    });
}
