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

import { ChartDataset } from 'chart.js';
import { AnnotationOptions } from 'chartjs-plugin-annotation';
import { format, Locale } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { ChartsExportVAxesModel } from './shared/charts-export-properties.model';
import { describeBucketGap, findBucketGaps } from './chartjs-bucket-gaps';

/** The locale of the time axis labels and the tooltip title; AM/PM stay English, as moment's German locale had them. */
export const chartDateLocale: Locale = { ...de, localize: { ...de.localize, dayPeriod: enUS.localize.dayPeriod } };

export enum DetailLevel {
    ms = 6,
    s = 5,
    m = 4,
    h = 3,
    d = 2,
    months = 1,
    y = 0,
    unknown = -1,
}

const timeRgx = /(\d+)(ms|s|months|m|h|d|w|y)/;

export function detailLevel(groupTime: string | null): DetailLevel {
    const rgxRes = timeRgx.exec(groupTime || '');
    if (rgxRes === null || rgxRes.length < 3) {
        return DetailLevel.unknown;
    }
    switch (rgxRes[2]) {
        case 'ms': return DetailLevel.ms;
        case 's': return DetailLevel.s;
        case 'm': return DetailLevel.m;
        case 'h': return DetailLevel.h;
        case 'd': return DetailLevel.d;
        case 'months': return DetailLevel.months;
        case 'y': return DetailLevel.y;
        default: return DetailLevel.unknown;
    }
}

export function groupTimeFromDetailLevel(level: DetailLevel): string {
    switch (level) {
        case DetailLevel.ms: return '1ms';
        case DetailLevel.s: return '1s';
        case DetailLevel.m: return '1m';
        case DetailLevel.h: return '1h';
        case DetailLevel.d: return '1d';
        case DetailLevel.months: return '1months';
        case DetailLevel.y: return '1y';
        default: return '';
    }
}

/** The stored axis format of a detail level, in Angular date pipe tokens. */
export function xAxisFormat(level: DetailLevel): string {
    switch (level) {
        case DetailLevel.ms:
            return 'ss';
        case DetailLevel.s:
            return 'ss';
        case DetailLevel.m:
            return 'mm';
        case DetailLevel.h:
            return 'HH';
        case DetailLevel.d:
            return 'dd.MM.';
        case DetailLevel.months:
            return 'MMM';
        case DetailLevel.y:
            return 'yyyy';
        default:
            return '';
    }
}

/** The format when neither a format is stored nor a group time is known, e.g. "5. Oktober 2026 10:07". */
export const fallbackDateFormat = 'd. MMMM yyyy HH:mm';

// moment tokens a stored format may carry from when the column chart formatted with moment, by their Unicode equivalent;
// the localized ones as moment's German locale expanded them
const momentTokens: Record<string, string> = {
    LLLL: 'EEEE, d. MMMM yyyy HH:mm', LLL: 'd. MMMM yyyy HH:mm', LTS: 'HH:mm:ss', LT: 'HH:mm', LL: 'd. MMMM yyyy', L: 'dd.MM.yyyy',
    llll: 'EEE, d. MMM yyyy HH:mm', lll: 'd. MMM yyyy HH:mm', ll: 'd. MMM yyyy', l: 'd.M.yyyy',
    dddd: 'EEEE', ddd: 'EEE', Do: 'do', D: 'd', Y: 'y', A: 'a', a: 'aaa',
};
const momentTokenRgx = new RegExp(Object.keys(momentTokens).join('|'), 'g');

/** A stored format in Unicode tokens: moment tokens translated outside quotes, [text] quoted as 'text'. */
function unicodeFormat(stored: string): string {
    return stored.split(/('[^']*'|\[[^\]]*\])/).map((part) => {
        if (part.startsWith('[')) {
            return "'" + part.slice(1, -1).replace(/'/g, "''") + "'";
        }
        if (part.startsWith("'")) {
            return part;
        }
        return part.replace(momentTokenRgx, (token) => momentTokens[token]);
    }).join('');
}

/**
 * The date-fns format of the column chart's time axis and tooltip title: the stored format (Unicode tokens, as in the
 * Google charts), or without one the format of the group time's unit. A format date-fns cannot use falls back.
 */
