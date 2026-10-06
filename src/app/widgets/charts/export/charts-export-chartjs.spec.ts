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

import { formatDate, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import {
    columnDatasets,
    columnDateFormat,
    DetailLevel,
    detailLevel,
    gapAnnotations,
    groupTimeFromDetailLevel,
    chartDateLabel,
    periodAnnotations,
    withOpacityPercent,
    xAxisFormat,
    zoomStartTime,
} from './charts-export-chartjs';
import { ChartsExportVAxesModel } from './shared/charts-export-properties.model';

// local wall-clock times, the labels are formatted in the zone the browser runs in
const local = (month: number, day: number, h = 0, m = 0) => new Date(2026, month - 1, day, h, m);
const deLabel = (date: Date, format: string) => formatDate(date, format, 'de');

describe('detail levels', () => {
    it('reads the unit of a group time', () => {
        expect(['1ms', '5s', '15m', '1h', '1d', '1months', '1y'].map(detailLevel)).toEqual([
            DetailLevel.ms, DetailLevel.s, DetailLevel.m, DetailLevel.h, DetailLevel.d, DetailLevel.months, DetailLevel.y,
        ]);
        expect(detailLevel('1w')).toBe(DetailLevel.unknown);
        expect(detailLevel(null)).toBe(DetailLevel.unknown);
    });

    it('turns a level back into a single-unit group time', () => {
        expect([6, 5, 4, 3, 2, 1, 0, -1].map(groupTimeFromDetailLevel)).toEqual(['1ms', '1s', '1m', '1h', '1d', '1months', '1y', '']);
    });

    it('has a stored axis format per level', () => {
        expect([6, 5, 4, 3, 2, 1, 0, -1].map(xAxisFormat)).toEqual(['ss', 'ss', 'mm', 'HH', 'dd.MM.', 'MMM', 'yyyy', '']);
    });
});

describe('column chart dates', () => {
    const at = local(10, 5, 10, 7).getTime();
    const label = (stored: string | null | undefined, groupTime: string | null) => chartDateLabel(at, columnDateFormat(stored, groupTime));

    it('derives the format from the group time when none is stored', () => {
        expect(label('', '1h')).toBe('10');
        expect(label('', '1d')).toBe('05.10.');
        expect(label('', '2w')).toBe('05.10.');
        expect(label('', '1months')).toBe('Okt.');
        expect(label('', '1y')).toBe('2026');
        expect(label('', '15m')).toBe('07');
        expect(label('', '1s')).toBe('00');
        expect(label(null, '1ms')).toBe('00');
    });

    it('shows date and time in full German without group time', () => {
        expect(label('', null)).toBe('5. Oktober 2026 10:07');
    });

    it('formats a stored format in Unicode tokens, in German', () => {
        expect(label('EEE', '1d')).toBe('Mo.');
        expect(label('E', null)).toBe('Mo.');
        expect(label('EEEE, d. MMMM', null)).toBe('Montag, 5. Oktober');
        expect(label('dd.MM. HH:mm', null)).toBe('05.10. 10:07');
    });

    // SNRGY-4848: moment read 'dd' as the weekday, so 'dd.MM.yyyy' showed "Mo.10.2026".
    it('shows the day of month for a stored dd.MM.yyyy', () => {
        expect(label('dd.MM.yyyy', null)).toBe('05.10.2026');
    });

    // SNRGY-4848: only '' and null counted as not stored, a widget without hAxisFormat ignored its group time.
    it('derives the format from the group time when the widget has no format at all', () => {
        expect(label(undefined, '1h')).toBe('10');
        expect(label(undefined, null)).toBe('5. Oktober 2026 10:07');
    });

    it('still reads formats written for moment', () => {
        expect(label('DD.MM.YYYY', null)).toBe('05.10.2026');
        expect(label('ddd, Do MMM', null)).toBe('Mo., 5. Okt.');
        expect(label('[Woche] HH:mm', null)).toBe('Woche 10:07');
    });

    it('expands moment\'s localized formats as its German locale did', () => {
        expect(label('LLLL', null)).toBe('Montag, 5. Oktober 2026 10:07');
        expect(label('LLL', null)).toBe('5. Oktober 2026 10:07');
        expect(label('LTS', null)).toBe('10:07:00');
        expect(label('LT', null)).toBe('10:07');
        expect(label('LL', null)).toBe('5. Oktober 2026');
        expect(label('[Tag] L', null)).toBe('Tag 05.10.2026');
        expect(label('llll', null)).toBe('Mo., 5. Okt. 2026 10:07');
        expect(label('lll', null)).toBe('5. Okt. 2026 10:07');
        expect(label('ll', null)).toBe('5. Okt. 2026');
        expect(label('l', null)).toBe('5.10.2026');
    });

    it('keeps moment\'s English AM/PM', () => {
        const pm = local(10, 5, 15, 7).getTime();
        expect(label('h:mm A', null)).toBe('10:07 AM');
        expect(chartDateLabel(pm, columnDateFormat('h:mm A', null))).toBe('3:07 PM');
        expect(chartDateLabel(pm, columnDateFormat('h:mm a', null))).toBe('3:07 pm');
    });

    it('falls back to the full format for one date-fns cannot use', () => {
        expect(columnDateFormat('HH:mm Uhr', null)).toBe('d. MMMM yyyy HH:mm');
        expect(label('Uhrzeit', null)).toBe('5. Oktober 2026 10:07');
    });
});

describe('columnDatasets', () => {
    const axes = [{ displayOnSecondVAxis: false }, { displayOnSecondVAxis: true }] as ChartsExportVAxesModel[];

    it('has one dataset per column with its label, axis and colour', () => {
        const table = [['time', 'Energy', 'Share'], [local(10, 5, 1), 1, 0.5], [local(10, 5, 2), 2, 0.25]];
        const result = columnDatasets(table, ['#111111', '#222222'], axes, () => 'unused');
        expect(result.datasets.map((d) => [d.label, (d as any).yAxisID, d.backgroundColor])).toEqual([
            ['Energy', 'y', '#111111'],
            ['Share', 'y2', '#222222'],
        ]);
        expect(result.datasets[0].data).toEqual([{ x: local(10, 5, 1).valueOf(), y: 1 }, { x: local(10, 5, 2).valueOf(), y: 2 }]);
        expect(result.datasetColors).toEqual(['#111111', '#222222']);
        expect(result.minDateMs).toBe(local(10, 5, 1).valueOf());
        expect(result.maxDateMs).toBe(local(10, 5, 2).valueOf());
    });

    it('keeps 0 but leaves null values out', () => {
        const table = [['time', 'a'], [local(10, 5, 1), 0], [local(10, 5, 2), null]];
        expect(columnDatasets(table, ['#111111'], undefined, () => '').datasets[0].data).toEqual([{ x: local(10, 5, 1).valueOf(), y: 0 }]);
    });

    it('takes the fallback colour only for columns without one, on the first axis without axes', () => {
        const fallback = jasmine.createSpy('fallback').and.returnValue('rgb(1, 2, 3)');
        const result = columnDatasets([['time', 'a', 'b'], [local(10, 5, 1), 1, 2]], ['#111111'], undefined, fallback);
        expect(result.datasetColors).toEqual(['#111111', 'rgb(1, 2, 3)']);
        expect(result.datasets.map((d) => (d as any).yAxisID)).toEqual(['y', 'y']);
        expect(fallback).toHaveBeenCalledTimes(1);
    });
});

describe('periodAnnotations', () => {
    beforeAll(() => registerLocaleData(localeDe, 'de'));

    const min = local(10, 4, 10).valueOf();
    const max = local(10, 6, 8).valueOf();

    it('shades every other day of hourly buckets and labels each day', () => {
        const result = periodAnnotations(min, max, DetailLevel.h, deLabel);
        const boxes = result.annotations.filter((a) => a.type === 'box') as any[];
        const lines = result.annotations.filter((a) => a.type === 'line') as any[];
        expect(boxes.map((b) => [b.xMin, b.xMax, b.backgroundColor, b.label.content])).toEqual([
            [min, local(10, 5).valueOf(), 'rgba(0,0,0,0.0)', '04.10.'],
            [local(10, 5).valueOf(), local(10, 6).valueOf(), 'rgba(0,0,0,0.05)', '05.10.'],
            [local(10, 6).valueOf(), local(10, 7).valueOf(), 'rgba(0,0,0,0.0)', '06.10.'],
        ]);
        expect(lines.map((l) => l.value)).toEqual([local(10, 5).valueOf(), local(10, 6).valueOf(), local(10, 7).valueOf()]);
        expect(result.nextDateMs).toBe(local(10, 7).valueOf());
    });

    it('centres the labels, the last one on the part of its period that holds data', () => {
        const boxes = periodAnnotations(min, max, DetailLevel.h, deLabel).annotations.filter((a) => a.type === 'box') as any[];
        expect(boxes.map((b) => b.label.position.x)).toEqual(['center', 'center', `${8 / 24 * 50}%`]);
    });

    it('labels months of daily buckets and years of monthly buckets', () => {
        const months = periodAnnotations(local(9, 10).valueOf(), local(11, 10).valueOf(), DetailLevel.d, deLabel).annotations as any[];
        expect(months.filter((a) => a.type === 'box').map((b) => b.label.content)).toEqual(['Sept.', 'Okt.', 'Nov.']);
        const years = periodAnnotations(new Date(2025, 5, 1).valueOf(), local(3, 1).valueOf(), DetailLevel.months, deLabel).annotations as any[];
        expect(years.filter((a) => a.type === 'box').map((b) => b.label.content)).toEqual(['2025', '2026']);
    });

    it('zooms the last tick of yearly buckets into the next year and shades nothing', () => {
        const result = periodAnnotations(new Date(2024, 0, 1).valueOf(), local(1, 1).valueOf(), DetailLevel.y, deLabel);
        expect(result.annotations).toEqual([]);
        expect(result.nextDateMs).toBe(new Date(2027, 0, 1).valueOf());
    });

    it('shades nothing within a single period and for an unknown group time', () => {
        const single = periodAnnotations(local(10, 5, 1).valueOf(), local(10, 5, 5).valueOf(), DetailLevel.h, deLabel);
        expect(single.annotations).toEqual([]);
        expect(single.nextDateMs).toBe(local(10, 6).valueOf());
        expect(periodAnnotations(min, max, DetailLevel.unknown, deLabel)).toEqual({ annotations: [], nextDateMs: undefined });
    });
});

describe('gapAnnotations', () => {
    const hour = 3600000;
    const t0 = local(10, 5).valueOf();

    it('puts a dashed marker in the middle of every gap, named by its length', () => {
        const markerColor = jasmine.createSpy('markerColor').and.returnValue('#ff0000');
        const result = gapAnnotations([t0, t0 + 3 * hour], '1h', markerColor, '#666') as any[];
        expect(result.length).toBe(1);
        expect(result[0].value).toBe(t0 + 1.5 * hour);
        expect(result[0].borderColor).toBe('#ff0000');
        expect(result[0].borderDash).toEqual([3, 3]);
        expect(result[0].label.content).toBe('no data for 2 hours');
        expect(result[0].label.display).toBeTrue();
        expect(result[0].label.color).toBe('#666');
    });

    it('names only the longest of more than three gaps', () => {
        const times = [t0, t0 + 2 * hour, t0 + 4 * hour, t0 + 6 * hour, t0 + 10 * hour];
        const result = gapAnnotations(times, '1h', () => '#ff0000', '#666') as any[];
        expect(result.map((a) => a.label.display)).toEqual([false, false, false, true]);
        expect(result[3].label.content).toBe('no data for 3 hours');
    });

    it('does not look up the marker colour without gaps', () => {
        const markerColor = jasmine.createSpy('markerColor');
        expect(gapAnnotations([t0, t0 + hour], '1h', markerColor, '#666')).toEqual([]);
        expect(markerColor).not.toHaveBeenCalled();
    });
});

describe('withOpacityPercent', () => {
    it('turns hex and rgb colours into rgba with the given opacity', () => {
        expect(withOpacityPercent('#4484ce', 25)).toBe('rgba(68, 132, 206, 0.25)');
        expect(withOpacityPercent('#abc', 25)).toBe('rgba(170, 187, 204, 0.25)');
        expect(withOpacityPercent(' rgb(1, 2, 3) ', 50)).toBe('rgba(1, 2, 3, 0.5)');
        expect(withOpacityPercent('rgba(1,2,3,0.9)', 25)).toBe('rgba(1, 2, 3, 0.25)');
    });

    it('clamps the opacity and leaves unknown colours alone', () => {
        expect(withOpacityPercent('#000000', 150)).toBe('rgba(0, 0, 0, 1)');
        expect(withOpacityPercent('#000000', -5)).toBe('rgba(0, 0, 0, 0)');
        expect(withOpacityPercent('red', 25)).toBe('red');
    });
});

describe('zoomStartTime', () => {
    it('starts the zoomed view at the last 1/zoomTimeFactor of the range, half without factor', () => {
        const table = [['time', 'a'], [local(10, 5, 0), 1], [local(10, 5, 4), 1], [local(10, 5, 8), 1]];
        expect(zoomStartTime(table, undefined)).toEqual(local(10, 5, 4));
        expect(zoomStartTime(table, 4)).toEqual(local(10, 5, 6));
    });
});
