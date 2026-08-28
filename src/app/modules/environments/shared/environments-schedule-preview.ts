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

import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexPlotOptions, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import { ScheduleSource } from './environments.model';

/** One state's slot in the preview timeline, in seconds elapsed since the programme started. */
export interface ScheduleBlock {
    name: string;
    startSeconds: number;
    endSeconds: number;
    value: number;
}

/** Just the apx-chart inputs the schedule preview binds; ApexOptions itself has no single narrower type for a partial config. */
export interface ScheduleChartOptions {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    plotOptions: ApexPlotOptions;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    dataLabels: ApexDataLabels;
    colors: string[];
}

const MAX_PREVIEW_SECONDS = 24 * 3600;
const MAX_PREVIEW_CYCLES = 3;

/**
 * Lays out the states of a schedule back to back, starting at t=0, for at least one full
 * cycle -- even one that alone exceeds 24h, since cutting a state mid-way would show a
 * block the schedule never actually produces. A second and third cycle are only appended
 * while the programme is still inside the 24h window; whichever of the two limits (3
 * cycles, 24h) is hit first stops the layout, but only ever between whole cycles.
 *
 * A state with duration_seconds <= 0 is dropped before laying out anything: keeping it
 * would either add a zero-width block or, at worst, loop without ever advancing time.
 * Deliberately ignores every spread field and the gate -- this is "what the programme
 * looks like on paper", not a simulation of a particular run.
 */
export function schedulePreviewBlocks(schedule: ScheduleSource): ScheduleBlock[] {
    const states = (schedule.states || []).filter((s) => (s.duration_seconds ?? 0) > 0);
    if (states.length === 0) {
        return [];
    }
    const cycleSeconds = states.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);

    const blocks: ScheduleBlock[] = [];
    let t = 0;
    for (let cycle = 0; cycle < MAX_PREVIEW_CYCLES; cycle++) {
        // The first cycle is laid out unconditionally; every further one only if it still
        // fits inside the 24h window as a whole -- a cycle that would cross the mark is
        // left out entirely rather than cut into a partial, misleading block.
        if (cycle > 0 && t + cycleSeconds > MAX_PREVIEW_SECONDS) {
            break;
        }
        for (const state of states) {
            const duration = state.duration_seconds ?? 0;
            const start = t;
            const end = t + duration;
            blocks.push({ name: state.name || '', startSeconds: start, endSeconds: end, value: state.value ?? 0 });
            t = end;
        }
    }
    return blocks;
}

/** Formats seconds elapsed since the programme started as "H:mm", not wrapped at 24h -- this is elapsed time, not a clock. */
function formatElapsed(totalSeconds: number): string {
    const totalMinutes = Math.round(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours + ':' + String(minutes).padStart(2, '0');
}

/**
 * Builds the apx-chart config for a schedule's timeline preview: one rangeBar row per
 * state name, spanning every occurrence across the laid-out cycles (rangeBarGroupRows
 * groups same-named blocks into one row, the same way the platform's own timeline chart
 * renders a state history). Returns undefined when there is nothing to lay out, so the
 * editor can fall back to its empty-state hint instead of rendering an empty chart.
 */
export function scheduleChartOptions(schedule: ScheduleSource): ScheduleChartOptions | undefined {
    const blocks = schedulePreviewBlocks(schedule);
    if (blocks.length === 0) {
        return undefined;
    }
    const series: ApexAxisChartSeries = [
        {
            name: 'Schedule',
            data: blocks.map((b) => ({ x: b.name, y: [b.startSeconds * 1000, b.endSeconds * 1000] })),
        },
    ];
    return {
        series,
        chart: { type: 'rangeBar', height: 220, toolbar: { show: false }, animations: { enabled: false } },
        plotOptions: { bar: { horizontal: true, rangeBarGroupRows: true, barHeight: '70%' } },
        xaxis: { type: 'numeric', labels: { formatter: (value: string) => formatElapsed(Number(value) / 1000) } },
        yaxis: { labels: {} },
        dataLabels: { enabled: false },
        colors: ['#008FFB'],
    };
}
