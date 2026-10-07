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

import { ActiveElement, Chart, ChartData, ChartEvent, ChartOptions, Plugin } from 'chart.js';
import { format } from 'date-fns';
import { cssFont, rawPluginOptions, textWidth } from 'src/app/core/charts/google-chartjs';
import {
    googleAxisNumber, googleFontSize, googleMajorGridColor, googleMinorGridColor, googleValueLabelColor, googleValueTicks, ValueTicks, Unit,
} from 'src/app/core/charts/google-look';
import { GoogleSeries } from 'src/app/core/charts/google-lines';
import { withOpacity } from 'src/app/core/charts/chart-look';
import { addDays, addHours, addMinutes, addMonths, addSeconds, addYears, startOfDay, startOfHour, startOfMinute, startOfMonth, startOfSecond, startOfYear } from 'date-fns';

/*
 * The zoomed line chart of a charts export widget looked like Google's AnnotationChart: legend row on top, one value
 * axis for all series labelled inside on the right, two-level time labels, and a range navigator below.
 */

export const legendHeight = 25;
export const navigatorHeight = 40;
/** the legend's date of the hovered values, dateFormat of the former chart */
export const legendDateFormat = 'dd.MM.yyyy HH:mm:ss';
const axisFontSize = 9;

export interface AnnotationLayout {
    /** inner size of the bordered box */
    width: number;
    height: number;
    chartHeight: number;
    /** the plot area of the main chart, relative to its canvas */
    area: { left: number; top: number; right: number; bottom: number };
    /** the plot area of the navigator, relative to its canvas */
    navigator: { left: number; right: number };
}

/** The parts of a box of the given outer size with a 1px border: legend 25px, navigator 40px, the main chart the rest. */
export function annotationLayout(outerWidth: number, outerHeight: number): AnnotationLayout {
    const width = Math.max(0, Math.floor(outerWidth) - 2);
    const height = Math.max(0, Math.floor(outerHeight) - 2);
    const chartHeight = Math.max(0, height - legendHeight - navigatorHeight);
    return {
        width, height, chartHeight,
        area: { left: 7, top: 7, right: width - 7, bottom: chartHeight - 20 },
        navigator: { left: 8, right: width - 9 },
    };
}

export interface LegendEntry {
    label: string;
    color: string;
    /** ': value' while hovering */
    value?: string;
}

/** The legend: every series in its colour, while hovering with its exact value at the hovered time, and that time. */
export function annotationLegend(series: GoogleSeries[], hovered?: number): { entries: LegendEntry[]; date?: string } {
    if (hovered === undefined) {
        return { entries: series.map((s) => ({ label: s.label, color: s.color })) };
    }
    return {
        entries: series.map((s) => {
            const point = s.points.find((p) => p.x === hovered);
            return { label: s.label, color: s.color, value: point === undefined || point.y === null ? '' : String(point.y) };
        }),
        date: format(hovered, legendDateFormat),
    };
}

