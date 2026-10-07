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
import { format } from 'date-fns';
import { axisTitle, chartFontFamily, chartGridColor, chartTextColor, hoverColor, legendLook, timeAxisLook, withOpacity, xZoom } from 'src/app/core/charts/chart-look';
import { htmlTooltip, TooltipView } from 'src/app/core/charts/chart-tooltip';
import { TimelineSeries, timelineRows } from './timeline-chart-data';

/** Start and end of a bar in its tooltip. */
export const timelineDateFormat = 'dd.MM HH:mm:ss';

export interface TimelineChartBar {
    x: [number, number];
    y: string;
}

export interface TimelineChartConfig {
    data: ChartData<'bar', TimelineChartBar[], string>;
    options: ChartOptions<'bar'>;
}

/** The bar a user clicked on. */
export interface TimelineSelection {
    seriesName: string;
    row: string;
    start: number;
    end: number;
}

export function timelineSelection(series: TimelineSeries[], datasetIndex: number, index: number): TimelineSelection | undefined {
    const bar = series[datasetIndex]?.bars[index];
    return bar === undefined ? undefined : { seriesName: series[datasetIndex].name, row: bar.row, start: bar.start, end: bar.end };
}

/** "state:" in the state's colour above "row: start - end". */
export function timelineTooltipView(series: TimelineSeries[], items: TooltipItem<'bar'>[]): TooltipView | undefined {
    const selection = items.length === 0 ? undefined : timelineSelection(series, items[0].datasetIndex, items[0].dataIndex);
    if (selection === undefined) {
        return undefined;
    }
    return {
        range: {
            name: selection.seriesName,
            color: series[items[0].datasetIndex].color,
            category: selection.row,
            start: format(selection.start, timelineDateFormat),
            end: format(selection.end, timelineDateFormat),
        },
    };
}

/** Horizontal bars over local time, one row per timeline row, the bars of every state in its colour. */
export function timelineChartConfig(
    series: TimelineSeries[], xRange: [number | undefined, number | undefined], hAxisLabel: string, vAxisLabel: string, legendAlign: 'center' | 'end' = 'end',
): TimelineChartConfig {
    return {
        data: {
            labels: timelineRows(series),
            datasets: series.map((s) => ({
                label: s.name,
                data: s.bars.map((bar) => ({ x: [bar.start, bar.end] as [number, number], y: bar.row })),
                backgroundColor: withOpacity(s.color),
                hoverBackgroundColor: hoverColor(s.color),
                borderWidth: 0,
                barPercentage: 0.9,
                categoryPercentage: 1,
                grouped: false,
            })),
        },
        options: {
            animation: false,
            maintainAspectRatio: false,
            indexAxis: 'y',
            interaction: { mode: 'nearest', intersect: true },
            scales: {
                x: { ...timeAxisLook(hAxisLabel), min: xRange[0], max: xRange[1] },
                y: {
                    title: axisTitle(vAxisLabel),
                    grid: { display: true, offset: true, drawTicks: false, color: chartGridColor() },
                    border: { display: false },
                    ticks: { color: chartTextColor(), font: { family: chartFontFamily, size: 11 }, padding: 8 },
                },
            },
            plugins: {
                legend: legendLook(true, 'top', legendAlign) as any,
                tooltip: { enabled: false, position: 'cursor', external: htmlTooltip((items) => timelineTooltipView(series, items), true) },
                zoom: xZoom(false),
            },
        },
    };
}
