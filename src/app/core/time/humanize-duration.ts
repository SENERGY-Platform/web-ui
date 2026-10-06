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

import { Duration, durationAs } from './iso-duration';

type Key = 's' | 'ss' | 'm' | 'mm' | 'h' | 'hh' | 'd' | 'dd' | 'M' | 'MM' | 'y' | 'yy';

// moment 2.30's relative time strings without suffix, %d is the number
const english: Record<Key, string> = {
    s: 'a few seconds', ss: '%d seconds', m: 'a minute', mm: '%d minutes', h: 'an hour', hh: '%d hours',
    d: 'a day', dd: '%d days', M: 'a month', MM: '%d months', y: 'a year', yy: '%d years',
};

const german: Record<Key, string> = {
    s: 'ein paar Sekunden', ss: '%d Sekunden', m: 'eine Minute', mm: '%d Minuten', h: 'eine Stunde', hh: '%d Stunden',
    d: 'ein Tag', dd: '%d Tage', M: 'ein Monat', MM: '%d Monate', y: 'ein Jahr', yy: '%d Jahre',
};

/**
 * The approximate length of a duration in words, e.g. "3 Stunden", with moment's thresholds: up to 44 seconds are
 * "a few seconds", from 45 seconds on it counts minutes, from 45 minutes hours, from 22 hours days, from 26 days
 * months and from 11 months years, each rounded. German for any "de" locale, English otherwise.
 */
export function humanizeDuration(d: Duration, locale: string): string {
    if (!d.valid) {
        return 'Invalid date';
    }
    const abs: Duration = { valid: true, milliseconds: Math.abs(d.milliseconds), days: Math.abs(d.days), months: Math.abs(d.months) };
    const seconds = Math.round(durationAs(abs, 'seconds'));
    const minutes = Math.round(durationAs(abs, 'minutes'));
    const hours = Math.round(durationAs(abs, 'hours'));
    const days = Math.round(durationAs(abs, 'days'));
    const months = Math.round(durationAs(abs, 'months'));
    const years = Math.round(durationAs(abs, 'years'));
    const [key, n]: [Key, number?] =
        seconds <= 44 ? ['s', seconds] :
        seconds < 45 ? ['ss', seconds] :
        minutes <= 1 ? ['m'] :
        minutes < 45 ? ['mm', minutes] :
        hours <= 1 ? ['h'] :
        hours < 22 ? ['hh', hours] :
        days <= 1 ? ['d'] :
        days < 26 ? ['dd', days] :
        months <= 1 ? ['M'] :
        months < 11 ? ['MM', months] :
        years <= 1 ? ['y'] : ['yy', years];
    const strings = locale.toLowerCase().startsWith('de') ? german : english;
    return strings[key].replace(/%d/i, String(n || 1));
}
