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

import {
    addDays, addHours, addMinutes, addMonths, addSeconds, addYears, format, startOfDay, startOfHour, startOfMinute, startOfMonth, startOfSecond,
    startOfYear,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { themeColor, themeColorMix } from './theme-color';

/*
 * The look of the charts that used to be drawn by Google Charts (loader version 50, language de), measured from the
 * SVG it drew: fonts, colours, the chart area, the choice and format of axis ticks.
 */

export const googleFont = 'Arial';
/** Axis chrome follows the theme; the colours Google drew are the fallback. */
export const googleValueLabelColor = () => themeColor('--mat-sys-on-surface-variant', '#444444');
export const googleCategoryLabelColor = () => themeColor('--mat-sys-on-surface', '#222222');
export const googleTitleColor = () => themeColor('--mat-sys-on-surface', '#222222');
export const googleMajorGridColor = () => themeColorMix('--mat-sys-on-surface', 20, '#cccccc');
export const googleMinorGridColor = () => themeColorMix('--mat-sys-on-surface', 8, '#ebebeb');
export const googleBaselineColor = () => themeColor('--mat-sys-on-surface-variant', '#333333');

/** Google's default series colours. */
export const googlePalette = [
    '#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00', '#b82e2e', '#316395', '#994499', '#22aa99',
    '#aaaa11', '#6633cc', '#e67300', '#8b0707', '#651067', '#329262', '#5574a6', '#3b3eac', '#b77322', '#16d620', '#b91383', '#f4359e',
    '#9c5935', '#a9c413', '#2a778d', '#668d1c', '#bea413', '#0c5922', '#743411',
];

/** The automatic font size, which grew with width plus height of the chart (thresholds probed in steps of 50px). */
export function googleFontSize(width: number, height: number): number {
    const sum = width + height;
    return [425, 575, 775, 975, 1225, 1525, 1875, 2275].reduce((size, threshold) => (sum >= threshold ? size + 1 : size), 9);
}

/** Space between the value labels and the chart area when the labels leave room for it. */
export function googleLabelGap(fontSize: number): number {
    const table: [number, number][] = [[9, 6], [11, 9], [12, 11.5], [14, 14], [16, 16]];
    if (fontSize <= table[0][0]) {
        return table[0][1];
    }
    for (let i = 1; i < table.length; i++) {
        const [s1, g1] = table[i];
        const [s0, g0] = table[i - 1];
        if (fontSize <= s1) {
            return g0 + ((fontSize - s0) * (g1 - g0)) / (s1 - s0);
        }
    }
    return fontSize;
}

export interface GoogleArea {
    left: number;
    top: number;
    width: number;
    height: number;
}

function areaSize(spec: string | number | undefined, total: number, fallback: number): number {
    if (typeof spec === 'number') {
        return spec;
    }
    if (typeof spec === 'string' && spec.trim().endsWith('%')) {
        const percent = parseFloat(spec);
        if (Number.isFinite(percent)) {
            return Math.round((total * percent) / 100);
        }
    }
    return Math.round(total * fallback);
}

/** The plot area: the given size (a share like '80%' or px) centred in the chart; without one two thirds wide and 61.8% high. */
export function googlePlotArea(width: number, height: number, areaWidth?: string | number, areaHeight?: string | number): GoogleArea {
    const w = Math.max(0, Math.min(width, areaSize(areaWidth, width, 2 / 3)));
    const h = Math.max(0, Math.min(height, areaSize(areaHeight, height, 0.618)));
    return { left: Math.round((width - w) / 2), top: Math.round((height - h) / 2), width: w, height: h };
}

export interface ValueTicks {
    min: number;
    max: number;
    /** gridlines with a label */
    major: number[];
    /** unlabelled gridlines halfway between, for steps 1, 2 and 5 */
    minor: number[];
    /** decimal places of the step, used by the labels */
    decimals: number;
    intervals: number;
}

export interface ValueTickOptions {
    /** 'pretty' widens to whole steps, 'maximized' keeps the data range */
    mode?: 'pretty' | 'maximized';
    /** a fixed bound (viewWindow) */
    min?: number;
    max?: number;
    /** the number of intervals of the primary axis, for a secondary axis whose gridlines must coincide */
    intervals?: number;
    /** smallest distance between two gridlines in px */
    minSpacing?: number;
}

const mantissas = [1, 2, 2.5, 5];

/** mantissa * 10^exponent * index without the rounding error of repeated float steps. */
function stepValue(index: number, mantissa: number, exponent: number): number {
    const v = index * mantissa;
    return exponent >= 0 ? v * Math.pow(10, exponent) : v / Math.pow(10, -exponent);
}

/**
 * The value axis as Google chose it: the smallest step of 1, 2, 2.5 or 5 times a power of ten whose gridlines stay at
 * least 40px apart; in pretty mode the bounds are widened to whole steps, and 0 is included when the data starts below
 * half its maximum (or, for negative data, ends below half its minimum). A flat range is widened by 1 to either side.
 */
export function googleValueTicks(dataMin: number, dataMax: number, length: number, options: ValueTickOptions = {}): ValueTicks {
    const mode = options.mode || 'pretty';
    const minSpacing = options.minSpacing || 40;
    let lo = Number.isFinite(dataMin) ? dataMin : 0;
    let hi = Number.isFinite(dataMax) ? dataMax : lo;
    if (options.min !== undefined) {
        lo = options.min;
        hi = Math.max(hi, lo);
    }
    if (options.max !== undefined) {
        hi = options.max;
        lo = Math.min(lo, hi);
    }
    if (hi === lo) {
        lo -= 1;
        hi += 1;
    } else if (mode === 'pretty' && options.min === undefined && options.max === undefined && options.intervals === undefined) {
        if (lo > 0 && lo < hi / 2) {
            lo = 0;
        } else if (hi < 0 && hi < lo / 2) {
            hi = 0;
        }
    }
    const range = hi - lo;
    const startExponent = Math.floor(Math.log10(range)) - 3;
    for (let exponent = startExponent; exponent < startExponent + 12; exponent++) {
        for (const mantissa of mantissas) {
            const step = stepValue(1, mantissa, exponent);
            // a tolerance keeps values that are whole steps up to float noise from moving a step outwards
            const first = Math.floor(lo / step + 1e-9);
            let last = Math.ceil(hi / step - 1e-9);
            if (options.intervals !== undefined) {
                if (first + options.intervals < last) {
                    continue;
                }
                last = first + options.intervals;
            }
            const intervals = mode === 'maximized' && options.intervals === undefined ? range / step : last - first;
            if (intervals <= 0 || length / intervals < minSpacing) {
                continue;
            }
            const fixedLo = options.min !== undefined || mode === 'maximized';
            const fixedHi = options.max !== undefined || mode === 'maximized';
            const min = fixedLo ? lo : stepValue(first, mantissa, exponent);
            const max = fixedHi ? hi : stepValue(last, mantissa, exponent);
            const major: number[] = [];
            const minor: number[] = [];
            const halves = mantissa !== 2.5;
            for (let i = Math.ceil(min / step - 1e-9); stepValue(i, mantissa, exponent) <= max + step * 1e-9; i++) {
                major.push(stepValue(i, mantissa, exponent));
                const half = stepValue(2 * i + 1, mantissa, exponent) / 2;
                if (halves && half < max) {
                    minor.push(half);
                }
            }
            if (halves && min < major[0] - step / 2 + step * 1e-9) {
                minor.unshift(major[0] - step / 2);
            }
            const decimals = Math.max(0, -exponent + (mantissa === 2.5 ? 1 : 0));
            return { min, max, major, minor: minor.filter((m) => m >= min && m <= max), decimals, intervals: Math.round(intervals) };
        }
    }
    return { min: lo, max: hi, major: [lo, hi], minor: [], decimals: 0, intervals: 1 };
}

function fixed(value: number, decimals: number, grouping: boolean): string {
    const text = new Intl.NumberFormat('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouping }).format(value);
    // -0 and values rounding to 0 are shown as 0
    return /^-0(,0*)?$/.test(text) ? text.slice(1) : text;
}

/** An axis label: German digits with the step's decimal places, e.g. "2.000" or "2,5". */
export function googleAxisNumber(value: number, decimals: number): string {
    return fixed(value, decimals, true);
}

/** Google's 'decimal' format (#,##0.###), also its default for values in tooltips: "3.200", "21,5". */
export function googleDecimal(value: number): string {
    const text = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(value);
    return text === '-0' ? '0' : text;
}

/** The pattern '#.## %': the share as percent with up to two decimals and no grouping, e.g. "12,5 %". */
export function googlePercent(value: number): string {
    const text = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, useGrouping: false }).format(value * 100);
    return (text === '-0' ? '0' : text) + ' %';
}

