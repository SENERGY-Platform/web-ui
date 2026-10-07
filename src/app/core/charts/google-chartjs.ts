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

import { ActiveElement, Chart, ChartEvent, Plugin } from 'chart.js';
import {
    DateTick, googleDateMarks, ValueTicks, googleCategoryLabelColor, googlePlotArea, GoogleArea, googleBaselineColor, googleDateTicks, googleFont, googleFontSize, googleLabelGap,
    googleMajorGridColor, googleMinorGridColor, googleTitleColor, googleValueLabelColor,
} from './google-look';
import { themeColor } from './theme-color';

/*
 * chart.js draws only the series of the former Google charts; the chart area is pinned by layout padding, and the
 * gridlines, axis labels, titles, baseline and hover rings are drawn by the plugins here the way Google drew them.
 */

export interface GoogleFrame {
    width: number;
    height: number;
    area: GoogleArea;
    fontSize: number;
}

export function googleFrame(width: number, height: number, areaWidth?: string | number, areaHeight?: string | number): GoogleFrame {
    const w = Math.max(0, Math.floor(width));
    const h = Math.max(0, Math.floor(height));
    return { width: w, height: h, area: googlePlotArea(w, h, areaWidth, areaHeight), fontSize: googleFontSize(w, h) };
}

/**
 * Layout padding that makes chart.js use the frame's chart area when all scales are hidden, half a pixel inset: Google
 * mapped the value range onto the centres of the outermost pixel rows and columns.
 */
export function googleLayout(frame: GoogleFrame) {
    const a = frame.area;
    return { padding: { left: a.left + 0.5, top: a.top + 0.5, right: frame.width - a.left - a.width + 0.5, bottom: frame.height - a.top - a.height + 0.5 } };
}

/** The chart area in whole pixels, as gridlines and labels are placed. */
export function frameArea(frame: GoogleFrame): { left: number; top: number; right: number; bottom: number } {
    const a = frame.area;
    return { left: a.left, top: a.top, right: a.left + a.width, bottom: a.top + a.height };
}

let measureContext: CanvasRenderingContext2D | null | undefined;

export function cssFont(size: number, bold = false, italic = false): string {
    return (italic ? 'italic ' : '') + (bold ? 'bold ' : '') + size + 'px ' + googleFont;
}

/** The width of a text in Arial at the size; a rough estimate where no canvas is available. */
export function textWidth(text: string, size: number, bold = false, italic = false): number {
    if (measureContext === undefined) {
        measureContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    }
    if (measureContext === null) {
        return text.length * size * 0.55;
    }
    measureContext.font = cssFont(size, bold, italic);
    return measureContext.measureText(text).width;
}

export interface AxisTick {
    value: number;
    /** '' for an unlabelled gridline; lines are separated by \n */
    label: string;
    major: boolean;
}

/** The gridlines of a value axis, the major ones labelled. */
export function valueAxisTicks(ticks: ValueTicks, label: (value: number, decimals: number) => string): AxisTick[] {
    return [
        ...ticks.minor.map((value) => ({ value, label: '', major: false })),
        ...ticks.major.map((value) => ({ value, label: label(value, ticks.decimals), major: true })),
    ];
}

export interface GoogleValueAxis {
    scaleId: string;
    side: 'left' | 'right';
    ticks: AxisTick[];
    title?: string;
    /** draws the gridlines of this axis; only one axis does, the others are aligned to it */
    gridlines?: boolean;
}

export interface GoogleXAxis {
    scaleId: string;
    /** category: labels in #222 without gridlines; date: ticks recomputed for the visible range; value: the given ticks */
    kind: 'category' | 'date' | 'value';
    ticks?: AxisTick[];
    dateFormat?: (date: Date) => string;
    title?: string;
}

export interface GoogleAxesOptions {
    frame: GoogleFrame;
    x?: GoogleXAxis;
    y: GoogleValueAxis[];
    /** the dark line at 0 of the first value axis: over the series (columns) or under them (lines) */
    baseline?: 'over' | 'under';
}

