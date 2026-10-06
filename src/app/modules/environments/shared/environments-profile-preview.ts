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

import { ProfileSource } from './environments.model';

export interface ProfilePreviewPoint {
    hour: number;
    value: number;
    low: number;
    high: number;
}

export interface ProfilePreviewSeries {
    name: string;
    values: number[];
    color: string;
    width: number;
    dashed: boolean;
}

/** The profile preview as drawn: one curve per series over the hours of the day. */
export interface ProfilePreview {
    hourLabels: string[];
    series: ProfilePreviewSeries[];
    showLegend: boolean;
}

/**
 * The 24-hour curve a profile source actually produces: base * hour factor * the given
 * weekday's factor, banded by +/- spread_percent. Missing factors default to neutral (1),
 * the same "leave empty = neutral" convention the factor editor itself uses (see
 * withFactorSet in environments-source.ts). This is the client-side answer to "what does
 * this profile do", computed the same way the simulator resolves a value, minus the random
 * draw within the spread band.
 */
export function profilePreviewPoints(profile: ProfileSource, weekday: number): ProfilePreviewPoint[] {
    const base = profile.base ?? 0;
    const weekdayFactor = profile.weekday_factors?.[weekday] ?? 1;
    const spread = Math.max(0, profile.spread_percent ?? 0) / 100;
    return Array.from({ length: 24 }, (_, hour) => {
        const hourFactor = profile.hour_factors?.[hour] ?? 1;
        const value = base * hourFactor * weekdayFactor;
        return { hour, value, low: value * (1 - spread), high: value * (1 + spread) };
    });
}

/** Monday-start weekday index (0=Mon..6=Sun) for a date, matching weekday_factors' convention. */
export function mondayStartWeekday(date: Date): number {
    return (date.getDay() + 6) % 7;
}

/** The value axis label: browser locale, at most one decimal, since unformatted floats render as 25.0000000000000000 on the axis. */
export function profileValueLabel(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/**
 * The 24-hour preview of a profile, shared by every place that shows this curve (the channel/context
 * source editor, the "add context" preset picker) so they cannot drift into different renderings.
 * The value is a solid blue line; with a spread, low and high follow as thin dashed grey lines.
 */
export function profilePreview(profile: ProfileSource, weekday: number): ProfilePreview {
    const points = profilePreviewPoints(profile, weekday);
    const hasSpread = (profile.spread_percent ?? 0) > 0;
    const series: ProfilePreviewSeries[] = [{ name: 'Value', values: points.map((p) => p.value), color: '#008FFB', width: 3, dashed: false }];
    if (hasSpread) {
        series.push(
            { name: 'Low', values: points.map((p) => p.low), color: '#999999', width: 1, dashed: true },
            { name: 'High', values: points.map((p) => p.high), color: '#999999', width: 1, dashed: true },
        );
    }
    return { hourLabels: points.map((p) => p.hour + ':00'), series, showLegend: hasSpread };
}