/** The index of the point nearest in time; the points are in time order. */
function nearestIndex(points: { x: number }[], time: number): number {
    let low = 0;
    let high = points.length - 1;
    while (low < high) {
        const mid = (low + high) >> 1;
        if (points[mid].x < time) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low > 0 && Math.abs(points[low - 1].x - time) <= Math.abs(points[low].x - time) ? low - 1 : low;
}

/** The time of the point nearest to the given time over all series: the row Google's AnnotationChart showed. */
export function nearestTime(series: GoogleSeries[], time: number): number | undefined {
    let best: number | undefined;
    series.forEach((s) => {
        if (s.points.length > 0) {
            const x = s.points[nearestIndex(s.points, time)].x;
            if (best === undefined || Math.abs(x - time) < Math.abs(best - time)) {
                best = x;
            }
        }
    });
    return best;
}

/** The points of every series at exactly the given time; a series without a value then has none. */
export function pointsAt(series: GoogleSeries[], x: number): { datasetIndex: number; index: number }[] {
    return series.flatMap((s, datasetIndex) => {
        const index = s.points.length === 0 ? -1 : nearestIndex(s.points, x);
        return index >= 0 && s.points[index].x === x ? [{ datasetIndex, index }] : [];
    });
}

/** The full time range of the data and the initial window: from zoomStart (inside the range) to the end. */
export function annotationRange(series: GoogleSeries[], zoomStart?: number): { min: number; max: number; from: number; to: number } {
    const xs = series.flatMap((s) => s.points.map((p) => p.x)).filter((x) => Number.isFinite(x));
    const min = xs.length === 0 ? 0 : Math.min(...xs);
    const max = xs.length === 0 ? 1 : Math.max(...xs);
    const from = zoomStart === undefined || !Number.isFinite(zoomStart) ? min : Math.min(max, Math.max(min, zoomStart));
    return { min, max: max === min ? min + 1 : max, from, to: max === min ? min + 1 : max };
}

/** The value axis over all data, kept when the window moves; labels every major step, gridlines at half steps. */
export function annotationValueTicks(series: GoogleSeries[], layout: AnnotationLayout): ValueTicks {
    const values = series.flatMap((s) => s.points.map((p) => p.y)).filter((v): v is number => v !== null && Number.isFinite(v));
    return googleValueTicks(Math.min(...values), Math.max(...values), layout.area.bottom - layout.area.top, { mode: 'maximized' });
}

export interface TimeLevelTick {
    value: number;
    major: boolean;
    label: string;
}

const units: { unit: Unit; ms: number; steps: number[] }[] = [
    { unit: 'second', ms: 1000, steps: [1, 5, 10, 15, 30] },
    { unit: 'minute', ms: 60000, steps: [1, 5, 10, 15, 30] },
    { unit: 'hour', ms: 3600000, steps: [1, 2, 3, 6, 12] },
    { unit: 'day', ms: 86400000, steps: [1, 2, 7] },
    { unit: 'month', ms: 30.44 * 86400000, steps: [1, 3, 6] },
    { unit: 'year', ms: 365.25 * 86400000, steps: [1, 2, 5, 10, 25, 50, 100] },
];

const next: Record<Unit, (d: Date, n: number) => Date> = {
    second: addSeconds, minute: addMinutes, hour: addHours, day: addDays, week: addDays, month: addMonths, year: addYears,
};
const start: Record<Unit, (d: Date) => Date> = {
    second: startOfSecond, minute: startOfMinute, hour: startOfHour, day: startOfDay, week: startOfDay, month: startOfMonth, year: startOfYear,
};
const value: Record<Unit, (d: Date) => number> = {
    second: (d) => d.getSeconds(), minute: (d) => d.getMinutes(), hour: (d) => d.getHours(), day: (d) => d.getDate() - 1, week: (d) => d.getDate() - 1,
    month: (d) => d.getMonth(), year: (d) => d.getFullYear(),
};

function majorLabel(date: Date, unit: Unit): string {
    switch (unit) {
    case 'second':
    case 'minute':
    case 'hour':
        return format(date, 'HH:mm');
    case 'day':
        return format(date, 'dd.MM.');
    case 'month':
        return format(date, 'MM.yyyy');
    default:
        return format(date, 'yyyy');
    }
}

function minorLabel(date: Date, unit: Unit): string {
    switch (unit) {
    case 'second':
        return ':' + format(date, 'ss');
    case 'minute':
        return ':' + format(date, 'mm');
    case 'hour':
        return format(date, 'HH:mm');
    case 'day':
        return format(date, 'dd.MM.');
    default:
        return format(date, 'MM.yyyy');
    }
}

/**
 * Two-level time ticks: minor ticks the finest step at least 22px apart, major ticks at every start of the next unit;
 * the main chart labels the minor ones too where they fit, the navigator only the major ones.
 */
export function annotationTimeTicks(min: number, max: number, length: number, minorLabels: boolean): TimeLevelTick[] {
    if (!(max > min) || length <= 0) {
        return [];
    }
    const pxPerMs = length / (max - min);
    let minorIndex = -1;
    let minorStep = 1;
    units.some((u, i) => u.steps.some((n) => {
        if (u.ms * n * pxPerMs >= 22) {
            minorIndex = i;
            minorStep = n;
            return true;
        }
        return false;
    }));
    if (minorIndex === -1) {
        minorIndex = units.length - 1;
        minorStep = 100;
    }
    const minor = units[minorIndex];
    const major = units[Math.min(units.length - 1, minorIndex + 1)];
    const ticks: TimeLevelTick[] = [];
    let date = start[minor.unit](new Date(min));
    for (let i = 0; date.getTime() <= max && i < 100000; i++, date = next[minor.unit](date, 1)) {
        if (date.getTime() < min || value[minor.unit](date) % minorStep !== 0) {
            continue;
        }
        const isMajor = minor.unit !== 'year' && start[major.unit](date).getTime() === date.getTime();
        ticks.push({ value: date.getTime(), major: isMajor, label: isMajor ? majorLabel(date, minor.unit) : minorLabels ? minorLabel(date, minor.unit) : '' });
    }
    return ticks;
}

interface AxesOptions {
    layout: AnnotationLayout;
    ticks: ValueTicks;
    /** navigator: no value labels, no minor time labels, horizontal gridlines off */
    navigator?: boolean;
}

function haloText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = googleValueLabelColor;
    ctx.fillText(text, x, y);
}

