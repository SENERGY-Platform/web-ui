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

import { Chart, ChartOptions, LegendOptions, Plugin, Scale } from 'chart.js';
import { AnnotationOptions } from 'chartjs-plugin-annotation';
import Color from 'color';
import { themeColor, themeColorMix } from './theme-color';
import { timeTickLabel, timeTicks, withoutOverlaps } from './time-ticks';

/*
 * The look of the charts that used to be drawn by ApexCharts (fonts, colours, axes, legend, zoom),
 * so that every one of them keeps it after the move to chart.js.
 */

export const chartFontFamily = 'Helvetica, Arial, sans-serif';
/** Axis labels and titles; follows the theme, the old fixed colour is the fallback. */
export const chartTextColor = () => themeColor('--mat-sys-on-surface-variant', '#373d3f');
/** Grid lines and axis borders. */
export const chartGridColor = () => themeColorMix('--mat-sys-on-surface', 12, '#e0e0e0');
/** Every series used to be drawn with this opacity, lines and markers included. */
export const seriesOpacity = 0.85;
export const defaultSeriesColor = '#008FFB';
/** Charts with height 'auto' used to be this many times as wide as high. */
export const autoHeightAspectRatio = 1.61;

/** The colour as rgba with the given opacity; unparsable colours are returned unchanged. */
export function withOpacity(color: string, opacity = seriesOpacity): string {
    try {
        return Color(color).alpha(opacity).rgb().string();
    } catch (_) {
        return color;
    }
}

/** The largest number of decimal places among the values; non-numbers count as integers. */
export function decimalPlaces(values: unknown[]): number {
    let places = 0;
    values.forEach((value) => {
        if (typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value)) {
            const fraction = String(value).split('.')[1] || '';
            // values like 1e-7 have no '.' in their string form, count their exponent instead
            const exponent = /e-(\d+)$/.exec(String(value));
            places = Math.max(places, exponent ? Number(exponent[1]) + fraction.replace(/e-\d+$/, '').length : fraction.length);
        }
    });
    return places;
}

/**
 * A value axis label as the charts showed it: with decimalsInFloat (or the data's own) places as soon
 * as any value has decimals, else whole numbers, with one place only for ticks between integers.
 */
export function valueAxisLabel(value: number, dataDecimals: number, decimalsInFloat?: number): string {
    if (dataDecimals !== 0) {
        return value.toFixed(decimalsInFloat ?? dataDecimals);
    }
    const whole = value.toFixed(0);
    return Number(whole) === value ? whole : value.toFixed(1);
}

export function axisTitle(text: string) {
    return { display: text !== '', text, color: chartTextColor(), font: { family: chartFontFamily, size: 11, weight: 900 } };
}

/** The category or time axis at the bottom: border and short ticks, no vertical grid lines. */
export function xAxisLook(title = '') {
    return {
        title: axisTitle(title),
        grid: { display: true, drawOnChartArea: false, drawTicks: true, tickLength: 6, color: chartGridColor() },
        border: { display: true, color: chartGridColor() },
        ticks: { color: chartTextColor(), font: { family: chartFontFamily, size: 12 }, maxRotation: 45 },
    };
}

/** The value axis: horizontal grid lines, no border, labels 11px. */
export function yAxisLook(title = '') {
    return {
        title: axisTitle(title),
        grid: { display: true, drawTicks: false, color: chartGridColor() },
        border: { display: false },
        ticks: { color: chartTextColor(), font: { family: chartFontFamily, size: 11 }, padding: 8, maxTicksLimit: 6 },
    };
}

/** A time axis at the bottom in local time with the former ticks and labels. */
export function timeAxisLook(title = '') {
    const x = xAxisLook(title);
    return {
        ...x,
        type: 'time' as const,
        afterBuildTicks: (scale: Scale) => {
            const width = scale.width;
            const ticks = withoutOverlaps(timeTicks(scale.min, scale.max, width), scale.min, scale.max, width, (label) => labelLength(scale.chart, label, x.ticks.font));
            scale.ticks = ticks.map((t) => ({ value: t.value }));
        },
        ticks: {
            ...x.ticks,
            maxRotation: 0,
            // the former axis already left out overlapping labels in afterBuildTicks
            autoSkip: false,
            callback(this: Scale, value: string | number) {
                return timeTickLabel(Number(value), this.min, this.max);
            },
        },
    };
}

