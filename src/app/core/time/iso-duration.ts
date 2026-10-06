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

import { addDays, addMonths } from 'date-fns';

/*
 * Durations as moment.js 2.30 handled them, which the stored BPMN timer and deployment durations were written
 * with: ISO 8601 parsing, the carry rules between units, toISOString and humanize.
 */

/** A duration kept the way moment keeps it: time, calendar days and months apart, since they do not convert exactly. */
export interface Duration {
    valid: boolean;
    milliseconds: number;
    days: number;
    months: number;
}

/** The units of a duration after carrying over, e.g. 90 minutes are 1 hour and 30 minutes. */
export interface DurationParts {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

type Unit = 'year' | 'quarter' | 'month' | 'week' | 'isoWeek' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

const ordering: Unit[] = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];

// moment's unit aliases; names it knows that are no duration unit make an object duration invalid
const aliases: Record<string, string> = {
    D: 'date', dates: 'date', date: 'date', d: 'day', days: 'day', day: 'day', e: 'weekday', weekdays: 'weekday', weekday: 'weekday',
    E: 'isoWeekday', isoweekdays: 'isoWeekday', isoweekday: 'isoWeekday', DDD: 'dayOfYear', dayofyears: 'dayOfYear', dayofyear: 'dayOfYear',
    h: 'hour', hours: 'hour', hour: 'hour', ms: 'millisecond', milliseconds: 'millisecond', millisecond: 'millisecond',
    m: 'minute', minutes: 'minute', minute: 'minute', M: 'month', months: 'month', month: 'month', Q: 'quarter', quarters: 'quarter',
    quarter: 'quarter', s: 'second', seconds: 'second', second: 'second', gg: 'weekYear', weekyears: 'weekYear', weekyear: 'weekYear',
    GG: 'isoWeekYear', isoweekyears: 'isoWeekYear', isoweekyear: 'isoWeekYear', w: 'week', weeks: 'week', week: 'week',
    W: 'isoWeek', isoweeks: 'isoWeek', isoweek: 'isoWeek', y: 'year', years: 'year', year: 'year',
};

const aspNetRegex = /^(-|\+)?(?:(\d*)[. ])?(\d+):(\d+)(?::(\d+)(\.\d*)?)?$/;
const isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

/** The unit a name stands for, as moment reads it: exact first, then lower-cased. */
export function normalizeUnit(unit: string): string | undefined {
    return aliases[unit] || aliases[unit.toLowerCase()];
}

export function absFloor(n: number): number {
    return n < 0 ? Math.ceil(n) || 0 : Math.floor(n);
}

function absCeil(n: number): number {
    return n < 0 ? Math.floor(n) : Math.ceil(n);
}

function absRound(n: number): number {
    return n < 0 ? Math.round(-1 * n) * -1 : Math.round(n);
}

function toInt(value: any): number {
    const n = +value;
    return n !== 0 && isFinite(n) ? absFloor(n) : 0;
}

function parseIso(input: string | undefined, sign: number): number {
    const res = input ? parseFloat(input.replace(',', '.')) : NaN;
    return (isNaN(res) ? 0 : res) * sign;
}

const daysToMonths = (days: number) => (days * 4800) / 146097;
const monthsToDays = (months: number) => (months * 146097) / 4800;

function fromUnits(input: Record<string, any>): Duration {
    const units: Record<string, any> = {};
    for (const key of Object.keys(input)) {
        const unit = normalizeUnit(key);
        if (unit) {
            units[unit] = input[key];
        }
    }
    let valid = Object.keys(units).every((key) => ordering.includes(key as Unit) && (units[key] == null || !isNaN(units[key])));
    if (valid) {
        // only the smallest unit given may have a fraction
        let unitHasDecimal = false;
        for (const unit of ordering) {
            if (units[unit]) {
                if (unitHasDecimal) {
                    valid = false;
                    break;
                }
                if (parseFloat(units[unit]) !== toInt(units[unit])) {
                    unitHasDecimal = true;
                }
            }
        }
    }
    const value = (unit: string) => units[unit] || 0;
    return {
        valid,
        milliseconds: +value('millisecond') + value('second') * 1e3 + value('minute') * 6e4 + value('hour') * 1000 * 60 * 60,
        days: +value('day') + (units['week'] || units['isoWeek'] || 0) * 7,
        months: +value('month') + value('quarter') * 3 + value('year') * 12,
    };
}

/**
 * A duration from an ISO 8601 string ("P1DT2H"), a "d.hh:mm:ss" string, a number of milliseconds (or of the given
 * unit), or an object of units like { hours: 2 }. Text that is none of these is a zero duration, as with moment.
 */
