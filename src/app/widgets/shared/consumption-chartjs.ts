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
    autoHeightAspectRatio, decimalPlaces, hoverColor, laterSeriesOnTop, legendLook, timeAxisLook, valueAxisLabel, valueAxisLook, withOpacity, xZoom,
} from 'src/app/core/charts/chart-look';
import { htmlTooltip, TooltipView } from 'src/app/core/charts/chart-tooltip';
import { consumptionColors, ConsumptionSeries } from './consumption-series';

export interface ConsumptionChartConfig {
    data: ChartData<'scatter', { x: number; y: any }[]>;
    options: ChartOptions<'scatter'>;
}

const decimalsInFloat = 3;

function allValues(series: ConsumptionSeries[]): unknown[] {
    return series.flatMap((s) => s.data.map((p) => p.y));
}

/** The date in the title and the axis bubble, one row with the series name and its value. */
export function consumptionTooltipView(series: ConsumptionSeries[], dateFormat: string, items: TooltipItem<'scatter'>[]): TooltipView | undefined {
    if (items.length === 0) {
        return undefined;
    }
    const item = items[0];
    const point = series[item.datasetIndex].data[item.dataIndex];
    const date = format(point.x, dateFormat);
    const value = valueAxisLabel(Number(point.y), decimalPlaces(allValues(series)), decimalsInFloat);
    return { title: date, rows: [{ color: withOpacity(consumptionColors[item.datasetIndex]), label: series[item.datasetIndex].name, value }], axisLabel: date };
}

/** Normal consumption as blue, anomalous as red points over local time; dateFormat is the tooltip's. */
export function consumptionChartConfig(series: ConsumptionSeries[], dateFormat: string): ConsumptionChartConfig {
    return {
        data: {
            datasets: laterSeriesOnTop(series.map((s, i) => ({
                label: s.name,
                data: s.data,
                backgroundColor: withOpacity(consumptionColors[i]),
                borderColor: '#fff',
                borderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHitRadius: 6,
                pointHoverBackgroundColor: hoverColor(consumptionColors[i]),
                pointHoverBorderColor: '#fff',
                order: 0,
            }))),
        },
        options: {
            animation: false,
            aspectRatio: autoHeightAspectRatio,
            interaction: { mode: 'nearest', intersect: true },
            scales: {
                x: timeAxisLook(),
                y: valueAxisLook(allValues(series), decimalsInFloat),
            },
            plugins: {
                legend: legendLook(true) as any,
                tooltip: { enabled: false, external: htmlTooltip((items) => consumptionTooltipView(series, dateFormat, items)) },
                zoom: xZoom(true),
            },
        },
    };
}
