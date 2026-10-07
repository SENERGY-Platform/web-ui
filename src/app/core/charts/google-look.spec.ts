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
    googleAxisNumber, googlePlotArea, googleDateMarks, googleDateTicks, googleDecimal, googleFontSize, googlePercent, googleSliceShare, googleValueTicks,
} from './google-look';

// expectations measured from the SVG Google Charts (loader 50, language de) drew for the same input
describe('googleFontSize', () => {
    it('grows with width plus height as Google\'s automatic size did', () => {
        expect([[300, 150], [400, 200], [500, 250], [605, 305], [605, 200], [800, 400], [1000, 500], [1200, 600], [1163, 578]]
            .map(([w, h]) => googleFontSize(w, h))).toEqual([10, 11, 11, 12, 12, 13, 14, 15, 15]);
    });
});

describe('googlePlotArea', () => {
    it('centres the given share of the chart, rounding like Google', () => {
        expect(googlePlotArea(605, 305, '90%', '80%')).toEqual({ left: 30, top: 31, width: 545, height: 244 });
        expect(googlePlotArea(605, 305, '80%', '85%')).toEqual({ left: 61, top: 23, width: 484, height: 259 });
    });

    it('is two thirds wide and 61.8% high without a size', () => {
        expect(googlePlotArea(400, 200)).toEqual({ left: 67, top: 38, width: 267, height: 124 });
        expect(googlePlotArea(1000, 500)).toEqual({ left: 167, top: 96, width: 667, height: 309 });
    });
});

