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

import { duration } from './iso-duration';
import { humanizeDuration } from './humanize-duration';

// The expected texts are what moment 2.30 returned with its en and de locales.
describe('humanizeDuration', () => {
    const cases: [number, string, string][] = [
        [44, 'a few seconds', 'ein paar Sekunden'],
        [45, 'a minute', 'eine Minute'],
        [89, 'a minute', 'eine Minute'],
        [90, '2 minutes', '2 Minuten'],
        [44 * 60, '44 minutes', '44 Minuten'],
        [45 * 60, 'an hour', 'eine Stunde'],
        [89 * 60, 'an hour', 'eine Stunde'],
        [90 * 60, '2 hours', '2 Stunden'],
        [21 * 3600, '21 hours', '21 Stunden'],
        [22 * 3600, 'a day', 'ein Tag'],
        [35 * 3600, 'a day', 'ein Tag'],
        [36 * 3600, '2 days', '2 Tage'],
        [25 * 86400, '25 days', '25 Tage'],
        [26 * 86400, 'a month', 'ein Monat'],
        [45 * 86400, 'a month', 'ein Monat'],
        [46 * 86400, '2 months', '2 Monate'],
        [319 * 86400, '10 months', '10 Monate'],
        [320 * 86400, 'a year', 'ein Jahr'],
        [547 * 86400, 'a year', 'ein Jahr'],
        [548 * 86400, '2 years', '2 Jahre'],
    ];

    it('uses moment\'s thresholds and English texts', () => {
        cases.forEach(([seconds, english]) => expect(humanizeDuration(duration(seconds * 1000), 'en')).withContext(seconds + ' s').toBe(english));
    });

    it('uses moment\'s German texts for any de locale', () => {
        cases.forEach(([seconds, _, german]) => expect(humanizeDuration(duration(seconds * 1000), 'de')).withContext(seconds + ' s').toBe(german));
        expect(humanizeDuration(duration('PT90M'), 'de-DE')).toBe('2 Stunden');
    });

    it('rounds the whole duration, months and days included', () => {
        expect(humanizeDuration(duration('P1Y2M3DT4H5M6S'), 'de')).toBe('ein Jahr');
        expect(humanizeDuration(duration('P1W2D'), 'en')).toBe('9 days');
        expect(humanizeDuration(duration({ day: 1, hour: 30 }), 'de')).toBe('2 Tage');
    });

    it('ignores the sign', () => {
        expect(humanizeDuration(duration('-P1D'), 'en')).toBe('a day');
    });

    it('says Invalid date for an invalid duration, in either language', () => {
        expect(humanizeDuration(duration({ hours: 1.5, minutes: 10 }), 'de')).toBe('Invalid date');
    });

    it('falls back to English for other locales', () => {
        expect(humanizeDuration(duration('PT90M'), 'en-US')).toBe('2 hours');
        expect(humanizeDuration(duration('PT90M'), 'fr')).toBe('2 hours');
    });
});