/** A slice share in the pie legend and tooltip, e.g. "23,1%" or "20%". */
export function googleSliceShare(share: number): string {
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(share * 100) + '%';
}

export interface DateTick {
    value: number;
    /** empty for a tick whose label did not fit */
    label: string;
    /** major gridline (darker) */
    major: boolean;
}

export type Unit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

const steps: [Unit, number][] = [
    ['second', 1], ['second', 2], ['second', 5], ['second', 10], ['second', 20], ['second', 30],
    ['minute', 1], ['minute', 2], ['minute', 5], ['minute', 10], ['minute', 15], ['minute', 30],
    ['hour', 1], ['hour', 2], ['hour', 3], ['hour', 4], ['hour', 6], ['hour', 12],
    ['day', 1], ['day', 2], ['week', 1],
    ['month', 1], ['month', 2], ['month', 3], ['month', 4], ['month', 6],
    ['year', 1], ['year', 2], ['year', 5], ['year', 10], ['year', 20], ['year', 50], ['year', 100],
];

const unitMs: Record<Unit, number> = {
    second: 1000, minute: 60000, hour: 3600000, day: 86400000, week: 7 * 86400000, month: 30.44 * 86400000, year: 365.25 * 86400000,
};

/** Every tick of the step from min to max, aligned to the local calendar: multiples of n within the next larger unit. */
function stepDates(min: number, max: number, unit: Unit, n: number): Date[] {
    const dates: Date[] = [];
    let date: Date;
    let next: (d: Date) => Date;
    let aligned: (d: Date) => boolean;
    switch (unit) {
    case 'second':
        date = startOfSecond(min); next = (d) => addSeconds(d, 1); aligned = (d) => d.getSeconds() % n === 0; break;
    case 'minute':
        date = startOfMinute(min); next = (d) => addMinutes(d, 1); aligned = (d) => d.getMinutes() % n === 0; break;
    case 'hour':
        date = startOfHour(min); next = (d) => addHours(d, 1); aligned = (d) => d.getHours() % n === 0; break;
    case 'day':
        date = startOfDay(min); next = (d) => addDays(d, 1); aligned = (d) => n === 1 || d.getDate() % n === 0; break;
    case 'week':
        // Mondays
        date = startOfDay(min); next = (d) => addDays(d, 1); aligned = (d) => d.getDay() === 1; break;
    case 'month':
        date = startOfMonth(min); next = (d) => addMonths(d, 1); aligned = (d) => d.getMonth() % n === 0; break;
    default:
        date = startOfYear(min); next = (d) => addYears(d, 1); aligned = (d) => d.getFullYear() % n === 0;
    }
    // the bound keeps a misconfigured range from building millions of dates
    for (let i = 0; date.getTime() <= max && i < 200000; i++, date = next(date)) {
        if (date.getTime() >= min && aligned(date)) {
            dates.push(date);
        }
    }
    return dates;
}

