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
import { laterSeriesOnTop, legendLook, withOpacity, xAxisLook, xZoom, yAxisLook } from 'src/app/core/charts/chart-look';
import { htmlTooltip, TooltipView } from 'src/app/core/charts/chart-tooltip';
import { ProfilePreview, profileValueLabel } from './environments-profile-preview';

export interface ProfileChartConfig {
    data: ChartData<'line', number[], string>;
    options: ChartOptions<'line'>;
}

/** The tooltip of the profile preview: the hour as title and in the axis bubble, every series' value below. */
export function profileTooltipView(preview: ProfilePreview, items: TooltipItem<'line'>[]): TooltipView | undefined {
    if (items.length === 0) {
        return undefined;
    }
    const hour = preview.hourLabels[items[0].dataIndex];
    const rows = preview.series.map((series) => ({ color: withOpacity(series.color), label: series.name, value: profileValueLabel(series.values[items[0].dataIndex]) }));
    return { title: hour, rows, axisLabel: hour };
}

/** The chart.js configuration of a profile preview, 220px high. */
export function profileChartConfig(preview: ProfilePreview): ProfileChartConfig {
    const datasets = laterSeriesOnTop(preview.series.map((series) => {
        const color = withOpacity(series.color);
        return {
            label: series.name,
            data: series.values,
            borderColor: color,
            backgroundColor: color,
            pointBackgroundColor: color,
            pointBorderColor: color,
            borderWidth: series.width,
            borderDash: series.dashed ? [4, 4] : [],
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
            order: 0,
        };
    }));
    const x = xAxisLook();
    const y = yAxisLook();
    return {
        data: { labels: preview.hourLabels, datasets },
        options: {
            animation: false,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { ...x, ticks: { ...x.ticks, autoSkip: false } },
                y: { ...y, ticks: { ...y.ticks, callback: (value) => profileValueLabel(Number(value)) } },
            },
            plugins: {
                legend: legendLook(preview.showLegend) as any,
                tooltip: { enabled: false, external: htmlTooltip((items) => profileTooltipView(preview, items)) },
                zoom: xZoom(true),
            },
        },
    };
}