export function duration(input: unknown, unit?: unknown): Duration {
    if (typeof input === 'number' || !isNaN(+(input as any))) {
        return fromUnits({ [unit ? String(unit) : 'milliseconds']: +(input as any) });
    }
    if (typeof input === 'string') {
        let match = aspNetRegex.exec(input);
        if (match !== null) {
            const sign = match[1] === '-' ? -1 : 1;
            return fromUnits({
                y: 0, d: toInt(match[2]) * sign, h: toInt(match[3]) * sign, m: toInt(match[4]) * sign, s: toInt(match[5]) * sign,
                ms: toInt(absRound((match[6] as any) * 1000)) * sign,
            });
        }
        match = isoRegex.exec(input);
        if (match !== null) {
            const sign = match[1] === '-' ? -1 : 1;
            return fromUnits({
                y: parseIso(match[2], sign), M: parseIso(match[3], sign), w: parseIso(match[4], sign), d: parseIso(match[5], sign),
                h: parseIso(match[6], sign), m: parseIso(match[7], sign), s: parseIso(match[8], sign),
            });
        }
    }
    if (input == null || typeof input !== 'object') {
        return fromUnits({});
    }
    return fromUnits(input as Record<string, any>);
}

/** Years, months, days, hours, minutes, seconds after carrying over (NaN each for an invalid duration). */
export function durationParts(d: Duration): DurationParts {
    if (!d.valid) {
        return { years: NaN, months: NaN, days: NaN, hours: NaN, minutes: NaN, seconds: NaN, milliseconds: NaN };
    }
    let milliseconds = d.milliseconds;
    let days = d.days;
    let months = d.months;
    if (!((milliseconds >= 0 && days >= 0 && months >= 0) || (milliseconds <= 0 && days <= 0 && months <= 0))) {
        // mixed signs: bubble everything down into milliseconds first
        milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
        days = 0;
        months = 0;
    }
    const parts = { milliseconds: milliseconds % 1000 } as DurationParts;
    const seconds = absFloor(milliseconds / 1000);
    parts.seconds = seconds % 60;
    const minutes = absFloor(seconds / 60);
    parts.minutes = minutes % 60;
    const hours = absFloor(minutes / 60);
    parts.hours = hours % 24;
    days += absFloor(hours / 24);
    const monthsFromDays = absFloor(daysToMonths(days));
    months += monthsFromDays;
    days -= absCeil(monthsToDays(monthsFromDays));
    parts.days = days;
    parts.years = absFloor(months / 12);
    parts.months = months % 12;
    return parts;
}

export type DurationUnit = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds';

/** The whole duration in one unit, a month counted as 146097 / 4800 days (NaN for an invalid duration). */
export function durationAs(d: Duration, unit: DurationUnit): number {
    if (!d.valid) {
        return NaN;
    }
    if (unit === 'months' || unit === 'years') {
        const months = d.months + daysToMonths(d.days + d.milliseconds / 864e5);
        return unit === 'months' ? months : months / 12;
    }
    const days = d.days + Math.round(monthsToDays(d.months));
    switch (unit) {
    case 'weeks':
        return days / 7 + d.milliseconds / 6048e5;
    case 'days':
        return days + d.milliseconds / 864e5;
    case 'hours':
        return days * 24 + d.milliseconds / 36e5;
    case 'minutes':
        return days * 1440 + d.milliseconds / 6e4;
    case 'seconds':
        return days * 86400 + d.milliseconds / 1000;
    default:
        return Math.floor(days * 864e5) + d.milliseconds;
    }
}

const sign = (x: number) => (Number(x > 0) - Number(x < 0)) || +x;

/**
 * ISO 8601, e.g. "P1Y2M3DT4H5M6.5S", "P0D" for nothing and "Invalid date" for an invalid duration. Time carries up to
 * hours and months up to years, days stay as they are.
 */
export function durationToIsoString(d: Duration): string {
    if (!d.valid) {
        return 'Invalid date';
    }
    let seconds = Math.abs(d.milliseconds) / 1000;
    const days = Math.abs(d.days);
    let months = Math.abs(d.months);
    const total = durationAs(d, 'seconds');
    if (!total) {
        return 'P0D';
    }
    let minutes = absFloor(seconds / 60);
    const hours = absFloor(minutes / 60);
    seconds %= 60;
    minutes %= 60;
    const years = absFloor(months / 12);
    months %= 12;
    const s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';
    const totalSign = total < 0 ? '-' : '';
    const ymSign = sign(d.months) !== sign(total) ? '-' : '';
    const daysSign = sign(d.days) !== sign(total) ? '-' : '';
    const hmsSign = sign(d.milliseconds) !== sign(total) ? '-' : '';
    return totalSign + 'P' +
        (years ? ymSign + years + 'Y' : '') +
        (months ? ymSign + months + 'M' : '') +
        (days ? daysSign + days + 'D' : '') +
        (hours || minutes || seconds ? 'T' : '') +
        (hours ? hmsSign + hours + 'H' : '') +
        (minutes ? hmsSign + minutes + 'M' : '') +
        (seconds ? hmsSign + s + 'S' : '');
}

/** The date amount units earlier, e.g. (now, 2, 'h'): months and days on the calendar (rounded), the rest exactly. */
export function subtractDuration(date: Date, amount: unknown, unit: unknown): Date {
    // like moment, a numeric unit means the arguments came in swapped
    const d = unit !== null && !isNaN(+(unit as any)) ? duration(unit, amount) : duration(amount, unit);
    const months = absRound(d.months);
    const days = absRound(d.days);
    let result = new Date(date);
    if (months) {
        result = addMonths(result, -months);
    }
    if (days) {
        result = addDays(result, -days);
    }
    if (d.milliseconds) {
        result = new Date(result.getTime() - d.milliseconds);
    }
    return result;
}
