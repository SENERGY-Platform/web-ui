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

import { TooltipItem } from 'chart.js';
import { format } from 'date-fns';
import { FramedChartConfig } from './google-columns';
import { GoogleFrame, googleLayout, GoogleValueAxis, valueAxisTicks, xAxisLayout } from './google-chartjs';
import { withOpacity } from './chart-look';
import { alignToStep, googleAxisNumber, googleDateStep, googleDecimal, googleValueTicks, ValueTicks } from './google-look';
import { GoogleTooltipView, googleTooltip, labelledLine, TooltipRun } from './google-tooltip';

export interface GoogleSeries {
    label: string;
    color: string;
    /** x in ms; y null for a gap */
    points: { x: number; y: number | null }[];
    /** the value axis on the right (targetAxisIndex 1) */
    secondAxis?: boolean;
}

export interface GoogleValueAxisInput {
    title?: string;
    /** the labels of the ticks; Google's default without a format */
    label?: (value: number, decimals: number) => string;
    min?: number;
}

export interface GoogleLinesInput {
    frame: GoogleFrame;
    kind: 'line' | 'area' | 'scatter';
    series: GoogleSeries[];
    axes?: { left?: GoogleValueAxisInput; right?: GoogleValueAxisInput };
    /** 'maximized' keeps the value range of the data */
    valueMode?: 'pretty' | 'maximized';
    xTitle?: string;
    /** the format of the x labels; Google's own labels without */
    xFormat?: (date: Date) => string;
    /** curveType 'function' */
    curve?: boolean;
    /** interpolateNulls */
    spanGaps?: boolean;
    /** explorer: dragToZoom and rightClickToReset along x */
    explorer?: boolean;
    /** the tooltip lines of a point instead of Google's default */
    tooltip?: (series: number, point: number) => TooltipRun[][] | undefined;
}

/** The date in Google's default tooltip, e.g. "04.10.2026, 22:00:00". */
export function googleTooltipDate(ms: number): string {
    return format(ms, 'dd.MM.yyyy, HH:mm:ss');
}

/** Google's default tooltip: the date in bold, then series and value; for a scatter the series, then date and value in bold. */
export function defaultTooltipLines(kind: GoogleLinesInput['kind'], series: GoogleSeries, point: { x: number; y: number | null }): TooltipRun[][] {
    const value = point.y === null ? '' : googleDecimal(point.y);
    if (kind === 'scatter') {
        return [[{ text: series.label }], [{ text: googleTooltipDate(point.x) + ', ' + value, bold: true }]];
    }
    return [[{ text: googleTooltipDate(point.x), bold: true }], labelledLine(series.label, value)];
}

function finite(values: (number | null)[]): number[] {
    return values.filter((v): v is number => v !== null && Number.isFinite(v));
}

/** The domain of the x axis: the data range; a scatter widened to whole ticks, or by half the range on both sides without x labels. */
export function xDomain(input: GoogleLinesInput): { min: number; max: number } {
    const xs = input.series.flatMap((s) => s.points.map((p) => p.x)).filter((x) => Number.isFinite(x));
    if (xs.length === 0) {
        return { min: 0, max: 1 };
    }
    let min = Math.min(...xs);
    let max = Math.max(...xs);
    if (min === max) {
        min -= 1;
        max += 1;
    }
    if (input.kind !== 'scatter') {
        return { min, max };
    }
    if (!xAxisLayout(input.frame, (input.xTitle || '') !== '').labels) {
        const half = (max - min) / 2;
        return { min: min - half, max: max + half };
    }
    const step = googleDateStep(min, max, input.frame.area.width, input.frame.fontSize);
    return { min: alignToStep(min, step, 'floor'), max: alignToStep(max, step, 'ceil') };
}

interface BuiltAxis {
    id: 'y' | 'y2';
    ticks: ValueTicks;
    axis: GoogleValueAxis;
}