export function columnDateFormat(hAxisFormat: string | null | undefined, groupTime: string | null): string {
    let dateFormat = hAxisFormat;
    if (dateFormat === '' || dateFormat === null || dateFormat === undefined) {
        const rgxRes = timeRgx.exec(groupTime || '');
        if (rgxRes !== null) {
            const timeUnit = rgxRes[2];
            switch (timeUnit) {
                case 'y':
                    dateFormat = xAxisFormat(DetailLevel.y);
                    break;
                case 'months':
                    dateFormat = xAxisFormat(DetailLevel.months);
                    break;
                case 'w':
                case 'd':
                    dateFormat = xAxisFormat(DetailLevel.d);
                    break;
                case 'h':
                    dateFormat = xAxisFormat(DetailLevel.h);
                    break;
                case 'm':
                    dateFormat = xAxisFormat(DetailLevel.m);
                    break;
                case 's':
                    dateFormat = xAxisFormat(DetailLevel.s);
                    break;
                case 'ms':
                    dateFormat = xAxisFormat(DetailLevel.ms);
                    break;
            }
        } else {
            dateFormat = fallbackDateFormat;
        }
    }
    const unicode = unicodeFormat(dateFormat || fallbackDateFormat);
    try {
        format(0, unicode, { locale: chartDateLocale });
        return unicode;
    } catch {
        return fallbackDateFormat;
    }
}

/** A timestamp in the column chart's format and locale, as the axis labels and the tooltip title show it. */
export function chartDateLabel(ms: number, dateFormat: string): string {
    return format(ms, dateFormat, { locale: chartDateLocale });
}

/** One bar dataset per table column, on the second y axis where its axis says so; missing (null) values are left out. */
export function columnDatasets(
    dataTable: (Date | string | number | { role: string } | null)[][],
    colors: string[] | undefined,
    axes: ChartsExportVAxesModel[] | undefined,
    fallbackColor: () => string,
): { datasets: ChartDataset[]; datasetColors: string[]; minDateMs?: number; maxDateMs?: number } {
    const datasets: ChartDataset[] = new Array(dataTable[0].length - 1).fill({});
    const datasetColors: string[] = [];
    dataTable[0].slice(1).forEach((label, i) => {
        const axis = axes === undefined ? undefined : axes[i];
        datasets[i] = { data: [], label: '' + label, yAxisID: axis === undefined ? 'y' : (axis.displayOnSecondVAxis ? 'y2' : 'y') };
        if (colors !== undefined && colors.length > i) {
            datasets[i].backgroundColor = colors[i];
        } else {
            datasets[i].backgroundColor = fallbackColor();
        }
        datasetColors[i] = '' + datasets[i].backgroundColor;
    });
    let minDateMs: number | undefined;
    let maxDateMs: number | undefined;
    if (dataTable.length > 1) {
        minDateMs = (dataTable[1][0] as Date).valueOf();
    }
    dataTable.slice(1).forEach(row => row.forEach((data, i) => {
        if (i === 0) {
            maxDateMs = (data as Date).valueOf();
        } else {
            // a 0 is a measured value and keeps its bucket; only a missing value is skipped
            if (data !== null) {
                datasets[i - 1].data.push({ y: data as number, x: (row[0] as Date).valueOf() });
            }
        }
    }));
    return { datasets, datasetColors, minDateMs, maxDateMs };
}

/**
 * Shades every other period of the next coarser unit (days for hourly buckets etc.) and labels it with
 * formatLabel(start, xAxisFormat(level - 1)); nextDateMs is where a click on the last tick zooms to.
 */
