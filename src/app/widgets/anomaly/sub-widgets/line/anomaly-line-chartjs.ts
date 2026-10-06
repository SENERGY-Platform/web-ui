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
import {
    decimalPlaces, hoverColor, laterSeriesOnTop, legendLook, timeAxisLook, valueAxisLabel, valueAxisLook, withOpacity, xRangeAnnotations, xZoom,
} from 'src/app/core/charts/chart-look';
import { htmlTooltip, TooltipView } from 'src/app/core/charts/chart-tooltip';
import { AnomalyResultModel } from '../../shared/anomaly.model';
import { AnomalyInterval, AnomalyLineSeries, valueTooltipMessage, XYPoint } from './anomaly-line-chart';

export const anomalyDateFormat = 'dd.MM HH:mm:ss.SSS';
const decimalsInFloat = 3;

export interface AnomalyChartConfig {
    data: ChartData<'line', XYPoint[]>;
    options: ChartOptions<'line'>;
}

function values(series: AnomalyLineSeries[]): unknown[] {
    return series.flatMap((s) => s.data.map((p) => p.y));
}

/** Line series as 5px lines with markers of their size, outlined white; scatter series as points only; hoverGrowth enlarges hovered points. */
function datasets(series: AnomalyLineSeries[], hoverGrowth: number) {
    return laterSeriesOnTop(series.map((s) => {
        const color = withOpacity(s.color);
        return {
            label: s.name,
            data: s.data,
            showLine: s.type === 'line',
            borderColor: color,
            backgroundColor: color,
            borderWidth: 5,
            pointRadius: s.markerSize,
            pointBorderColor: '#fff',
            pointBorderWidth: s.markerSize > 0 ? 2 : 0,
            pointBackgroundColor: color,
            pointHoverRadius: s.markerSize + hoverGrowth,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            // scatter points brightened under the mouse, line markers did not change
            pointHoverBackgroundColor: hoverGrowth > 0 ? hoverColor(s.color) : color,
            order: 0,
        };
    }));
}

/** The hovered value as one line, e.g. "Device Output: 95.20", the date in the axis bubble. */
export function valueChartTooltipView(series: AnomalyLineSeries[], extremeOutliers: AnomalyResultModel[], items: TooltipItem<'line'>[]): TooltipView | undefined {
    if (items.length === 0) {
        return undefined;
    }
    // of several equally near values the first series' one, the device output before its outlier
    const item = items.reduce((a, b) => (b.datasetIndex < a.datasetIndex ? b : a));
    const point = series[item.datasetIndex].data[item.dataIndex];
    return { line: valueTooltipMessage(item.datasetIndex, item.dataIndex, Number(point.y), extremeOutliers), axisLabel: format(point.x, anomalyDateFormat) };
}

/** The date as title and in the axis bubble, the series name and value below. */
export function timeChartTooltipView(series: AnomalyLineSeries[], items: TooltipItem<'line'>[]): TooltipView | undefined {
    if (items.length === 0) {
        return undefined;
    }
    const s = series[items[0].datasetIndex];
    const point = s.data[items[0].dataIndex];
    const date = format(point.x, anomalyDateFormat);
    return { title: date, rows: [{ color: withOpacity(s.color), label: s.name, value: valueAxisLabel(Number(point.y), decimalPlaces(values(series)), decimalsInFloat) }], axisLabel: date };
}

function chartConfig(
    series: AnomalyLineSeries[], yTitle: string, hoverGrowth: number, tooltip: (items: TooltipItem<'line'>[]) => TooltipView | undefined, intervals: AnomalyInterval[], shared: boolean,
): AnomalyChartConfig {
    return {
        data: { datasets: datasets(series, hoverGrowth) },
        options: {
            animation: false,
            maintainAspectRatio: false,
            // the line chart showed the value nearest to the mouse, the scatter chart only a point under it
            interaction: { mode: 'nearest', intersect: !shared },
            scales: {
                x: timeAxisLook(),
                y: valueAxisLook(values(series), decimalsInFloat, yTitle),
            },
            plugins: {
                legend: legendLook(true) as any,
                tooltip: { enabled: false, external: htmlTooltip(tooltip) },
                annotation: { annotations: intervals.flatMap((i) => xRangeAnnotations(i.from, i.to, i.color, i.opacity)) },
                zoom: xZoom(true),
            },
        },
    };
}

/** The device output with its outliers, the shaded curve anomalies and, in debug, the reconstruction. */
export function valueChartConfig(series: AnomalyLineSeries[], intervals: AnomalyInterval[], extremeOutliers: AnomalyResultModel[]): AnomalyChartConfig {
    return chartConfig(series, 'Device Output', 0, (items) => valueChartTooltipView(series, extremeOutliers, items), intervals, true);
}

/** The waiting times between values and the frequency anomalies as points. */
export function timeChartConfig(series: AnomalyLineSeries[], yTitle: string): AnomalyChartConfig {
    return chartConfig(series, yTitle, 2, (items) => timeChartTooltipView(series, items), [], false);
}
