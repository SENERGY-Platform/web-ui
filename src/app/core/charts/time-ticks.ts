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

import { addDays, addHours, addMinutes, addMonths, addSeconds, addYears, format, startOfDay, startOfHour, startOfMinute, startOfMonth, startOfSecond, startOfYear } from 'date-fns';

/*
 * The ticks of a time axis as the charts showed them before (ApexCharts 4.7): the interval follows from the
 * visible range, every tick is labelled by its own unit (a month start "Sep '26", midnight "05 Oct", an hour
 * "14:00"), all in local time with English names, and labels that would overlap are dropped left to right.
 */

export interface TimeTick {
    value: number;
    label: string;
}

type Interval = 'years' | 'half_year' | 'months' | 'months_fortnight' | 'months_days' | 'week_days' | 'days' | 'hours'
    | 'minutes_fives' | 'minutes' | 'seconds_tens' | 'seconds_fives' | 'seconds';

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;

export function timeInterval(range: number): Interval {
    const days = range / day;
    switch (true) {
    case days / 365 > 5: return 'years';
    case days > 800: return 'half_year';
    case days > 180: return 'months';
    case days > 90: return 'months_fortnight';
    case days > 60: return 'months_days';
    case days > 30: return 'week_days';
    case days > 2: return 'days';
    case range > 2.4 * hour: return 'hours';
    case range > 15 * minute: return 'minutes_fives';
    case range > 5 * minute: return 'minutes';
    case range > minute: return 'seconds_tens';
    case range > 20 * second: return 'seconds_fives';
    default: return 'seconds';
    }
}

/** Every date from the first whole unit at or after min up to, not including, max. */
function each(min: number, max: number, start: (d: Date) => Date, add: (d: Date, n: number) => Date): Date[] {
    const dates: Date[] = [];
    let date = start(new Date(min));
    if (date.getTime() < min) {
        date = add(date, 1);
    }
    // the bound keeps an absurd range from building millions of ticks
    while (date.getTime() < max && dates.length < 100000) {
        dates.push(date);
        date = add(date, 1);
    }
    return dates;
}

/** The label of a tick by its own unit: a year, a month, a day, an hour or a time with seconds. */
function labelFor(date: Date, interval: Interval): string {
    switch (interval) {
    case 'years':
        return format(date, 'yyyy');
    case 'half_year':
    case 'months':
        return format(date, date.getMonth() === 0 ? 'yyyy' : 'MMM \'\'yy');
    case 'months_fortnight':
    case 'months_days':
    case 'week_days':
    case 'days':
        return format(date, date.getDate() === 1 ? 'MMM \'\'yy' : 'dd MMM');
    case 'hours':
        return format(date, date.getHours() === 0 ? 'dd MMM' : 'HH:mm');
    default:
        return format(date, 'HH:mm:ss');
    }
}

/** Day ticks keeping month starts and the days whose date is a multiple of the modulo, the 30th only for every day. */
function dayDates(min: number, max: number, modulo: number): Date[] {
    return each(min, max, startOfDay, addDays).filter((d) => d.getDate() === 1 || (d.getDate() % modulo === 0 && (modulo === 1 || d.getDate() !== 30)));
}

/** Ticks of finer units, keeping every modulo-th by its unit value when there are more than one per 120px. */
function widthModulo(count: number, width: number): number {
    const allowed = Math.ceil(width / 120);
    return count > allowed ? Math.floor(count / allowed) : 1;
}

/** All ticks of the range before overlapping labels are dropped; width is the axis length in px. */
export function timeTicks(min: number, max: number, width: number): TimeTick[] {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
        return [];
    }
    const interval = timeInterval(max - min);
    let dates: Date[];
    switch (interval) {
    case 'years':
        dates = each(min, max, startOfYear, addYears);
        break;
    case 'half_year':
        dates = each(min, max, startOfMonth, addMonths).filter((d) => d.getMonth() % 6 === 0);
        break;
    case 'months':
        dates = each(min, max, startOfMonth, addMonths);
        break;
    case 'months_fortnight':
        dates = dayDates(min, max, 15);
        break;
    case 'months_days':
        dates = dayDates(min, max, 10);
        break;
    case 'week_days':
        dates = dayDates(min, max, 8);
        break;
    case 'days':
        dates = dayDates(min, max, 1);
        break;
    case 'hours':
        dates = each(min, max, startOfHour, addHours);
        break;
    case 'minutes_fives':
        dates = each(min, max, startOfMinute, addMinutes).filter((d) => d.getMinutes() % 5 === 0);
        break;
    case 'minutes': {
        const all = each(min, max, startOfMinute, addMinutes);
        const modulo = widthModulo(all.length, width);
        dates = all.filter((d) => d.getMinutes() % modulo === 0);
        break;
    }
    case 'seconds_tens':
        dates = each(min, max, startOfSecond, addSeconds).filter((d) => d.getSeconds() % 10 === 0);
        break;
    case 'seconds_fives':
        dates = each(min, max, startOfSecond, addSeconds).filter((d) => d.getSeconds() % 5 === 0);
        break;
    default: {
        const all = each(min, max, startOfSecond, addSeconds);
        const modulo = widthModulo(all.length, width);
        dates = all.filter((d) => d.getSeconds() % modulo === 0);
    }
    }
    return dates.map((d) => ({ value: d.getTime(), label: labelFor(d, interval) }));
}

/** Drops, left to right, every tick whose position is not more than the last kept label's width plus 10px beyond it. */
export function withoutOverlaps(ticks: TimeTick[], min: number, max: number, width: number, labelWidth: (label: string) => number): TimeTick[] {
    const kept: TimeTick[] = [];
    let lastPosition = 0;
    let lastWidth = 0;
    ticks.forEach((t) => {
        const position = ((t.value - min) / (max - min)) * width;
        if (kept.length === 0 || position > lastPosition + lastWidth + 10) {
            kept.push(t);
            lastPosition = position;
            lastWidth = labelWidth(t.label);
        }
    });
    return kept;
}

/** The label of a tick value on an axis from min to max. */
export function timeTickLabel(value: number, min: number, max: number): string {
    return labelFor(new Date(value), timeInterval(max - min));
}