/** Whether the x labels fit below the chart area, and where label and title baselines go (measured at 12px). */
export function xAxisLayout(frame: GoogleFrame, hasTitle: boolean): { labels: boolean; labelBaseline: number; titleBaseline?: number } {
    const fs = frame.fontSize;
    const bottom = frame.area.top + frame.area.height;
    const margin = frame.height - bottom;
    if (!hasTitle) {
        return { labels: margin >= fs + 4, labelBaseline: Math.min(bottom + 1.43 * fs, frame.height - 0.32 * fs) };
    }
    if (margin >= 2.5 * fs) {
        const excess = (margin - 2.5 * fs) / 3;
        return { labels: true, labelBaseline: bottom + 1.02 * fs + excess, titleBaseline: frame.height - 0.32 * fs - excess };
    }
    return { labels: false, labelBaseline: 0, titleBaseline: (bottom + frame.height) / 2 + 0.35 * fs };
}

/** A value label as lines that fit the width: split at spaces, or cut with an ellipsis. */
export function fitLabel(label: string, available: number, size: number): string[] {
    if (textWidth(label, size) <= available) {
        return [label];
    }
    const words = label.split(' ');
    if (words.length > 1 && words.every((w) => textWidth(w, size) <= available)) {
        const lines: string[] = [];
        words.forEach((w) => {
            const last = lines.length - 1;
            if (last >= 0 && textWidth(lines[last] + ' ' + w, size) <= available) {
                lines[last] += ' ' + w;
            } else {
                lines.push(w);
            }
        });
        return lines;
    }
    let cut = label;
    while (cut.length > 1 && textWidth(cut + '…', size) > available) {
        cut = cut.slice(0, -1);
    }
    return [cut + '…'];
}

interface DrawnAxes {
    xTicks: AxisTick[];
}

function xTicksFor(chart: Chart, options: GoogleAxesOptions): AxisTick[] {
    const x = options.x;
    if (x === undefined) {
        return [];
    }
    if (x.kind !== 'date') {
        return x.ticks || [];
    }
    const scale = chart.scales[x.scaleId];
    if (scale === undefined) {
        return [];
    }
    const fs = options.frame.fontSize;
    const ticks: DateTick[] = googleDateTicks(scale.min, scale.max, options.frame.area.width, fs, (t) => textWidth(t, fs), x.dateFormat);
    return ticks;
}

function hLine(ctx: CanvasRenderingContext2D, y: number, left: number, right: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(left, Math.floor(y), right - left, 1);
}

function vLine(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), top, 1, bottom - top);
}

function drawBaseline(chart: Chart, options: GoogleAxesOptions) {
    const axis = options.y[0];
    const scale = axis === undefined ? undefined : chart.scales[axis.scaleId];
    if (scale === undefined || scale.min > 0 || scale.max < 0) {
        return;
    }
    const area = frameArea(options.frame);
    hLine(chart.ctx, scale.getPixelForValue(0), area.left, area.right, googleBaselineColor());
}

function drawText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, align: CanvasTextAlign, color: string, font: string) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
}

/**
 * The raw plugin options; chart.js would treat their functions as scriptable options and call them with its context,
 * so the plugins read the options object as given instead of the resolved one.
 */
export function rawPluginOptions<T>(chart: Chart, id: string): T | undefined {
    return ((chart.config.options as { plugins?: Record<string, unknown> } | undefined)?.plugins?.[id] as T | undefined) || undefined;
}

