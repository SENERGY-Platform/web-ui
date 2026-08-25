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

import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexLegend, ApexStroke, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import { ProfileSource } from './environments.model';

export interface ProfilePreviewPoint {
    hour: number;
    value: number;
    low: number;
    high: number;
}

/** Just the apx-chart inputs the profile preview binds; ApexOptions itself has no single narrower type for a partial config. */
export interface ProfileChartOptions {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    dataLabels: ApexDataLabels;
    stroke: ApexStroke;
    legend: ApexLegend;
    colors: string[];
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

/**
 * Builds the apx-chart config for a profile's 24-hour preview, shared by every place that
 * shows this curve (the channel/context source editor, the "add context" preset picker) so
 * they cannot drift into slightly different renderings of the same data.
 */
export function profileChartOptions(profile: ProfileSource, weekday: number): ProfileChartOptions {
    const points = profilePreviewPoints(profile, weekday);
    const hasSpread = (profile.spread_percent ?? 0) > 0;
    const series: ApexAxisChartSeries = [{ name: 'Value', data: points.map((p) => p.value) }];
    if (hasSpread) {
        series.push({ name: 'Low', data: points.map((p) => p.low) }, { name: 'High', data: points.map((p) => p.high) });
    }
    return {
        series,
        chart: { type: 'line', height: 220, toolbar: { show: false }, animations: { enabled: false } },
        xaxis: { categories: points.map((p) => p.hour + ':00') },
        // unformatted floats render as 25.0000000000000000 on the axis
        yaxis: { labels: { formatter: (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 }) } },
        dataLabels: { enabled: false },
        stroke: { width: hasSpread ? [3, 1, 1] : [3], dashArray: hasSpread ? [0, 4, 4] : [0], curve: 'smooth' },
        legend: { show: hasSpread },
        colors: hasSpread ? ['#008FFB', '#999999', '#999999'] : ['#008FFB'],
    };
}