/** Gridlines and labels of the main chart and the navigator; configured by options.plugins.annotationAxes. */
export const annotationAxesPlugin: Plugin = {
    id: 'annotationAxes',
    beforeDatasetsDraw(chart: Chart) {
        const options = rawPluginOptions<AxesOptions>(chart, 'annotationAxes');
        const x = chart.scales['x'];
        if (options === undefined || x === undefined) {
            return;
        }
        const ctx = chart.ctx;
        const area = chart.chartArea;
        const top = options.navigator ? 0 : options.layout.area.top;
        const bottom = options.navigator ? navigatorHeight : options.layout.area.bottom;
        ctx.save();
        if (!options.navigator) {
            const y = chart.scales['y'];
            [false, true].forEach((major) => (major ? options.ticks.major : options.ticks.minor).forEach((v) => {
                ctx.fillStyle = major ? '#ececf7' : '#f7f7fc';
                ctx.fillRect(options.layout.area.left, Math.floor(y.getPixelForValue(v)), options.layout.area.right - options.layout.area.left, 1);
            }));
        }
        const ticks = annotationTimeTicks(x.min, x.max, area.right - area.left, !options.navigator);
        ticks.forEach((t) => {
            const px = Math.floor(x.getPixelForValue(t.value));
            ctx.fillStyle = googleMinorGridColor;
            ctx.fillRect(px, top, 1, bottom - top);
            if (t.major) {
                ctx.fillStyle = googleMajorGridColor;
                ctx.fillRect(px, top, 1, bottom - top);
            }
        });
        ctx.restore();
    },
    afterDraw(chart: Chart) {
        const options = rawPluginOptions<AxesOptions>(chart, 'annotationAxes');
        const x = chart.scales['x'];
        if (options === undefined || x === undefined) {
            return;
        }
        const ctx = chart.ctx;
        const area = chart.chartArea;
        ctx.save();
        ctx.font = cssFont(axisFontSize);
        ctx.textBaseline = 'alphabetic';
        const ticks = annotationTimeTicks(x.min, x.max, area.right - area.left, !options.navigator).filter((t) => t.label !== '');
        if (options.navigator) {
            ctx.strokeStyle = '#ababab';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(options.layout.navigator.left, 0, options.layout.navigator.right - options.layout.navigator.left, navigatorHeight);
            ctx.textAlign = 'right';
            // a label that would reach beyond the navigator's left edge is left out
            ticks.filter((t) => x.getPixelForValue(t.value) - 2.4 - textWidth(t.label, axisFontSize) >= options.layout.navigator.left)
                .forEach((t) => haloText(ctx, t.label, x.getPixelForValue(t.value) - 2.4, 35.65));
        } else {
            ctx.textAlign = 'center';
            // minor labels give way to the major ones and to each other, left to right
            const placed: { left: number; right: number }[] = [];
            [...ticks.filter((t) => t.major), ...ticks.filter((t) => !t.major)].forEach((t) => {
                const px = x.getPixelForValue(t.value);
                // a label running over the edge of the chart is cut with an ellipsis
                const room = 2 * Math.min(px, options.layout.width - px);
                let label = t.label;
                while (label.length > 1 && textWidth(label, axisFontSize) > room) {
                    label = label.slice(0, -2) + '…';
                }
                const half = textWidth(label, axisFontSize) / 2;
                if (placed.some((p) => px - half < p.right + 3 && px + half > p.left - 3)) {
                    return;
                }
                placed.push({ left: px - half, right: px + half });
                ctx.fillStyle = googleValueLabelColor;
                ctx.fillText(label, px, options.layout.area.bottom + 13.15);
            });
            const y = chart.scales['y'];
            const fs = googleFontSize(options.layout.width, options.layout.chartHeight);
            ctx.font = cssFont(fs);
            ctx.textAlign = 'right';
            options.ticks.major.forEach((v) => {
                const py = y.getPixelForValue(v);
                if (py - fs < options.layout.area.top - 7) {
                    return;
                }
                haloText(ctx, googleAxisNumber(v, options.ticks.decimals), options.layout.area.right - 5, py - 7.7);
            });
        }
        ctx.restore();
    },
};

interface HoverOptions {
    series: GoogleSeries[];
    onHover: (x: number | undefined) => void;
}

/**
 * The hovered time is the one of the point nearest to the pointer; the rings go to every series' point at that time.
 * Series have their own timestamps, so chart.js' index based interaction would mix up different times.
 */
