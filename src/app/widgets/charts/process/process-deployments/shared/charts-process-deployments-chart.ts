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

import { MonitorProcessModel } from '../../../../../modules/processes/monitor/shared/monitor-process.model';

export const processDeploymentsColumnColor = '#4484ce';

export interface DeploymentsPerDay {
    /** local midnight of the calendar day written in the first 10 characters of the start time */
    date: Date;
    count: number;
}

/** Process instances per start day, oldest day first; the given array is left as it is. */
export function deploymentsPerDay(processes: MonitorProcessModel[]): DeploymentsPerDay[] {
    const dateCount: Map<string, number> = new Map();
    processes.forEach((process: MonitorProcessModel) => {
        const key = process.startTime.substring(0, 10);
        dateCount.set(key, (dateCount.get(key) || 0) + 1);
    });
    const result: DeploymentsPerDay[] = [];
    // ISO dates sort as text; the day stays the written one in every time zone
    [...dateCount.keys()].sort().forEach((key) => {
        const [year, month, day] = key.split('-').map(Number);
        result.push({ date: new Date(year, month - 1, day), count: dateCount.get(key) || 0 });
    });
    return result;
}

/** e.g. "5.10.2026\ncount: 3"; the date is formatted in the browser's locale unless one is given. */
export function deploymentsTooltip(date: Date, count: number, locales?: string | string[]): string {
    return date.toLocaleDateString(locales) + '\n' + 'count: ' + count;
}
