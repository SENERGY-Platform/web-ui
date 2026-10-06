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

import { timeTickLabel, timeTicks, withoutOverlaps } from './time-ticks';

const at = (h: number, m = 0, s = 0, d = 5, month = 9, y = 2026) => new Date(y, month, d, h, m, s).getTime();
const day = (d: number, month: number, y = 2026, h = 0) => new Date(y, month, d, h).getTime();
const labels = (min: number, max: number, width = 1000) => timeTicks(min, max, width).map((t) => t.label);

describe('timeTicks', () => {
    it('ticks every full hour for a few hours, labelled with hour and minute', () => {
        const ticks = timeTicks(at(4, 15), at(10), 1000);
        expect(ticks.map((t) => t.value)).toEqual([at(5), at(6), at(7), at(8), at(9)]);
        expect(ticks.map((t) => t.label)).toEqual(['05:00', '06:00', '07:00', '08:00', '09:00']);
    });

    it('labels midnight among hours with the day', () => {
        expect(labels(at(22), at(2, 30, 0, 6))).toEqual(['22:00', '23:00', '06 Oct', '01:00', '02:00']);
    });

    it('ticks every five minutes for up to 2.4 hours, every one with seconds, full hours too', () => {
        expect(labels(at(9, 7, 30), at(9, 31))).toEqual(['09:10:00', '09:15:00', '09:20:00', '09:25:00', '09:30:00']);
        expect(labels(at(9, 50), at(10, 10))).toEqual(['09:50:00', '09:55:00', '10:00:00', '10:05:00']);
    });

    it('ticks every minute for up to a quarter hour, fewer when there are more than one per 120px', () => {
        expect(timeTicks(at(9, 7, 30), at(9, 15, 30), 1200).map((t) => t.value)).toEqual([8, 9, 10, 11, 12, 13, 14, 15].map((m) => at(9, m)));
        expect(timeTicks(at(9, 7, 30), at(9, 15, 30), 240).map((t) => t.value)).toEqual([at(9, 8), at(9, 12)]);
    });

    it('ticks every day for up to 30 days, a month start with month and year', () => {
        expect(labels(day(28, 8, 2026, 6), day(3, 9, 2026, 12))).toEqual(['29 Sep', '30 Sep', 'Oct \'26', '02 Oct', '03 Oct']);
    });

    it('ticks the 8th, 16th and 24th and every month start for 30 to 60 days', () => {
        expect(labels(day(10, 8), day(25, 9))).toEqual(['16 Sep', '24 Sep', 'Oct \'26', '08 Oct', '16 Oct', '24 Oct']);
    });

    it('ticks the 10th and 20th and every month start for 60 to 90 days', () => {
        expect(labels(day(10, 7), day(25, 9))).toEqual(['10 Aug', '20 Aug', 'Sep \'26', '10 Sep', '20 Sep', 'Oct \'26', '10 Oct', '20 Oct']);
    });

    it('ticks the 15th and every month start for 90 to 180 days', () => {
        expect(labels(day(1, 5), day(2, 8))).toEqual(['Jun \'26', '15 Jun', 'Jul \'26', '15 Jul', 'Aug \'26', '15 Aug', 'Sep \'26']);
    });

    it('ticks every month for 180 to 800 days, January with the year', () => {
        expect(labels(day(15, 10, 2025), day(15, 4, 2026))).toEqual(['Dec \'25', '2026', 'Feb \'26', 'Mar \'26', 'Apr \'26', 'May \'26']);
    });

    it('ticks January and July for up to five years', () => {
        expect(labels(day(1, 1, 2024), day(1, 1, 2027))).toEqual(['Jul \'24', '2025', 'Jul \'25', '2026', 'Jul \'26', '2027']);
    });

    it('ticks every year beyond five years', () => {
        expect(labels(day(1, 5, 2019), day(1, 5, 2026))).toEqual(['2020', '2021', '2022', '2023', '2024', '2025', '2026']);
    });

    it('has no ticks for an empty or invalid range', () => {
        expect(timeTicks(at(5), at(5), 100)).toEqual([]);
        expect(timeTicks(NaN, at(5), 100)).toEqual([]);
    });
});

describe('timeTickLabel', () => {
    it('labels a tick by the interval of the axis range', () => {
        expect(timeTickLabel(day(1, 9), day(10, 7), day(25, 9))).toBe('Oct \'26');
        expect(timeTickLabel(at(10), at(9, 50), at(10, 10))).toBe('10:00:00');
    });
});

describe('withoutOverlaps', () => {
    it('drops, left to right, every label starting within the last kept one plus 10px', () => {
        const ticks = [0, 10, 60, 70].map((value) => ({ value, label: String(value) }));
        expect(withoutOverlaps(ticks, 0, 100, 100, () => 40).map((t) => t.value)).toEqual([0, 60]);
    });
});