/** Gridlines, baseline, axis labels and titles of a former Google chart; configured by options.plugins.googleAxes. */
export const googleAxesPlugin: Plugin = {
    id: 'googleAxes',
    beforeDatasetsDraw(chart: Chart) {
        const options = rawPluginOptions<GoogleAxesOptions>(chart, 'googleAxes');
        if (options === undefined || options.frame === undefined) {
            return;
        }
        const ctx = chart.ctx;
        const area = frameArea(options.frame);
        ctx.save();
        const xTicks = xTicksFor(chart, options);
        (chart as unknown as { $googleAxes: DrawnAxes }).$googleAxes = { xTicks };
        const gridAxis = options.y.find((a) => a.gridlines !== false);
        const yScale = gridAxis === undefined ? undefined : chart.scales[gridAxis.scaleId];
        if (gridAxis !== undefined && yScale !== undefined) {
            [false, true].forEach((major) => gridAxis.ticks.filter((t) => t.major === major).forEach((t) => {
                hLine(ctx, yScale.getPixelForValue(t.value), area.left, area.right, major ? googleMajorGridColor() : googleMinorGridColor());
            }));
        }
        const x = options.x;
        const xScale = x === undefined ? undefined : chart.scales[x.scaleId];
        // Google drew vertical gridlines only together with the x labels
        if (x !== undefined && x.kind !== 'category' && xScale !== undefined && xAxisLayout(options.frame, (x.title || '') !== '').labels) {
            const fs = options.frame.fontSize;
            googleDateMarks(xScale.min, xScale.max, area.right - area.left, fs, x.dateFormat !== undefined).forEach((value) => {
                const px = xScale.getPixelForValue(value);
                if (px >= area.left - 0.5 && px <= area.right + 0.5) {
                    vLine(ctx, px, area.bottom - 5, area.bottom, googleMajorGridColor());
                }
            });
            [false, true].forEach((major) => xTicks.filter((t) => t.major === major).forEach((t) => {
                const px = xScale.getPixelForValue(t.value);
                if (px >= area.left - 0.5 && px <= area.right + 0.5) {
                    vLine(ctx, px, area.top, area.bottom, major ? googleMajorGridColor() : googleMinorGridColor());
                }
            }));
        }
        if (options.baseline === 'under') {
            drawBaseline(chart, options);
        }
        ctx.restore();
    },
    afterDatasetsDraw(chart: Chart) {
        const options = rawPluginOptions<GoogleAxesOptions>(chart, 'googleAxes');
        if (options === undefined || options.frame === undefined || options.baseline !== 'over') {
            return;
        }
        chart.ctx.save();
        drawBaseline(chart, options);
        chart.ctx.restore();
    },
    afterDraw(chart: Chart) {
        const options = rawPluginOptions<GoogleAxesOptions>(chart, 'googleAxes');
        if (options === undefined || options.frame === undefined) {
            return;
        }
        const ctx = chart.ctx;
        const area = frameArea(options.frame);
        const frame = options.frame;
        const fs = frame.fontSize;
        const font = cssFont(fs);
        ctx.save();
        options.y.forEach((axis) => {
            const scale = chart.scales[axis.scaleId];
            if (scale === undefined) {
                return;
            }
            const margin = axis.side === 'left' ? area.left : frame.width - area.right;
            const labelled = axis.ticks.filter((t) => t.major && t.label !== '');
            const widest = Math.max(0, ...labelled.map((t) => textWidth(t.label, fs)));
            const gap = Math.max(2, Math.min(googleLabelGap(fs), margin - 2 - widest));
            const available = margin - 4;
            let outer = margin;
            labelled.forEach((t) => {
                const lines = fitLabel(t.label, available, fs);
                const lineHeight = fs + 4;
                const y0 = scale.getPixelForValue(t.value) + 0.35 * fs - ((lines.length - 1) * lineHeight) / 2;
                lines.forEach((line, i) => {
                    const x = axis.side === 'left' ? area.left - gap : area.right + gap;
                    drawText(ctx, line, x, y0 + i * lineHeight, axis.side === 'left' ? 'right' : 'left', googleValueLabelColor(), font);
                    outer = Math.min(outer, gap + textWidth(line, fs));
                });
                outer = Math.min(outer, margin);
            });
            if (axis.title) {
                const labelsEdge = labelled.length === 0 ? 0 : gap + Math.max(...labelled.map((t) => Math.max(...fitLabel(t.label, available, fs).map((l) => textWidth(l, fs)))));
                const free = Math.max(0, margin - labelsEdge);
                const cx = axis.side === 'left' ? free / 2 : frame.width - free / 2;
                ctx.save();
                ctx.translate(cx, (area.top + area.bottom) / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.font = cssFont(fs, false, true);
                ctx.fillStyle = googleTitleColor();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(axis.title, 0, 0);
                ctx.restore();
            }
        });
        const x = options.x;
        const xScale = x === undefined ? undefined : chart.scales[x.scaleId];
        if (x !== undefined && xScale !== undefined) {
            const layout = xAxisLayout(frame, (x.title || '') !== '');
            if (layout.labels) {
                const xTicks = (chart as unknown as { $googleAxes?: DrawnAxes }).$googleAxes?.xTicks || xTicksFor(chart, options);
                const color = x.kind === 'category' ? googleCategoryLabelColor() : googleValueLabelColor();
                xTicks.filter((t) => t.label !== '').forEach((t) => {
                    const px = xScale.getPixelForValue(t.value);
                    if (px < area.left - 0.5 || px > area.right + 0.5) {
                        return;
                    }
                    t.label.split('\n').forEach((line, i) => drawText(ctx, line, px, layout.labelBaseline + i * (fs + 4), 'center', color, font));
                });
            }
            if (x.title && layout.titleBaseline !== undefined) {
                drawText(ctx, x.title, (area.left + area.right) / 2, layout.titleBaseline, 'center', googleTitleColor(), cssFont(fs, false, true));
            }
        }
        ctx.restore();
    },
};

/** The selected elements of a chart, toggled by clicks as Google's selection was. */
export function googleSelection(chart: Chart): ActiveElement[] {
    return (chart as unknown as { $googleSelection?: ActiveElement[] }).$googleSelection || [];
}

function drawRings(chart: Chart, element: ActiveElement) {
    const ctx = chart.ctx;
    const el = element.element as unknown as { x: number; y: number; base?: number; width?: number; height?: number; options: Record<string, any> };
    const type = (chart.config as { type?: string }).type;
    const dataset = chart.data.datasets[element.datasetIndex] as { type?: string; borderColor?: unknown; backgroundColor?: unknown };
    const kind = dataset.type || type;
    ctx.save();
    if (kind === 'bar') {
        const left = el.x - (el.width || 0) / 2;
        const top = Math.min(el.y, el.base ?? el.y);
        const height = Math.abs((el.base ?? el.y) - el.y);
        // the outline is open on the side of the baseline
        const baseDown = (el.base ?? el.y) >= el.y;
        const near = Math.round(top);
        const far = Math.round(top) + Math.round(height);
        [[1, 0.3], [2, 0.15], [3, 0.05]].forEach(([grow, opacity]) => {
            const x0 = Math.round(left) - grow + 0.5;
            const x1 = x0 + Math.round(el.width || 0) + 2 * grow - 1;
            const end = baseDown ? near - grow + 0.5 : far + grow - 0.5;
            ctx.strokeStyle = 'rgba(0,0,0,' + opacity + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x0, baseDown ? far : near);
            ctx.lineTo(x0, end);
            ctx.lineTo(x1, end);
            ctx.lineTo(x1, baseDown ? far : near);
            ctx.stroke();
        });
    } else if (kind === 'line' || kind === 'scatter') {
        const radius = Math.max(4, Number(el.options['radius']) || 0);
        ctx.fillStyle = String(el.options['backgroundColor'] || el.options['borderColor']);
        ctx.beginPath();
        ctx.arc(el.x, el.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        [[0.5, 0.25], [1.5, 0.1], [2.5, 0.05]].forEach(([grow, opacity]) => {
            ctx.strokeStyle = 'rgba(0,0,0,' + opacity + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(el.x, el.y, radius + grow, 0, 2 * Math.PI);
            ctx.stroke();
        });
    }
    ctx.restore();
}

/** Rings around the hovered and selected points and bars, drawn over the series as Google drew its focus. */
export const googleFocusPlugin: Plugin = {
    id: 'googleFocus',
    // every update (new data or options, resize) replaces the elements the selection points to; Google's draw() cleared it as well
    beforeUpdate(chart: Chart) {
        (chart as unknown as { $googleSelection?: ActiveElement[] }).$googleSelection = [];
    },
    afterEvent(chart: Chart, args: { event: ChartEvent; changed?: boolean }) {
        if (args.event.type !== 'click') {
            return;
        }
        const hit = chart.getElementsAtEventForMode(args.event as unknown as Event, 'nearest', { intersect: true }, false);
        const holder = chart as unknown as { $googleSelection?: ActiveElement[] };
        const current = holder.$googleSelection || [];
        const same = hit.length > 0 && current.length > 0 && current[0].datasetIndex === hit[0].datasetIndex && current[0].index === hit[0].index;
        holder.$googleSelection = hit.length === 0 || same ? [] : [hit[0]];
        args.changed = true;
    },
    afterDatasetsDraw(chart: Chart) {
        const area = chart.chartArea;
        chart.ctx.save();
        chart.ctx.beginPath();
        chart.ctx.rect(area.left - 4, area.top - 4, area.right - area.left + 8, area.bottom - area.top + 8);
        chart.ctx.clip();
        // Google focused a single datum, except where hovering means a time (index mode)
        const active = chart.getActiveElements();
        const index = (chart.options.interaction as { mode?: string } | undefined)?.mode === 'index';
        [...googleSelection(chart), ...(index ? active : active.slice(0, 1))].forEach((e) => drawRings(chart, e));
        chart.ctx.restore();
    },
};

/**
 * Smooths the lines of datasets with googleCurve set the way Google's curveType 'function' did: Catmull-Rom control
 * points a sixth of the neighbour distance away, the end points their own control points.
 */
export const googleCurvePlugin: Plugin = {
    id: 'googleCurve',
    beforeDatasetDraw(chart: Chart, args: { index: number }) {
        const dataset = chart.data.datasets[args.index] as { googleCurve?: boolean };
        if (dataset.googleCurve !== true) {
            return;
        }
        const meta = chart.getDatasetMeta(args.index);
        const points = (meta.data as unknown as { x: number; y: number; skip?: boolean; cp1x: number; cp1y: number; cp2x: number; cp2y: number }[])
            .filter((p) => !p.skip);
        points.forEach((p, i) => {
            const prev = points[Math.max(0, i - 1)];
            const next = points[Math.min(points.length - 1, i + 1)];
            p.cp1x = p.x - (next.x - prev.x) / 6;
            p.cp1y = p.y - (next.y - prev.y) / 6;
            p.cp2x = p.x + (next.x - prev.x) / 6;
            p.cp2y = p.y + (next.y - prev.y) / 6;
        });
        const line = meta.dataset as unknown as { _pointsUpdated?: boolean } | undefined;
        if (line !== undefined) {
            // the control points above are final; chart.js would otherwise recompute its own before drawing
            line._pointsUpdated = true;
        }
    },
};

export interface GoogleBarLabelOptions {
    fontSize: number;
    /** per bar of the first dataset; '' for none */
    labels: string[];
}

/** The colour of a label above a bar: the bar colour at 70% brightness, as Google's annotations had it. */
export function darkened(color: string): string {
    const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
    if (match === null) {
        return color;
    }
    const value = parseInt(match[1], 16);
    return '#' + [16, 8, 0].map((shift) => Math.round(((value >> shift) & 255) * 0.7).toString(16).padStart(2, '0')).join('');
}

/**
 * The value labels of Google's column annotations: white inside the top of a bar tall enough for them, otherwise
 * above it on a 12px grey stem in the darkened bar colour with a white halo; configured by options.plugins.googleBarLabels.
 */
export const googleBarLabelsPlugin: Plugin = {
    id: 'googleBarLabels',
    afterDatasetsDraw(chart: Chart) {
        const options = rawPluginOptions<GoogleBarLabelOptions>(chart, 'googleBarLabels');
        const meta = chart.getDatasetMeta(0);
        if (options === undefined || meta === undefined) {
            return;
        }
        const ctx = chart.ctx;
        const fs = options.fontSize;
        ctx.save();
        ctx.font = cssFont(fs);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        meta.data.forEach((element, i) => {
            const label = options.labels[i];
            const bar = element as unknown as { x: number; y: number; base: number; width: number; options: { backgroundColor: string } };
            if (!label || !Number.isFinite(bar.y)) {
                return;
            }
            const top = Math.round(Math.min(bar.y, bar.base));
            const height = Math.abs(bar.base - bar.y);
            const x = Math.round(bar.x);
            if (height >= fs + 4 && textWidth(label, fs) <= bar.width) {
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, x, top + fs + 0.2);
                return;
            }
            ctx.fillStyle = themeColor('--mat-sys-outline', '#999999');
            ctx.fillRect(x, top - 12, 1, 12);
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.strokeStyle = themeColor('--mat-sys-surface', '#ffffff');
            ctx.strokeText(label, x, top - 13.8);
            ctx.fillStyle = darkened(String(bar.options.backgroundColor));
            ctx.fillText(label, x, top - 13.8);
        });
        ctx.restore();
    },
};

export const googlePlugins: Plugin[] = [googleAxesPlugin, googleFocusPlugin, googleCurvePlugin, googleBarLabelsPlugin];
