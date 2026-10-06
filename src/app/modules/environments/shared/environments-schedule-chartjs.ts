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

import { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { chartFontFamily, chartGridColor, chartTextColor, withOpacity, xAxisLook, xZoom } from 'src/app/core/charts/chart-look';
import { htmlTooltip, TooltipView } from 'src/app/core/charts/chart-tooltip';
import { formatElapsed, SchedulePreview } from './environments-schedule-preview';

export interface ScheduleBar {
    x: [number, number];
    y: string;
}

export interface ScheduleChartConfig {
    data: ChartData<'bar', ScheduleBar[], string>;
    options: ChartOptions<'bar'>;
}

/** The tooltip of a block: "Schedule:" in the series colour above "state: start - end" in elapsed time. */
export function scheduleTooltipView(preview: SchedulePreview, items: TooltipItem<'bar'>[]): TooltipView | undefined {
    if (items.length === 0) {
        return undefined;
    }
    const bar = items[0].raw as ScheduleBar;
    return {
        range: { name: 'Schedule', color: withOpacity(preview.color), category: bar.y, start: formatElapsed(bar.x[0] / 1000), end: formatElapsed(bar.x[1] / 1000) },
    };
}

/** The chart.js configuration of a schedule preview: horizontal bars over the elapsed time in ms, 220px high. */
export function scheduleChartConfig(preview: SchedulePreview): ScheduleChartConfig {
    const color = withOpacity(preview.color);
    const x = xAxisLook();
    return {
        data: {
            labels: preview.rows,
            datasets: [{
                label: 'Schedule',
                data: preview.blocks.map((b) => ({ x: [b.startSeconds * 1000, b.endSeconds * 1000] as [number, number], y: b.name })),
                backgroundColor: color,
                hoverBackgroundColor: color,
                borderWidth: 0,
                barPercentage: 0.7,
                categoryPercentage: 1,
                grouped: false,
            }],
        },
        options: {
            animation: false,
            maintainAspectRatio: false,
            indexAxis: 'y',
            interaction: { mode: 'nearest', intersect: true },
            scales: {
                x: {
                    ...x,
                    type: 'linear',
                    min: 0,
                    ticks: { ...x.ticks, maxTicksLimit: 6, callback: (value) => formatElapsed(Number(value) / 1000) },
                },
                y: {
                    grid: { display: true, offset: true, drawTicks: false, color: chartGridColor },
                    border: { display: false },
                    ticks: { color: chartTextColor, font: { family: chartFontFamily, size: 11 }, padding: 8 },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false, position: 'cursor', external: htmlTooltip((items) => scheduleTooltipView(preview, items), true) },
                zoom: xZoom(true),
            },
        },
    };
}