function utcOffset(date: Date): string {
    const minutes = -date.getTimezoneOffset();
    const hours = minutes / 60;
    return 'UTC' + (minutes >= 0 ? '+' : '-') + (Number.isInteger(hours) ? Math.abs(hours) : Math.abs(hours).toFixed(1).replace('.', ','));
}

/** The label lines Google showed without a format, by the unit of the ticks. */
function defaultLabel(date: Date, unit: Unit, multiDay: boolean): string[] {
    switch (unit) {
    case 'second':
        return [format(date, 'HH:mm:ss'), utcOffset(date)];
    case 'minute':
    case 'hour':
        if (multiDay && date.getHours() === 0 && date.getMinutes() === 0) {
            return [format(date, 'd. MMMM yyyy', { locale: de })];
        }
        return [format(date, 'HH:mm')];
    case 'day':
    case 'week':
        return [format(date, 'd. MMMM yyyy', { locale: de })];
    case 'month':
        return [format(date, 'MMMM yyyy', { locale: de })];
    default:
        return [format(date, 'yyyy')];
    }
}

/** The finest calendar step whose ticks stay 3 font sizes apart on an axis of the given length. */
export function googleDateStep(min: number, max: number, length: number, fontSize: number): [Unit, number] {
    const pxPerMs = length / Math.max(1, max - min);
    return steps.find(([unit, n]) => unitMs[unit] * n * pxPerMs >= 3 * fontSize) || steps[steps.length - 1];
}

