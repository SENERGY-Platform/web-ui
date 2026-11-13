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

import { berlinOffset, berlinParts, switchTimeText, temperatureColor, temperatureText, timeText } from './heating-schedule.plan';

export type WarmupMode = 'show' | 'plan';

/** What the info module of the instance says about the warm-up export. */
export interface WarmupConfig {
    exportId: string;
    mode: WarmupMode;
}

export interface WarmupStation {
    id: string | null;
    name: string | null;
    distanceKm: number | null;
}

/** A rising plan boundary of the next 24 hours. */
export interface WarmupWindow {
    /** UTC milliseconds */
    start: number;
    target: number;
    leadMinutes: number | null;
}

/** The newest export row of one zone, parsed. */
export interface ZoneWarmup {
    /** remaining minutes while the set point is above the room temperature; -1 unreachable */
    warmupMinutes: number | null;
    nextStart: number | null;
    nextTarget: number | null;
    nextLeadMinutes: number | null;
    windows: WarmupWindow[];
    /** null: own outdoor sensor; a station with null fields: not known yet */
    measureStation: WarmupStation | null;
    forecastStation: WarmupStation | null;
    modelKnown: boolean;
    episodes: number | null;
}

/** A hatched stretch of a day bar, in percent of the day. */
export interface HatchSpan {
    left: number;
    width: number;
    color: string;
    title: string;
    /** lighter in mode `show`, where the plan does not move */
    opacity: number;
}

export const WIDGET_MODULE_TYPE = 'widget';
export const WIDGET_KEY = 'heating_schedule';

/** The export columns in the order the query asks for them; the answer rows are `[time, ...columns]`. */
export const WARMUP_COLUMNS = [
    'zone_name', 'warmup_minutes', 'next_start', 'next_target', 'next_lead_minutes', 'windows',
    'measure_station', 'forecast_station', 'a', 'b', 'episodes',
] as const;

/** Warm-ups the operator needs before it fits a model. */
const EPISODES_NEEDED = 3;
const MINUTE = 60000;
const DAY = 86400000;
const SHOW_OPACITY = 0.45;

function numberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function timeOrNull(value: unknown): number | null {
    if (typeof value !== 'string') {
        return null;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function parseJsonField(value: unknown, name: string): unknown {
    if (typeof value !== 'string') {
        return value ?? null;
    }
    try {
        return JSON.parse(value);
    } catch (error) {
        console.error('The warm-up column ' + name + ' is not valid JSON', error);
        return undefined;
    }
}

function parseStation(value: unknown, name: string): WarmupStation | null {
    const parsed = parseJsonField(value, name);
    if (parsed === null) {
        return null;
    }
    const station = (typeof parsed === 'object' ? parsed : {}) as { id?: unknown; name?: unknown; distance_km?: unknown };
    return {
        id: typeof station.id === 'string' ? station.id : null,
        name: typeof station.name === 'string' && station.name.trim() !== '' ? station.name : null,
        distanceKm: numberOrNull(station.distance_km),
    };
}

function parseWindows(value: unknown): WarmupWindow[] {
    const parsed = parseJsonField(value, 'windows');
    if (!Array.isArray(parsed)) {
        return [];
    }
    const windows: WarmupWindow[] = [];
    for (const entry of parsed as Array<{ start?: unknown; target?: unknown; lead_minutes?: unknown } | null>) {
        const start = timeOrNull(entry?.start);
        const target = numberOrNull(entry?.target);
        if (start !== null && target !== null) {
            windows.push({ start, target, leadMinutes: numberOrNull(entry?.lead_minutes) });
        }
    }
    return windows;
}

/** One answer row `[time, ...WARMUP_COLUMNS]` of the query; a field that cannot be read counts as missing. */
export function parseWarmupRow(row: unknown[]): ZoneWarmup {
    const at = (name: typeof WARMUP_COLUMNS[number]): unknown => row[1 + WARMUP_COLUMNS.indexOf(name)];
    return {
        warmupMinutes: numberOrNull(at('warmup_minutes')),
        nextStart: timeOrNull(at('next_start')),
        nextTarget: numberOrNull(at('next_target')),
        nextLeadMinutes: numberOrNull(at('next_lead_minutes')),
        windows: parseWindows(at('windows')),
        measureStation: parseStation(at('measure_station'), 'measure_station'),
        forecastStation: parseStation(at('forecast_station'), 'forecast_station'),
        modelKnown: numberOrNull(at('a')) !== null,
        episodes: numberOrNull(at('episodes')),
    };
}

/** The newest row of every zone from a per-query answer where query i asked for the newest row of zone i; null for a zone without a row. */
export function warmupByZone(answer: unknown[][][], zoneCount: number): Array<ZoneWarmup | null> {
    return Array.from({ length: zoneCount }, (_, zone) => {
        const row = answer[zone]?.[0];
        return Array.isArray(row) && row.length > 0 ? parseWarmupRow(row) : null;
    });
}

/** The warm-up export of the instance from the `widget` module it deployed; null for an instance without one. */
export function warmupConfig(modules: Array<{ module_type: string; module_data: Record<string, unknown> }>): WarmupConfig | null {
    for (const module of modules) {
        if (module.module_type !== WIDGET_MODULE_TYPE || module.module_data?.['widget_key'] !== WIDGET_KEY) {
            continue;
        }
        const data = module.module_data['widget_data'] as { warmup_export_id?: unknown; warmup_mode?: unknown } | null | undefined;
        if (typeof data?.warmup_export_id === 'string' && data.warmup_export_id !== '') {
            return { exportId: data.warmup_export_id, mode: data.warmup_mode === 'plan' ? 'plan' : 'show' };
        }
    }
    return null;
}

/** "35 min", "1 h 5 min" */
export function durationText(minutes: number): string {
    return minutes < 60 ? minutes + ' min' : Math.floor(minutes / 60) + ' h' + (minutes % 60 === 0 ? '' : ' ' + (minutes % 60) + ' min');
}

/** The zone's status line while it heats towards `planned`; null when it does not. */
export function warmingText(warmup: ZoneWarmup | null, planned: number): string | null {
    const minutes = warmup?.warmupMinutes;
    if (minutes === null || minutes === undefined) {
        return null;
    }
    if (minutes < 0) {
        return temperatureText(planned) + ' is not reachable at this outdoor temperature';
    }
    return 'Warming up to ' + temperatureText(planned) + ', ' + (minutes < 1 ? 'almost there' : 'about ' + durationText(Math.round(minutes)) + ' left');
}

/** The extra line below the next switch; null for a past or unknown boundary or one that needs no lead time. */
export function nextWindowText(warmup: ZoneWarmup | null, mode: WarmupMode, nowUtcMs: number): string | null {
    if (warmup === null || warmup.nextStart === null || warmup.nextStart <= nowUtcMs || warmup.nextTarget === null || warmup.nextLeadMinutes === null || warmup.nextLeadMinutes <= 0) {
        return null;
    }
    const target = temperatureText(warmup.nextTarget);
    const at = switchTimeText(warmup.nextStart, nowUtcMs);
    if (mode === 'show') {
        return 'Needs about ' + durationText(warmup.nextLeadMinutes) + ' to reach ' + target + ' at ' + at;
    }
    const heatFrom = warmup.nextStart - warmup.nextLeadMinutes * MINUTE;
    return heatFrom <= nowUtcMs ? 'Heating for ' + target + ' at ' + at : 'Heats from ' + switchTimeText(heatFrom, nowUtcMs) + ' for ' + target + ' at ' + at;
}

/** "Learning the warm-up time (2 of 3 warm-ups seen)"; null once the zone has a model. */
export function learningText(warmup: ZoneWarmup | null): string | null {
    if (warmup?.modelKnown) {
        return null;
    }
    const seen = warmup?.episodes;
    return 'Learning the warm-up time' + (seen === null || seen === undefined ? '' : ' (' + seen + ' of ' + EPISODES_NEEDED + ' warm-ups seen)');
}

/** "Outdoor: DWD Leipzig (12.3 km) · Forecast: Leipzig (8.1 km)"; null when nothing is known. */
export function stationLine(warmups: Array<ZoneWarmup | null>): string | null {
    const first = warmups.find((warmup): warmup is ZoneWarmup => warmup !== null);
    if (first === undefined) {
        return null;
    }
    const describe = (label: string, station: WarmupStation): string | null => {
        const distance = station.distanceKm === null ? null : '(' + Math.round(station.distanceKm * 10) / 10 + ' km)';
        const text = [station.name, distance].filter((part) => part !== null).join(' ');
        return text === '' ? null : label + ': ' + text;
    };
    const parts = [
        first.measureStation === null ? 'Outdoor: own sensor' : describe('Outdoor', first.measureStation),
        first.forecastStation === null ? null : describe('Forecast', first.forecastStation),
    ].filter((part): part is string => part !== null);
    return parts.length === 0 ? null : parts.join(' · ');
}

interface WarmupInterval {
    from: number;
    to: number;
    target: number;
}

/** Heating periods `[start - lead, start]` of the rising boundaries that are still ahead. */
function warmupIntervals(warmup: ZoneWarmup | null, nowUtcMs: number): WarmupInterval[] {
    return (warmup?.windows ?? [])
        .filter((window) => window.leadMinutes !== null && window.leadMinutes > 0 && window.start > nowUtcMs)
        .map((window) => ({ from: window.start - (window.leadMinutes as number) * MINUTE, to: window.start, target: window.target }));
}

/** The hatched stretches that fall on local day `day` (days since the epoch, as `berlinParts` counts), clipped to that day. */
export function hatchSpans(warmup: ZoneWarmup | null, mode: WarmupMode, nowUtcMs: number, day: number): HatchSpan[] {
    const spans: HatchSpan[] = [];
    for (const interval of warmupIntervals(warmup, nowUtcMs)) {
        const from = Math.max(0, (interval.from + berlinOffset(interval.from) - day * DAY) / MINUTE);
        const to = Math.min(1440, (interval.to + berlinOffset(interval.to) - day * DAY) / MINUTE);
        if (to > from) {
            spans.push({
                left: (from / 1440) * 100,
                width: ((to - from) / 1440) * 100,
                color: temperatureColor(interval.target),
                title: (mode === 'plan' ? 'Heats ' : 'Would have to heat ') + timeText(Math.round(from)) + '–' + timeText(Math.round(to)) + ' for ' + temperatureText(interval.target),
                opacity: mode === 'show' ? SHOW_OPACITY : 1,
            });
        }
    }
    return spans;
}

/** The local day of a row of the week overview: the next day with that weekday, today included. */
export function rowDay(nowUtcMs: number, weekday: number): number {
    const today = berlinParts(nowUtcMs);
    return today.day + ((weekday - today.weekday + 7) % 7);
}