/** A value axis over a nice range around the data, labelled as before with decimalsInFloat places once the data has decimals. */
export function valueAxisLook(values: unknown[] | (() => unknown[]), decimalsInFloat?: number, title = '') {
    const y = yAxisLook(title);
    // a function is read on every label, for charts whose data is replaced in place
    const current = typeof values === 'function' ? values : () => values;
    return { ...y, ticks: { ...y.ticks, callback: (value: string | number) => valueAxisLabel(Number(value), decimalPlaces(current()), decimalsInFloat) } };
}

export function legendLook(display: boolean, position: 'top' | 'bottom' = 'bottom', align: 'center' | 'end' = 'center'): Partial<LegendOptions<any>> {
    return {
        display,
        position,
        align,
        labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            // the point radius is boxHeight / sqrt(2), so 9 draws the former 12px dots
            boxWidth: 9,
            boxHeight: 9,
            color: chartTextColor(),
            font: { family: chartFontFamily, size: 12 },
            sort: (a: { datasetIndex?: number }, b: { datasetIndex?: number }) => (a.datasetIndex ?? 0) - (b.datasetIndex ?? 0),
        } as any,
    };
}

/** Drag selects an x range to zoom into, the mouse wheel zooms around the pointer unless disabled. */
export function xZoom(wheel: boolean): NonNullable<NonNullable<ChartOptions['plugins']>['zoom']> {
    return {
        zoom: {
            drag: { enabled: true, backgroundColor: withOpacity('#90CAF9', 0.4), borderColor: '#0D47A1', borderWidth: 1 },
            wheel: { enabled: wheel, speed: 0.5 },
            mode: 'x',
        },
        pan: { enabled: false, mode: 'x' },
        limits: { x: { min: 'original', max: 'original' } },
    };
}

function labelLength(chart: Chart, text: string, font: { family: string; size: number }): number {
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = font.size + 'px ' + font.family;
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
}

/** A shaded x range with an optional vertical label left of its start, the way x axis annotations looked. */
export function xRangeAnnotations(from: number, to: number, color: string, opacity: number, label?: string): AnnotationOptions[] {
    const annotations: AnnotationOptions[] = [{
        type: 'box',
        drawTime: 'beforeDatasetsDraw',
        xMin: from,
        xMax: to,
        backgroundColor: withOpacity(color, opacity),
        borderWidth: 0,
    }];
    if (label !== undefined) {
        // the label is turned upright around its centre, so the centre is placed: left of the range start, its top at the plot top
        const font = { family: chartFontFamily, size: 11 };
        const padding = { left: 5, right: 5, top: 2, bottom: 2 };
        annotations.push({
            type: 'label',
            drawTime: 'beforeDatasetsDraw',
            xValue: from,
            yValue: (context: any) => context.chart.scales['y']?.max,
            position: 'center',
            rotation: -90,
            xAdjust: -(font.size + padding.top + padding.bottom + 2) / 2,
            yAdjust: (context: any) => labelLength(context.chart, label, font) / 2 + padding.left + 7,
            content: label,
            color: '#fff',
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1,
            borderRadius: 2,
            padding,
            font,
        } as AnnotationOptions);
    }
    return annotations;
}

/** The dashed vertical line at the hovered x value. */
export const crosshairPlugin: Plugin = {
    id: 'senergyCrosshair',
    afterDatasetsDraw(chart: Chart) {
        const active = chart.tooltip?.getActiveElements() || [];
        if (active.length === 0) {
            return;
        }
        const x = active[0].element.x;
        const ctx = chart.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = themeColor('--mat-sys-outline-variant', '#b6b6b6');
        ctx.moveTo(x, chart.chartArea.top);
        ctx.lineTo(x, chart.chartArea.bottom);
        ctx.stroke();
        ctx.restore();
    },
};

/** Later series used to be drawn above earlier ones; chart.js draws the lowest order last. */
export function laterSeriesOnTop<T extends { order?: number }>(datasets: T[]): T[] {
    datasets.forEach((dataset, index) => (dataset.order = -index));
    return datasets;
}

function toLinear(channel: number): number {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function toSrgb(linear: number): number {
    const c = linear <= 0.0031308 ? linear * 12.92 : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

/** The hover colour of bars and points: twice as bright in linear RGB, as the former SVG hover filter drew it, at series opacity. */
export function hoverColor(color: string): string {
    try {
        const rgb = Color(color).rgb().array();
        return withOpacity(Color.rgb(rgb.slice(0, 3).map((c) => toSrgb(2 * toLinear(c)))).hex());
    } catch (_) {
        return color;
    }
}
