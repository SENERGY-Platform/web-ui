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

/** One window of the weekly plan; weekdays run 0 (Monday) to 6 (Sunday), times are local Europe/Berlin. */
export interface HeatingWindow {
    weekdays: number[];
    from: string;
    to: string;
    temperature: number;
}

export interface HeatingPlan {
    windows: HeatingWindow[];
    setback: number;
}

export interface HeatingSwitch {
    /** UTC milliseconds */
    at: number;
    temperature: number;
}

export interface HeatingSegment {
    /** minutes of the local day, 0..1440 */
    from: number;
    to: number;
    temperature: number;
}

/** A window as stored; every field is checked before it is used. */
interface RawWindow {
    weekdays?: unknown;
    from?: unknown;
    to?: unknown;
    temperature?: unknown;
}

export class HeatingPlanError extends Error {}

export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MINUTE = 60000;
const HOUR = 3600000;
const DAY = 86400000;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const TIME_PATTERN = /^([01]?[0-9]|2[0-4]):([0-5][0-9])$/;

/** Minutes of the day of an `H:MM` or `HH:MM` text, 00:00 to 24:00. */
export function minutesOf(text: unknown): number | undefined {
    const match = TIME_PATTERN.exec(String(text));
    if (match === null || (Number(match[1]) === 24 && Number(match[2]) !== 0)) {
        return undefined;
    }
    return Number(match[1]) * 60 + Number(match[2]);
}

export function timeText(minutes: number): string {
    return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
}