describe('googleValueTicks', () => {
    const labels = (min: number, max: number, length: number, options = {}) => {
        const ticks = googleValueTicks(min, max, length, options);
        return ticks.major.map((v) => googleAxisNumber(v, ticks.decimals)).join(' ');
    };

    it('takes the smallest step of 1, 2, 2.5 or 5 that keeps the gridlines 40px apart', () => {
        expect([128, 259, 510].map((h) => labels(0, 7, h))).toEqual(['0,0 2,5 5,0 7,5', '0 2 4 6 8', '0 1 2 3 4 5 6 7']);
        expect([128, 259, 510].map((h) => labels(18, 24, h))).toEqual(['18 20 22 24', '18 19 20 21 22 23 24',
            '18,0 18,5 19,0 19,5 20,0 20,5 21,0 21,5 22,0 22,5 23,0 23,5 24,0']);
        expect([128, 259, 510].map((h) => labels(0, 3200, h))).toEqual(['0 2.000 4.000', '0 1.000 2.000 3.000 4.000', '0 500 1.000 1.500 2.000 2.500 3.000 3.500']);
        expect([128, 259, 510].map((h) => labels(-12, 33, h))).toEqual(['-20 0 20 40', '-20 -10 0 10 20 30 40', '-15 -10 -5 0 5 10 15 20 25 30 35']);
        expect(labels(61.3, 76, 309)).toBe('60,0 62,5 65,0 67,5 70,0 72,5 75,0 77,5');
        expect(labels(1000, 1023, 259)).toBe('1.000 1.005 1.010 1.015 1.020 1.025');
        expect(labels(5, 5.4, 259)).toBe('5,0 5,1 5,2 5,3 5,4');
        expect(labels(-3, -1, 259)).toBe('-3,0 -2,5 -2,0 -1,5 -1,0');
    });

    it('includes 0 when the data starts below half its maximum, or ends below half its minimum', () => {
        expect(labels(23, 47, 259)).toBe('0 10 20 30 40 50');
        expect(labels(25, 47, 259)).toBe('25 30 35 40 45 50');
        expect(labels(0.001, 0.0047, 259)).toBe('0,000 0,001 0,002 0,003 0,004 0,005');
        expect(labels(-47, -25, 259)).toBe('-50 -40 -30 -20 -10 0');
        expect(labels(-47, -20, 259)).toBe('-50 -45 -40 -35 -30 -25 -20');
    });

    it('starts at a fixed minimum, and widens a flat range by 1 to both sides', () => {
        expect(labels(0, 0.7143, 244, { min: 0 })).toBe('0,0 0,2 0,4 0,6 0,8');
        expect(labels(0, 0, 244, { min: 0 })).toBe('-1,0 -0,5 0,0 0,5 1,0');
        expect(labels(5, 5, 244)).toBe('4,0 4,5 5,0 5,5 6,0');
    });

    it('draws minor gridlines halfway for steps of 1, 2 and 5, none for 2.5', () => {
        expect(googleValueTicks(0, 7, 259).minor).toEqual([1, 3, 5, 7]);
        expect(googleValueTicks(0, 7, 128).minor).toEqual([]);
    });

    it('aligns a secondary axis to the intervals of the first', () => {
        const first = googleValueTicks(18, 24, 259);
        const second = googleValueTicks(43, 67, 259, { intervals: first.intervals });
        expect(second.major).toEqual([40, 45, 50, 55, 60, 65, 70]);
    });

    it('keeps the data range in maximized mode', () => {
        const ticks = googleValueTicks(18.04, 67, 551, { mode: 'maximized' });
        expect([ticks.min, ticks.max]).toEqual([18.04, 67]);
        expect(ticks.major).toEqual([20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
    });
});

describe('Google number formats', () => {
    it('formats percent, decimal and slice shares in German', () => {
        expect([0, 0.2, 0.125, 0.005, 12345.678].map(googlePercent)).toEqual(['0 %', '20 %', '12,5 %', '0,5 %', '1234567,8 %']);
        expect([3200, 21.5, 47.951, -0].map(googleDecimal)).toEqual(['3.200', '21,5', '47,951', '0']);
        expect([0.231, 0.2, 0.0001].map(googleSliceShare)).toEqual(['23,1%', '20%', '0%']);
    });
});

describe('googleDateTicks', () => {
    // a fixed text width keeps the tests independent of the fonts installed
    const measure = (fontSize: number) => (text: string) => text.length * 0.5 * fontSize;
    const end = new Date(2026, 9, 5, 10, 0).getTime();
    const M = 60000;
    const H = 60 * M;
    const hhmm = (d: Date) => [d.getHours(), d.getMinutes()].map((n) => String(n).padStart(2, '0')).join(':');
    const labels = (range: number, length: number, fontSize: number, format?: (d: Date) => string) =>
        googleDateTicks(end - range, end, length, fontSize, measure(fontSize), format).filter((t) => t.label !== '').map((t) => t.label);

    it('takes the finest step whose ticks stay three font sizes apart, as Google did with a format', () => {
        expect(labels(10 * M, 402, 12, hhmm)).toEqual(['09:50', '09:51', '09:52', '09:53', '09:54', '09:55', '09:56', '09:57', '09:58', '09:59', '10:00']);
        expect(labels(35 * M, 402, 12, hhmm)).toEqual(['09:25', '09:30', '09:35', '09:40', '09:45', '09:50', '09:55', '10:00']);
        expect(labels(H, 402, 12, hhmm)).toEqual(['09:00', '09:10', '09:20', '09:30', '09:40', '09:50', '10:00']);
        expect(labels(24 * H, 402, 12, hhmm)).toEqual(['12:00', '15:00', '18:00', '21:00', '00:00', '03:00', '06:00', '09:00']);
        expect(labels(48 * H, 402, 12, hhmm).length).toBe(8);
    });

    it('labels only every k-th tick where the labels would not fit', () => {
        expect(labels(35 * M, 800, 15, hhmm)).toEqual(['09:26', '09:30', '09:34', '09:38', '09:42', '09:46', '09:50', '09:54', '09:58']);
    });

    it('puts week ticks on Mondays and month ticks on multiples of the step', () => {
        const weeks = googleDateTicks(end - 30 * 24 * H, end, 402, 12, measure(12), hhmm).map((t) => new Date(t.value));
        expect(weeks.map((d) => d.getDay())).toEqual([1, 1, 1, 1, 1]);
        const months = googleDateTicks(end - 365 * 24 * H, end, 402, 12, measure(12), hhmm).map((t) => new Date(t.value).getMonth());
        expect(months).toEqual([10, 0, 2, 4, 6, 8]);
    });

    it('labels midnight with the date and leaves out times next to it without a format', () => {
        const pvEnd = new Date(2026, 9, 6, 10).getTime();
        const ticks = googleDateTicks(pvEnd - 47 * H, pvEnd, 267, 11, measure(11));
        expect(ticks.filter((t) => t.label !== '').map((t) => t.label)).toEqual(['12:00', '5. Oktober 2026', '12:00', '6. Oktober 2026']);
        expect(ticks.filter((t) => t.major).map((t) => new Date(t.value).getHours())).toEqual([0, 0]);
    });

    it('labels times of a single day in HH:mm without a format', () => {
        expect(labels(35 * M, 667, 14)).toEqual(['09:25', '09:30', '09:35', '09:40', '09:45', '09:50', '09:55', '10:00']);
    });
});

describe('googleDateMarks', () => {
    const end = new Date(2026, 9, 5, 10, 0).getTime();
    const H = 3600000;

    it('marks every unit between ticks several units apart', () => {
        expect(googleDateMarks(end - 35 * 60000, end, 667, 14, false).length).toBe(36);
        expect(googleDateMarks(end - 24 * H, end, 402, 12, true).length).toBe(25);
    });

    it('marks nothing for ticks one unit apart, or where the dates are labelled at midnight', () => {
        expect(googleDateMarks(end - 6 * H, end, 402, 12, true)).toEqual([]);
        expect(googleDateMarks(end - 47 * H, end, 267, 11, false)).toEqual([]);
    });
});
