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

import { ChartData, ChartOptions, ChartType, TooltipItem } from 'chart.js';
import { GoogleFrame, googleLayout, valueAxisTicks } from './google-chartjs';
import { googleValueTicks } from './google-look';
import { googleTooltip, TooltipRun } from './google-tooltip';

/** A chart.js configuration drawn in a fixed frame; the canvas parent gets the frame's size. */
export interface FramedChartConfig<T extends ChartType> {
    frame: GoogleFrame;
    data: ChartData<T, any[], any>;
    options: ChartOptions<T>;
}

export interface ColumnsInput {
    frame: GoogleFrame;
    values: (number | null)[];
    color: string;
    /** the value axis labels, e.g. googleDecimal or googlePercent */
    valueLabel: (value: number, decimals: number) => string;
    /** a fixed lower bound of the value axis (viewWindow.min); without one the axis is pretty */
    min?: number;
    /** the texts drawn on or above the columns (annotation role) */
    barLabels?: string[];
    /** the tooltip lines of a column; undefined for no tooltip */
    tooltip?: (index: number) => TooltipRun[][] | undefined;
    /** Google's columns had a 1px outline in their colour, except on a date axis */
    outline?: boolean;
}

/** The tooltip of a column points at its top corner nearer the middle and leans towards the middle. */
function columnTooltip(input: ColumnsInput) {
    return googleTooltip((items: TooltipItem<'bar'>[], chart) => {
        const item = items[0];
        const lines = item === undefined || input.tooltip === undefined ? undefined : input.tooltip(item.dataIndex);
        if (item === undefined || lines === undefined) {
            return undefined;
        }
        const bar = item.element as unknown as { x: number; y: number; base: number; width: number };
        const right = bar.x < (chart.chartArea.left + chart.chartArea.right) / 2;
        const tip = { x: Math.round(bar.x + (right ? bar.width / 2 : -bar.width / 2)) + 0.5, y: Math.round(Math.min(bar.y, bar.base)) + 0.5 };
        return { lines, tip, side: right ? 'right' : 'left' };
    }, () => input.frame.fontSize);
}

function valueAxis(input: ColumnsInput) {
    const finite = input.values.filter((v): v is number => v !== null && Number.isFinite(v));
    const ticks = googleValueTicks(Math.min(...finite, input.min ?? Infinity), Math.max(...finite, input.min ?? -Infinity), input.frame.area.height,
        { min: input.min });
    return { ticks, axisTicks: valueAxisTicks(ticks, input.valueLabel) };
}

function datasetLook(input: ColumnsInput, categoryPercentage: number) {
    const outline = input.outline !== false;
    return {
        data: input.values,
        backgroundColor: input.color,
        hoverBackgroundColor: input.color,
        borderColor: input.color,
        hoverBorderColor: input.color,
        borderWidth: outline ? 1 : 0,
        // the outline of the base edge lay under the baseline
        borderSkipped: 'start' as const,
        // Google's outline left a hairline on the baseline for a zero value
        minBarLength: outline ? 1 : 0,
        categoryPercentage,
        barPercentage: 1,
        clip: 0.5,
    };
}

function baseOptions(input: ColumnsInput, ticks: { min: number; max: number }) {
    return {
        animation: false as const,
        responsive: true,
        maintainAspectRatio: false,
        layout: googleLayout(input.frame),
        interaction: { mode: 'nearest' as const, intersect: true },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false, external: columnTooltip(input) },
            googleBarLabels: input.barLabels === undefined ? undefined : { fontSize: input.frame.fontSize, labels: input.barLabels },
        },
        yScale: { type: 'linear' as const, display: false, min: ticks.min, max: ticks.max },
    };
}

/** Google's column chart over categories: columns 61.8% of their slot wide (plus outline), labels below in #222. */
export function categoryColumnsConfig(input: ColumnsInput & { categories: string[] }): FramedChartConfig<'bar'> {
    const { ticks, axisTicks } = valueAxis(input);
    const slot = input.categories.length === 0 ? 1 : input.frame.area.width / input.categories.length;
    const width = Math.round(0.618 * slot) + (input.outline !== false ? 1 : 0);
    const base = baseOptions(input, ticks);
    return {
        frame: input.frame,
        data: { labels: input.categories, datasets: [datasetLook(input, Math.min(1, width / slot))] },
        options: {
            animation: base.animation,
            responsive: base.responsive,
            maintainAspectRatio: base.maintainAspectRatio,
            layout: base.layout,
            interaction: base.interaction,
            scales: { x: { type: 'category', display: false, offset: true }, y: base.yScale },
            plugins: {
                ...base.plugins,
                googleAxes: {
                    frame: input.frame,
                    baseline: 'over',
                    x: { scaleId: 'x', kind: 'category', ticks: input.categories.map((c, i) => ({ value: i, label: c, major: true })) },
                    y: [{ scaleId: 'y', side: 'left', ticks: axisTicks }],
                },
            } as any,
        },
    };
}

/** Google's column chart over a continuous date axis: one column per value, 61.8% of the shortest distance wide, half a distance of room at the ends. */
export function dateColumnsConfig(input: ColumnsInput & { times: number[]; dateFormat?: (date: Date) => string }): FramedChartConfig<'bar'> {
    const { ticks, axisTicks } = valueAxis(input);
    const sorted = [...input.times].sort((a, b) => a - b);
    const distances = sorted.slice(1).map((t, i) => t - sorted[i]).filter((d) => d > 0);
    const distance = distances.length === 0 ? 86400000 : Math.min(...distances);
    const base = baseOptions(input, ticks);
    return {
        frame: input.frame,
        data: { datasets: [{ ...datasetLook(input, 0.618), data: input.values.map((v, i) => ({ x: input.times[i], y: v })) }] },
        options: {
            animation: base.animation,
            responsive: base.responsive,
            maintainAspectRatio: base.maintainAspectRatio,
            layout: base.layout,
            interaction: base.interaction,
            scales: {
                x: { type: 'linear', display: false, offset: false, min: (sorted[0] ?? 0) - distance / 2, max: (sorted[sorted.length - 1] ?? 0) + distance / 2 },
                y: base.yScale,
            },
            plugins: {
                ...base.plugins,
                googleAxes: {
                    frame: input.frame,
                    baseline: 'over',
                    x: { scaleId: 'x', kind: 'date', dateFormat: input.dateFormat },
                    y: [{ scaleId: 'y', side: 'left', ticks: axisTicks }],
                },
            } as any,
        },
    };
}