/** The last tick of the step at or before value, or the first at or after it. */
export function alignToStep(value: number, step: [Unit, number], direction: 'floor' | 'ceil'): number {
    const [unit, n] = step;
    const span = unitMs[unit] * n;
    const dates = stepDates(value - 2 * span, value + 2 * span, unit, n).map((d) => d.getTime());
    if (direction === 'floor') {
        return dates.filter((t) => t <= value).pop() ?? value;
    }
    return dates.find((t) => t >= value) ?? value;
}

/**
 * The ticks of a date axis: the finest calendar step whose ticks stay 3 font sizes apart, every k-th tick labelled so
 * labels keep a gap of 3/4 font size; with a format all labels use it, without one they read as Google's (times,
 * dates at midnight when the range spans days, months, years). measure gives the width of a text in px.
 */
export function googleDateTicks(
    min: number,
    max: number,
    length: number,
    fontSize: number,
    measure: (text: string) => number,
    labelFormat?: (date: Date) => string,
): DateTick[] {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || length <= 0) {
        return [];
    }
    const pxPerMs = length / (max - min);
    const gap = 0.75 * fontSize;
    const multiDay = max - min > 1.5 * unitMs.day;
    const [unit, n] = googleDateStep(min, max, length, fontSize);
    const dates = stepDates(min, max, unit, n);
    const lines = dates.map((d) => (labelFormat !== undefined ? [labelFormat(d)] : defaultLabel(d, unit, multiDay)));
    const widths = lines.map((l) => Math.max(...l.map(measure)));
    const positions = dates.map((d) => (d.getTime() - min) * pxPerMs);
    const isDate = (i: number) => labelFormat === undefined && multiDay && (unit === 'hour' || unit === 'minute') && dates[i].getHours() === 0 && dates[i].getMinutes() === 0;
    const fits = (a: number, b: number) => positions[b] - positions[a] >= (widths[a] + widths[b]) / 2 + gap;

    const labelled = new Array(dates.length).fill(false);
    const dateIndices = dates.map((_, i) => i).filter(isDate);
    if (dateIndices.length > 0) {
        // dates at midnight are labelled first, the times between only where they leave room
        dateIndices.forEach((i) => (labelled[i] = true));
        dates.forEach((_, i) => {
            if (!labelled[i] && dateIndices.every((j) => fits(Math.min(i, j), Math.max(i, j)))) {
                const previous = labelled.lastIndexOf(true, i - 1);
                if (previous === -1 || isDate(previous) || fits(previous, i)) {
                    labelled[i] = true;
                }
            }
        });
    } else {
        let k = 1;
        while (k < dates.length && dates.some((_, i) => i + k < dates.length && i % k === 0 && !fits(i, i + k))) {
            k++;
        }
        dates.forEach((_, i) => (labelled[i] = i % k === 0));
    }
    return dates.map((d, i) => ({
        value: d.getTime(),
        label: labelled[i] ? lines[i].join('\n') : '',
        major: dateIndices.length > 0 ? isDate(i) : true,
    }));
}

/**
 * The short marks Google put along the bottom of a date axis whose ticks are several units apart: one per unit, e.g.
 * every minute between 5 minute ticks; none on axes labelling dates at midnight.
 */
export function googleDateMarks(min: number, max: number, length: number, fontSize: number, formatted: boolean): number[] {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || length <= 0) {
        return [];
    }
    const [unit, n] = googleDateStep(min, max, length, fontSize);
    const multiDay = max - min > 1.5 * unitMs.day;
    if (n === 1 || unit === 'year' || (!formatted && multiDay && (unit === 'hour' || unit === 'minute'))) {
        return [];
    }
    return stepDates(min, max, unit === 'week' ? 'day' : unit, 1).map((d) => d.getTime());
}
