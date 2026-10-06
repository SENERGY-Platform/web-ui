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

import { Chart, ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { AnnotationOptions } from 'chartjs-plugin-annotation';
import { format } from 'date-fns';
import {
    autoHeightAspectRatio, decimalPlaces, defaultSeriesColor, legendLook, timeAxisLook, valueAxisLabel, valueAxisLook, withOpacity, xRangeAnnotations, xZoom,
} from 'src/app/core/charts/chart-look';
import { htmlTooltip, TooltipView } from 'src/app/core/charts/chart-tooltip';
import { VentilationRange } from './bad-ventilation-chart';

export const humidityDateFormat = 'dd.MM HH:mm:ss.SSS';
const decimalsInFloat = 3;
/** Opacity of the shaded ranges. */
const rangeOpacity = 0.3;

export interface BadVentilationChartConfig {
    data: ChartData<'line', { x: number; y: number }[]>;
    options: ChartOptions<'line'>;
    /** what tooltip and axis labels read, replaced by refreshBadVentilationChart */
    state: { points: { x: number; y: number }[] };
}

/** Every range shaded and labelled in its colour, later ranges drawn over the labels of earlier ones. */
export function ventilationAnnotations(ranges: VentilationRange[]): AnnotationOptions[] {
    return ranges.flatMap((range) => xRangeAnnotations(range.from, range.to, range.color, rangeOpacity, range.label));
}

export function humidityTooltipView(points: { x: number; y: number }[], items: TooltipItem<'line'>[]): TooltipView | undefined {
    if (items.length === 0) {
        return undefined;
    }
    const point = points[items[0].dataIndex];
    const date = format(point.x, humidityDateFormat);
    return {
        title: date,
        rows: [{ color: withOpacity(defaultSeriesColor), label: 'Humidity', value: valueAxisLabel(point.y, decimalPlaces(points.map((p) => p.y)), decimalsInFloat) }],
        axisLabel: date,
    };
}

/** The humidity as a thick blue line over local time, with the open window and high humidity ranges. */
export function badVentilationChartConfig(points: { x: number; y: number }[], ranges: VentilationRange[]): BadVentilationChartConfig {
    const color = withOpacity(defaultSeriesColor);
    const state = { points };
    return {
        state,
        data: {
            datasets: [{
                label: 'Humidity',
                data: points,
                borderColor: color,
                backgroundColor: color,
                borderWidth: 5,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBorderWidth: 2,
                pointHoverBorderColor: '#fff',
                pointHoverBackgroundColor: color,
            }],
        },
        options: {
            animation: false,
            aspectRatio: autoHeightAspectRatio,
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
                x: timeAxisLook(),
                y: valueAxisLook(() => state.points.map((p) => p.y), decimalsInFloat),
            },
            plugins: {
                // a single series had no legend
                legend: legendLook(false) as any,
                tooltip: { enabled: false, external: htmlTooltip((items) => humidityTooltipView(state.points, items)) },
                annotation: { annotations: ventilationAnnotations(ranges) },
                zoom: xZoom(true),
            },
        },
    };
}

/**
 * Puts new data into a drawn chart without replacing its configuration, so that its zoom and the zoom or
 * pan mode chosen in the toolbar stay as they are.
 */
export function refreshBadVentilationChart(config: BadVentilationChartConfig, chart: Chart | undefined, points: { x: number; y: number }[], ranges: VentilationRange[]) {
    config.state.points = points;
    config.data.datasets[0].data = points;
    const annotations = ventilationAnnotations(ranges);
    (config.options.plugins as any).annotation.annotations = annotations;
    if (chart !== undefined) {
        (chart.options.plugins as any).annotation.annotations = annotations;
        chart.update();
    }
}
