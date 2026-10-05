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
import { ResourceHistoricalConnectionStatesModelV2 } from '../../../../../modules/devices/device-instances/shared/device-instances-history.model';
import { ChartElementSize, ChartsModel } from '../../../shared/charts.model';

/** Per device: connection state changes of the current day, ascending as [unix seconds, connected]. */
export type ConnectionTimeline = [number, boolean][];

export const deviceTotalDowntimeColor = '#4484ce';
const intervalDurationInMin = 15;
const intervalDurationInMs = intervalDurationInMin * 60 * 1000;

export interface FailureRatioInterval {
    from: Date;
    to: Date;
    /** disconnected share of the summed device time in this interval */
    failureRatio: number;
}

export function toConnectionTimelines(histories: Map<string, ResourceHistoricalConnectionStatesModelV2[]>, since: Date): ConnectionTimeline[] {
    const timelines: ConnectionTimeline[] = [];
    histories.forEach((resourceHistories) => {
        (resourceHistories || []).forEach((history) => {
            const timeline: ConnectionTimeline = [];
            if (history.prev_state !== null) {
                timeline.push([since.getTime() / 1000, history.prev_state.connected]);
            }
            (history.states || []).forEach((state) => {
                timeline.push([new Date(state.time).getTime() / 1000, state.connected]);
            });
            if (timeline.length > 0) {
                timelines.push(timeline);
            }
        });
    });
    return timelines;
}

/**
 * The failure ratio of every 15 minute interval of the current day, oldest first. Intervals are counted
 * back from now, the oldest one is stretched to start at midnight.
 */
export function failureRatioIntervals(timelines: ConnectionTimeline[], now: Date): FailureRatioInterval[] {
    const numberOfIntervals = now.getHours() * (60 / intervalDurationInMin) + Math.ceil(now.getMinutes() / intervalDurationInMin);
    const interval: { stateConnected: number; stateDisconnected: number }[] = [];
    let intervalIndex = 0;
    let timeLeft = intervalDurationInMs;
    let intervalFull = false;

    for (let x = 0; x < numberOfIntervals; x++) {
        interval.push({ stateConnected: 0, stateDisconnected: 0 });
    }

    timelines.forEach((timeline: ConnectionTimeline) => {
        intervalIndex = 0;
        timeLeft = intervalDurationInMs;
        intervalFull = false;

        const lastIndex = timeline.length - 1;
        const diffToday = now.getTime() - new Date(timeline[lastIndex][0] * 1000).getTime();
        const statusLastIndex = timeline[lastIndex][1];
        spreadIntoTimeZones(statusLastIndex, diffToday);

        for (let z = lastIndex; z >= 1 && !intervalFull; z--) {
            const diffDates = (timeline[z][0] - timeline[z - 1][0]) * 1000;
            const statusBefore = timeline[z - 1][1];
            spreadIntoTimeZones(statusBefore, diffDates);
        }
    });

    const result: FailureRatioInterval[] = [];
    for (let m = interval.length - 1; m >= 0; m--) {
        const failureRatio = interval[m].stateDisconnected / (interval[m].stateConnected + interval[m].stateDisconnected);
        const to = new Date(now.getTime() - m * intervalDurationInMs);
        let from = new Date(to.getTime() - intervalDurationInMs);
        if (m === interval.length - 1) {
            from = new Date(now);
            from.setHours(0, 0);
        }
        result.push({ from, to, failureRatio });
    }
    return result;

    function spreadIntoTimeZones(state: boolean, time: number) {
        while (time >= timeLeft && intervalIndex < numberOfIntervals - 1) {
            time = time - timeLeft;
            fillIntervalArray(state, timeLeft);
            intervalIndex++;
            timeLeft = intervalDurationInMs;
        }

        if (intervalIndex === numberOfIntervals - 1) {
            if (time > timeLeft) {
                fillIntervalArray(state, timeLeft);
                intervalFull = true;
            } else {
                timeLeft = timeLeft - time;
                fillIntervalArray(state, time);
            }
        } else {
            timeLeft = timeLeft - time;
            fillIntervalArray(state, time);
        }
    }

    function fillIntervalArray(state: boolean, time: number) {
        switch (state) {
        case true: {
            interval[intervalIndex].stateConnected += time;
            break;
        }
        case false: {
            interval[intervalIndex].stateDisconnected += time;
            break;
        }
        }
    }
}

/** e.g. "09:45\nfailure ratio: 12.5%"; the time is formatted in the browser's locale unless one is given. */
export function failureRatioTooltip(date: Date, failureRatio: number, locales: string | string[] = []): string {
    const percentageFormatted = Math.round(failureRatio * 10000) / 100 + '%';
    const timeFormatted = date.toLocaleTimeString(locales, { hour: '2-digit', minute: '2-digit' });
    return timeFormatted + '\n' + 'failure ratio: ' + percentageFormatted;
}

/** Google data table: each interval as a flat step from its start to its end, both points with a tooltip. */
export function failureRatioTable(intervals: FailureRatioInterval[]): ChartDataTableModel {
    const dataTable = new ChartDataTableModel([['Date', 'Percentage', { role: 'tooltip' }]]);
    intervals.forEach(({ from, to, failureRatio }) => {
        dataTable.data.push([from, failureRatio, failureRatioTooltip(from, failureRatio)]);
        dataTable.data.push([to, failureRatio, failureRatioTooltip(to, failureRatio)]);
    });
    return dataTable;
}

export function totalDowntimeChart(dataTable: ChartDataTableModel, element: ChartElementSize): ChartsModel {
    return new ChartsModel('AreaChart', dataTable.data, {
        chartArea: { width: element.widthPercentage, height: element.heightPercentage },
        width: element.width,
        height: element.height,
        legend: 'none',
        hAxis: { format: 'HH:mm' },
        vAxis: { format: '#.## %', viewWindow: { min: 0.0 } },
        explorer: {
            actions: ['dragToZoom', 'rightClickToReset'],
            axis: 'horizontal',
            keepInBounds: true,
            maxZoomIn: 0.001,
        },
        colors: [deviceTotalDowntimeColor],
    });
}