function valueAxes(input: GoogleLinesInput): BuiltAxis[] {
    const length = input.frame.area.height;
    const sides: { id: 'y' | 'y2'; side: 'left' | 'right'; config?: GoogleValueAxisInput; series: GoogleSeries[] }[] = [
        { id: 'y', side: 'left', config: input.axes?.left, series: input.series.filter((s) => !s.secondAxis) },
        { id: 'y2', side: 'right', config: input.axes?.right, series: input.series.filter((s) => s.secondAxis === true) },
    ];
    const built: BuiltAxis[] = [];
    sides.filter((s) => s.series.length > 0 || (s.id === 'y' && input.series.length === 0)).forEach((s) => {
        const values = finite(s.series.flatMap((series) => series.points.map((p) => p.y)));
        const primary = built[0];
        const ticks = googleValueTicks(Math.min(...values), Math.max(...values), length, {
            mode: input.valueMode, min: s.config?.min, intervals: primary === undefined ? undefined : primary.ticks.intervals,
        });
        const label = s.config?.label || googleAxisNumber;
        built.push({
            id: s.id, ticks,
            axis: { scaleId: s.id, side: s.side, ticks: valueAxisTicks(ticks, label), title: s.config?.title, gridlines: primary === undefined },
        });
    });
    return built;
}

/** A Google line, area or scatter chart over a date axis in the frame; series later in the list are drawn on top. */
export function googleLinesConfig(input: GoogleLinesInput): FramedChartConfig<'line'> {
    const frame = input.frame;
    const axes = valueAxes(input);
    const domain = xDomain(input);
    const scatter = input.kind === 'scatter';
    const datasets = input.series.map((s, i) => ({
        label: s.label,
        data: s.points,
        yAxisID: s.secondAxis ? 'y2' : 'y',
        borderColor: s.color,
        backgroundColor: input.kind === 'area' ? withOpacity(s.color, 0.3) : s.color,
        borderWidth: 2,
        fill: input.kind === 'area' ? 'origin' : false,
        showLine: !scatter,
        pointRadius: scatter ? 4.5 : 0,
        pointHoverRadius: scatter ? 4.5 : 0,
        pointBorderWidth: 0,
        pointHoverBorderWidth: 0,
        pointBackgroundColor: s.color,
        pointHitRadius: 6,
        tension: input.curve ? 0.3 : 0,
        googleCurve: input.curve === true,
        spanGaps: input.spanGaps === true,
        // Google clipped the series at the whole chart area, half a pixel beyond the value range
        clip: 0.5,
        order: -i,
    }));
    const scales: Record<string, unknown> = { x: { type: 'linear', display: false, min: domain.min, max: domain.max } };
    axes.forEach((a) => (scales[a.id] = { type: 'linear', display: false, position: a.axis.side, min: a.ticks.min, max: a.ticks.max }));
    const tooltip = googleTooltip((items: TooltipItem<'line'>[]) => {
        const item = items[0];
        if (item === undefined) {
            return undefined;
        }
        const series = input.series[item.datasetIndex];
        const point = series?.points[item.dataIndex];
        if (point === undefined || point.y === null) {
            return undefined;
        }
        const lines = input.tooltip !== undefined ? input.tooltip(item.datasetIndex, item.dataIndex) : defaultTooltipLines(input.kind, series, point);
        if (lines === undefined) {
            return undefined;
        }
        const element = item.element as unknown as { x: number; y: number };
        // the tail ended this far left of and above (or below) the point
        const offset = scatter ? 4.5 : 3.5;
        const view: GoogleTooltipView = { lines, tip: { x: element.x - offset, y: element.y - offset }, tipBelow: { x: element.x - offset, y: element.y + offset }, side: 'left' };
        return view;
    }, () => frame.fontSize);
    return {
        frame,
        data: { datasets: datasets as any },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: googleLayout(frame),
            interaction: { mode: 'nearest', intersect: true },
            scales: scales as any,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false, external: tooltip },
                zoom: input.explorer ? googleExplorer(domain) : undefined,
                googleAxes: {
                    frame,
                    baseline: 'under',
                    x: { scaleId: 'x', kind: 'date', dateFormat: input.xFormat, title: input.xTitle },
                    y: axes.map((a) => a.axis),
                },
            } as any,
        },
    };
}

/** Google's explorer with dragToZoom and rightClickToReset along x, at most 1000 times enlarged; reset by resetZoom on right click. */
export function googleExplorer(domain: { min: number; max: number }) {
    return {
        zoom: {
            drag: { enabled: true, backgroundColor: 'rgba(0,0,255,0.2)', borderWidth: 0 },
            wheel: { enabled: false },
            pinch: { enabled: false },
            mode: 'x' as const,
        },
        pan: { enabled: false },
        limits: { x: { min: domain.min, max: domain.max, minRange: (domain.max - domain.min) * 0.001 } },
    };
}