/** The check the smart service applies to a number given as number or text; an empty text is not a number. */
function numberOf(value: unknown): number | undefined {
    if (value === null || value === undefined || String(value).trim() === '') {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

/** A setback or zone setback as the smart service reads it. Throws HeatingPlanError. */
export function parseSetback(setback: unknown, name = 'The setback temperature'): number {
    const low = numberOf(setback);
    if (low === undefined) {
        throw new HeatingPlanError(name + ' is not a number: ' + setback);
    }
    return low;
}

/** Checks a stored list of windows with the rules of the smart service; `where` prefixes the messages. Throws HeatingPlanError. */
export function parseWindows(list: unknown, where = ''): HeatingWindow[] {
    if (!Array.isArray(list)) {
        throw new HeatingPlanError(where + 'The schedule needs a list "windows".');
    }
    return (list as RawWindow[]).map((raw, index): HeatingWindow => {
        const name = where + 'Window ' + (index + 1) + ': ';
        const given = raw?.weekdays;
        const weekdays: unknown = given === undefined || given === null || (Array.isArray(given) && given.length === 0) ? ALL_DAYS : given;
        if (!Array.isArray(weekdays)) {
            throw new HeatingPlanError(name + 'weekdays must be a list.');
        }
        for (const day of weekdays) {
            if (!ALL_DAYS.includes(day)) {
                throw new HeatingPlanError(name + 'weekday 0 (Monday) to 6 (Sunday) expected, not ' + day);
            }
        }
        const from = minutesOf(raw?.from);
        const to = minutesOf(raw?.to);
        if (from === undefined || to === undefined) {
            throw new HeatingPlanError(name + 'time hh:mm expected, not ' + (from === undefined ? raw?.from : raw?.to));
        }
        const temperature = numberOf(raw?.temperature);
        if (temperature === undefined) {
            throw new HeatingPlanError(name + 'temperature is not a number.');
        }
        return { weekdays: [...weekdays], from: timeText(from), to: timeText(to), temperature };
    });
}

/** Reads the schedule text and the setback with the same rules as the smart service. Throws HeatingPlanError. */
export function parseHeatingPlan(schedule: string, setback: unknown): HeatingPlan {
    let document: { windows?: unknown } | null;
    try {
        document = JSON.parse(schedule);
    } catch (error) {
        throw new HeatingPlanError(error instanceof Error ? error.message : 'The schedule is not valid JSON.');
    }
    if (!document || !Array.isArray(document.windows)) {
        throw new HeatingPlanError('The schedule needs a list "windows".');
    }
    const low = parseSetback(setback);
    return { windows: parseWindows(document.windows), setback: low };
}

/** The window objects with exactly the keys the smart service reads. */
export function windowsJson(windows: HeatingWindow[]): object[] {
    return windows.map((window) => ({
        weekdays: window.weekdays,
        from: window.from,
        to: window.to,
        temperature: window.temperature,
    }));
}

/** The compact JSON text with exactly the keys the smart service reads. */
export function serialiseSchedule(windows: HeatingWindow[]): string {
    return JSON.stringify({ windows: windowsJson(windows) });
}

/** Last Sunday of the month (0-based) at 01:00 UTC, the instant the EU changes the offset. */
function lastSunday(year: number, month: number): number {
    const date = new Date(Date.UTC(year, month + 1, 0, 1, 0, 0));
    return date.getTime() - date.getUTCDay() * DAY;
}

/** Offset of Europe/Berlin to UTC by the EU rule, independent of the browser time zone. */
export function berlinOffset(utcMs: number): number {
    const year = new Date(utcMs).getUTCFullYear();
    return utcMs >= lastSunday(year, 2) && utcMs < lastSunday(year, 9) ? 2 * HOUR : HOUR;
}

/** Local weekday (Monday = 0), minute of the day and day number of an instant. */
export function berlinParts(utcMs: number): { weekday: number; minute: number; day: number } {
    const local = utcMs + berlinOffset(utcMs);
    const date = new Date(local);
    return {
        weekday: (date.getUTCDay() + 6) % 7,
        minute: date.getUTCHours() * 60 + date.getUTCMinutes(),
        day: Math.floor(local / DAY),
    };
}

/** Highest temperature of the windows covering local `minute` of `weekday`, else the setback. */
function localTarget(plan: HeatingPlan, weekday: number, minute: number): number {
    const previous = (weekday + 6) % 7;
    let best: number | null = null;
    for (const window of plan.windows) {
        const from = minutesOf(window.from) as number;
        const to = minutesOf(window.to) as number;
        let on: boolean;
        if (from === to) {
            on = window.weekdays.includes(weekday);
        } else if (from < to) {
            on = window.weekdays.includes(weekday) && minute >= from && minute < to;
        } else {
            on = (window.weekdays.includes(weekday) && minute >= from) || (window.weekdays.includes(previous) && minute < to);
        }
        if (on && (best === null || window.temperature > best)) {
            best = window.temperature;
        }
    }
    return best === null ? plan.setback : best;
}

export function target(plan: HeatingPlan, utcMs: number): number {
    const parts = berlinParts(utcMs);
    return localTarget(plan, parts.weekday, parts.minute);
}

/**
 * The first instant after `nowUtcMs` with a different target within the next 8 days, or null for a constant plan.
 * Every window boundary is tried with both offsets and the target decides which one is real.
 */
export function nextSwitch(plan: HeatingPlan, nowUtcMs: number): HeatingSwitch | null {
    const current = target(plan, nowUtcMs);
    const candidates: number[] = [];
    const first = Math.floor((nowUtcMs + berlinOffset(nowUtcMs)) / DAY) * DAY;
    for (let day = 0; day <= 8; day++) {
        for (const window of plan.windows) {
            for (const bound of [minutesOf(window.from) as number, minutesOf(window.to) as number]) {
                const local = first + day * DAY + bound * MINUTE;
                candidates.push(local - HOUR, local - 2 * HOUR);
            }
        }
    }
    const year = new Date(nowUtcMs).getUTCFullYear();
    candidates.push(lastSunday(year, 2), lastSunday(year, 9), lastSunday(year + 1, 2), lastSunday(year + 1, 9));
    candidates.sort((a, b) => a - b);
    for (const candidate of candidates) {
        if (candidate > nowUtcMs && target(plan, candidate) !== current) {
            return { at: candidate, temperature: target(plan, candidate) };
        }
    }
    return null;
}

/**
 * The latest instant up to `nowUtcMs` at which the target changed, within the past 8 days, or null for a constant plan.
 * Candidates are built like in nextSwitch; one counts when the target a millisecond earlier was different.
 */
export function lastSwitch(plan: HeatingPlan, nowUtcMs: number): HeatingSwitch | null {
    const candidates: number[] = [];
    const first = Math.floor((nowUtcMs + berlinOffset(nowUtcMs)) / DAY) * DAY;
    for (let day = -8; day <= 0; day++) {
        for (const window of plan.windows) {
            for (const bound of [minutesOf(window.from) as number, minutesOf(window.to) as number]) {
                const local = first + day * DAY + bound * MINUTE;
                candidates.push(local - HOUR, local - 2 * HOUR);
            }
        }
    }
    const year = new Date(nowUtcMs).getUTCFullYear();
    candidates.push(lastSunday(year - 1, 2), lastSunday(year - 1, 9), lastSunday(year, 2), lastSunday(year, 9));
    candidates.sort((a, b) => b - a);
    for (const candidate of candidates) {
        if (candidate <= nowUtcMs && target(plan, candidate) !== target(plan, candidate - 1)) {
            return { at: candidate, temperature: target(plan, candidate) };
        }
    }
    return null;
}

/** Segments of one local weekday from 00:00 to 24:00; neighbours with the same temperature are merged. */
export function daySegments(plan: HeatingPlan, weekday: number): HeatingSegment[] {
    const bounds = new Set<number>([0, 1440]);
    for (const window of plan.windows) {
        bounds.add(minutesOf(window.from) as number);
        bounds.add(minutesOf(window.to) as number);
    }
    const sorted = [...bounds].sort((a, b) => a - b);
    const segments: HeatingSegment[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
        const temperature = localTarget(plan, weekday, sorted[i]);
        const last = segments[segments.length - 1];
        if (last !== undefined && last.temperature === temperature) {
            last.to = sorted[i + 1];
        } else {
            segments.push({ from: sorted[i], to: sorted[i + 1], temperature });
        }
    }
    return segments;
}

export function weekSegments(plan: HeatingPlan): HeatingSegment[][] {
    return ALL_DAYS.map((weekday) => daySegments(plan, weekday));
}

/** "21.5 °C" */
export function temperatureText(value: number): string {
    return value + ' °C';
}

/** "in 3 h 10 min", "in 25 min", "in under a minute"; null when the switch is more than 24 hours ahead or not ahead. */
export function countdownText(deltaMs: number): string | null {
    if (deltaMs < 0 || deltaMs > DAY) {
        return null;
    }
    const minutes = Math.floor(deltaMs / MINUTE);
    if (minutes < 1) {
        return 'in under a minute';
    }
    if (minutes < 60) {
        return 'in ' + minutes + ' min';
    }
    const rest = minutes % 60;
    return 'in ' + Math.floor(minutes / 60) + ' h' + (rest === 0 ? '' : ' ' + rest + ' min');
}

/** "22:00", with the weekday when the instant is on another local day than now, and with the date from 7 days on. */
export function switchTimeText(atUtcMs: number, nowUtcMs: number): string {
    const parts = berlinParts(atUtcMs);
    const ahead = parts.day - berlinParts(nowUtcMs).day;
    let day = ahead === 0 ? '' : WEEKDAY_NAMES[parts.weekday] + ' ';
    if (ahead >= 7) {
        const date = new Date(parts.day * DAY);
        day = WEEKDAY_NAMES[parts.weekday] + ' ' + date.getUTCDate() + ' ' + MONTH_NAMES[date.getUTCMonth()] + ' ';
    }
    return day + timeText(parts.minute);
}

/** "17 °C from 22:00, in 3 h 10 min"; the countdown is left out for a switch more than 24 hours ahead. */
export function nextSwitchText(next: HeatingSwitch, nowUtcMs: number): string {
    const countdown = countdownText(next.at - nowUtcMs);
    return temperatureText(next.temperature) + ' from ' + switchTimeText(next.at, nowUtcMs) + (countdown === null ? '' : ', ' + countdown);
}

/** The ends of the one colour scale of both clients: blue at COLD_TEMPERATURE and below, orange at WARM_TEMPERATURE and above. */
export const COLD_TEMPERATURE = 16;
export const WARM_TEMPERATURE = 22;
export const COLD_COLOR = '#64B5F6';
export const WARM_COLOR = '#FF8A3D';

/** Text colour that stays readable on every colour of the scale. */
export const SEGMENT_TEXT_COLOR = '#1B1B1B';

function channels(color: string): number[] {
    return [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
}

/** Linear blend of the scale ends, clamped; "#rrggbb". */
export function temperatureColor(temperature: number): string {
    const fraction = Math.min(1, Math.max(0, (temperature - COLD_TEMPERATURE) / (WARM_TEMPERATURE - COLD_TEMPERATURE)));
    const cold = channels(COLD_COLOR);
    const warm = channels(WARM_COLOR);
    return '#' + cold.map((value, i) => Math.round(value + (warm[i] - value) * fraction).toString(16).padStart(2, '0')).join('').toUpperCase();
}
