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

import { duration, durationAs, durationParts, durationToIsoString, subtractDuration } from './iso-duration';

// The expected values are what moment 2.30 returned for the same input.
describe('iso duration', () => {
    const parts = (input: unknown) => {
        const p = durationParts(duration(input));
        // -0 like moment, shown as 0 anywhere
        return [p.years, p.months, p.days, p.hours, p.minutes, p.seconds, p.milliseconds].map((v) => v + 0);
    };

    it('reads every ISO 8601 unit', () => {
        expect(parts('P1Y2M3DT4H5M6S')).toEqual([1, 2, 3, 4, 5, 6, 0]);
        expect(durationAs(duration('P1Y2M3DT4H5M6S'), 'seconds')).toBe(37080306);
    });

    it('carries time up into days and days into months, a month being 146097 / 4800 days', () => {
        expect(parts('PT90M')).toEqual([0, 0, 0, 1, 30, 0, 0]);
        expect(parts('PT25H')).toEqual([0, 0, 1, 1, 0, 0, 0]);
        expect(parts('P35D')).toEqual([0, 1, 4, 0, 0, 0, 0]);
        expect(parts('P1W2D')).toEqual([0, 0, 9, 0, 0, 0, 0]);
    });

    it('takes a comma as decimal separator and the d.hh:mm:ss form', () => {
        expect(parts('PT1,5H')).toEqual([0, 0, 0, 1, 30, 0, 0]);
        expect(parts('1.02:03:04.5')).toEqual([0, 0, 1, 2, 3, 4, 500]);
    });

    it('bubbles mixed signs down before carrying', () => {
        expect(parts('-P1D')).toEqual([0, 0, -1, 0, 0, 0, 0]);
        expect(parts('P-1DT2H')).toEqual([0, 0, 0, -22, 0, 0, 0]);
    });

    it('is zero for empty or unreadable text and for null', () => {
        expect(parts('')).toEqual([0, 0, 0, 0, 0, 0, 0]);
        expect(parts('abc')).toEqual([0, 0, 0, 0, 0, 0, 0]);
        expect(parts(null)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    it('reads the unit objects of the forms, ignoring unknown keys and empty fields', () => {
        expect(parts({ year: 0, month: 0, day: 1, hour: 30, minute: 0, second: 0, string: '' })).toEqual([0, 0, 2, 6, 0, 0, 0]);
        expect(parts({ years: null, months: 1, days: null, hours: 2, minutes: null, seconds: 4 })).toEqual([0, 1, 0, 2, 0, 4, 0]);
    });

    it('is invalid with a fraction above the smallest unit or a value that is no number', () => {
        for (const input of ['P1.5Y2M', { hours: 1.5, minutes: 10 }, { hours: 'x' }]) {
            const d = duration(input);
            expect(d.valid).toBeFalse();
            expect(durationAs(d, 'seconds')).toBeNaN();
            expect(durationParts(d).hours).toBeNaN();
            expect(durationToIsoString(d)).toBe('Invalid date');
        }
    });

    it('takes a number as milliseconds or as the given unit', () => {
        expect(durationAs(duration(45000), 'seconds')).toBe(45);
        expect(durationAs(duration(90, 'minutes'), 'hours')).toBe(1.5);
    });

    it('writes ISO 8601 with time carried up to hours and days left as they are', () => {
        expect(durationToIsoString(duration('PT90M'))).toBe('PT1H30M');
        expect(durationToIsoString(duration('P1W2D'))).toBe('P9D');
        expect(durationToIsoString(duration({ day: 1, hour: 30 }))).toBe('P1DT30H');
        expect(durationToIsoString(duration({ months: 1, hours: 2, seconds: 4 }))).toBe('P1MT2H4S');
        expect(durationToIsoString(duration({ months: 14 }))).toBe('P1Y2M');
        expect(durationToIsoString(duration('PT0.5S'))).toBe('PT0.5S');
        expect(durationToIsoString(duration('1.02:03:04.5'))).toBe('P1DT2H3M4.5S');
    });

    it('writes P0D for nothing and signs every part that disagrees with the total', () => {
        expect(durationToIsoString(duration({}))).toBe('P0D');
        expect(durationToIsoString(duration('-P1D'))).toBe('-P1D');
        expect(durationToIsoString(duration('P-1DT2H'))).toBe('-P1DT-2H');
    });
});

describe('subtractDuration', () => {
    // local wall-clock times across the switch to summer time on 2026-03-29
    const base = new Date(2026, 2, 31, 10, 0);

    it('moves months and days on the calendar, keeping the time of day', () => {
        expect(subtractDuration(base, 1, 'months')).toEqual(new Date(2026, 1, 28, 10, 0));
        expect(subtractDuration(base, '3', 'w')).toEqual(new Date(2026, 2, 10, 10, 0));
        expect(subtractDuration(base, 1, 'y')).toEqual(new Date(2025, 2, 31, 10, 0));
    });

    it('rounds fractional days and moves time exactly', () => {
        expect(subtractDuration(base, 1.5, 'd')).toEqual(new Date(2026, 2, 29, 10, 0));
        expect(subtractDuration(base, 2, 'h')).toEqual(new Date(2026, 2, 31, 8, 0));
    });

    it('leaves the date for a unit it does not know', () => {
        expect(subtractDuration(base, 5, 'x')).toEqual(base);
        expect(subtractDuration(base, 5, '')).toEqual(base);
    });
});