export function periodAnnotations(
    minDateMs: number | undefined,
    maxDateMs: number | undefined,
    level: DetailLevel,
    formatLabel: (date: Date, format: string) => string | null,
): { annotations: AnnotationOptions[]; nextDateMs?: number } {
    const annotations: AnnotationOptions[] = [];
    const breakPoints: number[] = [];
    let nextDateMs: number | undefined;
    let d = new Date(minDateMs || 0);
    switch (level) {
        case DetailLevel.ms:
            d.setMilliseconds(0);
            while (d.valueOf() < (maxDateMs || 0)) {
                d.setSeconds(d.getSeconds() + 1);
                breakPoints.push(d.valueOf());
            }
            break;
        case DetailLevel.s:
            d.setSeconds(0, 0);
            while (d.valueOf() < (maxDateMs || 0)) {
                d.setMinutes(d.getMinutes() + 1);
                breakPoints.push(d.valueOf());
            }
            break;
        case DetailLevel.m:
            d.setMinutes(0, 0, 0);
            while (d.valueOf() < (maxDateMs || 0)) {
                d.setHours(d.getHours() + 1);
                breakPoints.push(d.valueOf());
            }
            break;
        case DetailLevel.h:
            d.setHours(0, 0, 0, 0);
            while (d.valueOf() < (maxDateMs || 0)) {
                d.setDate(d.getDate() + 1);
                breakPoints.push(d.valueOf());
            }
            break;
        case DetailLevel.d:
            d.setHours(0, 0, 0, 0);
            d.setDate(1);
            while (d.valueOf() < (maxDateMs || 0)) {
                d.setMonth(d.getMonth() + 1);
                breakPoints.push(d.valueOf());
            }
            break;
        case DetailLevel.months:
            d.setHours(0, 0, 0, 0);
            d.setDate(1);
            d.setMonth(0);
            while (d.valueOf() < (maxDateMs || 0)) {
                d.setFullYear(d.getFullYear() + 1);
                breakPoints.push(d.valueOf());
            }
            break;
    }
    if (level === DetailLevel.y) {
        d = new Date(maxDateMs || 0);
        d.setHours(0, 0, 0, 0);
        d.setDate(1);
        d.setMonth(0);
        d.setFullYear(d.getFullYear() + 1);
        nextDateMs = d.valueOf();
    } else if (breakPoints.length > 0) {
        nextDateMs = breakPoints[breakPoints.length - 1];
    }
    if (breakPoints.length > 1) {
        breakPoints.forEach((v, i) => {
            const xMin = i > 0 ? breakPoints[i - 1] : minDateMs || 0;
            annotations.push({
                type: 'box',
                xMax: v,
                xMin,
                backgroundColor: i % 2 == 0 ? 'rgba(0,0,0,0.0)' : 'rgba(0,0,0,0.05)',
                borderWidth: 0,
                label: {
                    content: formatLabel(new Date(i > 0 ? breakPoints[i - 1] : (minDateMs || 0)), xAxisFormat(level - 1)),
                    display: true,
                    position: {
                        x: v < (maxDateMs || 0) ? 'center' : `${((maxDateMs || 0) - xMin) / (v - xMin) * 50}%`,
                        // displays last label (almost) centered on remaining x axis space
                        y: 'start'
                    }
                },
            });
            annotations.push(
                {
                    type: 'line',
                    borderColor: 'rgba(0,0,0,0.5)',
                    borderWidth: 1,
                    scaleID: 'x',
                    value: v,
                }
            );
        });
    }
    return { annotations, nextDateMs };
}

/**
 * Marks each run of buckets the query returned nothing for. On a timeseries axis a missing bucket
 * takes up no space, so the marker goes on the boundary between the two buckets that surround it
 * and carries the number of buckets that were skipped there.
 */
export function gapAnnotations(times: number[], groupTime: string | null, markerColor: () => string, labelColor: string): AnnotationOptions[] {
    const gaps = findBucketGaps(times, groupTime);
    if (gaps.length === 0) {
        return [];
    }
    const color = markerColor();
    // naming every gap buries the data it is meant to qualify, so past a few only the longest is named
    const named = gaps.length <= 3 ? gaps : [gaps.reduce((longest, gap) => (gap.count > longest.count ? gap : longest), gaps[0])];
    return gaps.map(gap => ({
        type: 'line',
        scaleID: 'x',
        value: (gap.from + gap.to) / 2,
        borderColor: color,
        borderWidth: 2,
        borderDash: [3, 3],
        label: {
            content: describeBucketGap(gap, groupTime),
            display: named.includes(gap),
            position: 'start',
            // runs along the line, so the text cannot overflow the chart sideways
            rotation: 90,
            // the dashed line carries the signal; the text stays in the ink the axis labels use
            color: labelColor,
            backgroundColor: 'rgba(255,255,255,0.8)',
            font: { size: 11, weight: 'normal' },
            padding: 4,
        },
    } as AnnotationOptions));
}

/** The colour with the given opacity as rgba(); #rgb, #rrggbb and rgb()/rgba() are understood, anything else is returned as is. */
export function withOpacityPercent(color: string, opacityPercent: number): string {
    const alpha = Math.max(0, Math.min(100, opacityPercent)) / 100;
    const trimmed = color.trim();

    if (trimmed.startsWith('#')) {
        const hex = trimmed.slice(1);
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }

    const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch !== null) {
        const parts = rgbMatch[1].split(',').map(p => p.trim());
        if (parts.length >= 3) {
            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
        }
    }

    return color;
}

/** Where the zoomed line chart starts: the last 1/zoomTimeFactor of the time range of the (time-sorted) table. */
export function zoomStartTime(dataTable: any[][], zoomTimeFactor: number | undefined): Date {
    const start = (dataTable[1][0] as Date).valueOf();
    const end = (dataTable[dataTable.length - 1][0] as Date).valueOf();
    const range = end - start;
    return new Date(end - (range / (zoomTimeFactor || 2)));
}