export const annotationHoverPlugin: Plugin = {
    id: 'annotationHover',
    afterEvent(chart: Chart, args: { event: ChartEvent; inChartArea: boolean; changed?: boolean }) {
        const options = rawPluginOptions<HoverOptions>(chart, 'annotationHover');
        const type = args.event.type;
        if (options === undefined || !['mousemove', 'mouseout', 'touchstart', 'touchmove'].includes(type)) {
            return;
        }
        const pointer = args.event.x;
        const scale = chart.scales['x'];
        const time = type === 'mouseout' || !args.inChartArea || pointer === null ? undefined : (scale.getValueForPixel(pointer) as number);
        // points outside the shown window are not hovered
        const nearest = time === undefined ? undefined : nearestTime(options.series, time);
        const x = nearest !== undefined && nearest >= scale.min && nearest <= scale.max ? nearest : undefined;
        const active: ActiveElement[] = x === undefined ? [] : pointsAt(options.series, x).map((p) => ({ ...p, element: chart.getDatasetMeta(p.datasetIndex).data[p.index] }));
        chart.setActiveElements(active);
        args.changed = true;
        options.onHover(x);
    },
};

export interface AnnotationConfig {
    data: ChartData<'line', { x: number; y: number | null }[]>;
    options: ChartOptions<'line'>;
}

/** The main chart: all series 2px wide over the window from..to on one value axis. */
export function annotationMainConfig(series: GoogleSeries[], layout: AnnotationLayout, window: { from: number; to: number },
    onHover: (x: number | undefined) => void): AnnotationConfig {
    const ticks = annotationValueTicks(series, layout);
    return {
        data: {
            datasets: series.map((s, i) => ({
                label: s.label, data: s.points, borderColor: s.color, backgroundColor: s.color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 0,
                pointHitRadius: 0, spanGaps: true, clip: 0.5, order: -i,
            })),
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: layout.area.left + 0.5, top: layout.area.top + 0.5, right: layout.width - layout.area.right + 0.5, bottom: layout.chartHeight - layout.area.bottom + 0.5 } },
            // the hover plugin sets the active elements; index mode makes the focus plugin ring all of them
            interaction: { mode: 'index', intersect: false, axis: 'x' },
            scales: {
                x: { type: 'linear', display: false, min: window.from, max: window.to },
                y: { type: 'linear', display: false, min: ticks.min, max: ticks.max },
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                annotationAxes: { layout, ticks },
                annotationHover: { series, onHover },
            } as any,
        },
    };
}

/** The navigator: the first series as faint area over the whole range, with 9px hour labels. */
export function annotationNavigatorConfig(series: GoogleSeries[], layout: AnnotationLayout, range: { min: number; max: number }): AnnotationConfig {
    const first = series[0];
    const all = series.flatMap((s) => s.points.map((p) => p.y)).filter((v): v is number => v !== null && Number.isFinite(v));
    const top = all.length === 0 ? 1 : Math.max(...all);
    const bottom = all.length === 0 ? 0 : Math.min(0, ...all);
    return {
        data: {
            datasets: first === undefined ? [] : [{
                data: first.points, borderColor: first.color, backgroundColor: withOpacity(first.color, 0.1), borderWidth: 1, fill: 'start', pointRadius: 0,
                pointHoverRadius: 0, pointHitRadius: 0, spanGaps: true,
            }],
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            events: [],
            layout: { padding: { left: layout.navigator.left + 0.5, right: layout.width - layout.navigator.right + 0.5, top: 0, bottom: 1 } },
            scales: {
                x: { type: 'linear', display: false, min: range.min, max: range.max },
                y: { type: 'linear', display: false, min: bottom, max: top === bottom ? bottom + 1 : top },
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                annotationAxes: { layout, ticks: { min: 0, max: 1, major: [], minor: [], decimals: 0, intervals: 1 }, navigator: true },
            } as any,
        },
    };
}

/** The window after dragging a handle or the selection by dx px on a navigator of the given width, kept inside the range. */
export function dragWindow(window: { from: number; to: number }, range: { min: number; max: number }, part: 'from' | 'to' | 'both', dxPx: number, widthPx: number): { from: number; to: number } {
    const msPerPx = (range.max - range.min) / Math.max(1, widthPx);
    const dx = dxPx * msPerPx;
    // at least 1/1000 of the range stays visible
    const minSpan = (range.max - range.min) / 1000;
    if (part === 'both') {
        const span = window.to - window.from;
        const from = Math.min(range.max - span, Math.max(range.min, window.from + dx));
        return { from, to: from + span };
    }
    if (part === 'from') {
        return { from: Math.min(window.to - minSpan, Math.max(range.min, window.from + dx)), to: window.to };
    }
    return { from: window.from, to: Math.max(window.from + minSpan, Math.min(range.max, window.to + dx)) };
}
