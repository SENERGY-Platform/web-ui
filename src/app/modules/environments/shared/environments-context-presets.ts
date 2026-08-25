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

import { Source } from './environments.model';

export interface ContextPreset {
    id: string;
    label: string;
    description: string;
    /** Prefilled context key; empty for a preset with no single natural key (Custom, Replay a dataset) -- the user must type one. */
    key: string;
    source: Source;
}

/**
 * Curated starting points for "Add context": the context area is otherwise a blank map the
 * user has to know how to fill correctly (a valid kind, a mandatory interval_seconds, 24/7-
 * length factor arrays), and getting any one of those wrong only shows up as a rejected save.
 * A preset is already validation-conform -- kind is 'profile' or 'dataset', interval_seconds
 * is a positive integer, and any factor array is either empty or exactly 24/7 long -- so
 * picking one and adjusting values from there cannot re-introduce those mistakes.
 */
export const CONTEXT_PRESETS: ContextPreset[] = [
    {
        id: 'outdoor-temperature',
        label: 'Outdoor temperature (day cycle)',
        description: 'A daily temperature curve: cool overnight, a trough before sunrise, warmest mid-afternoon.',
        key: 'outdoor_temperature',
        source: {
            kind: 'profile',
            interval_seconds: 300,
            profile: {
                base: 12,
                spread_percent: 15,
                hour_factors: [
                    0.6, 0.6, 0.6, 0.6, 0.55, 0.5, 0.55, 0.65, 0.8, 0.95, 1.1, 1.2, 1.3, 1.4, 1.45, 1.5, 1.45, 1.35, 1.2, 1.05, 0.9, 0.8,
                    0.7, 0.65,
                ],
            },
        },
    },
    {
        id: 'solar-irradiance',
        label: 'Solar irradiance (day curve)',
        description: 'Zero overnight, a bell curve peaking around noon -- a stand-in for a site with no real irradiance sensor.',
        key: 'solar_irradiance',
        source: {
            kind: 'profile',
            interval_seconds: 300,
            profile: {
                base: 400,
                spread_percent: 25,
                hour_factors: [
                    0, 0, 0, 0, 0, 0, 0.05, 0.2, 0.4, 0.65, 0.9, 1.2, 1.6, 1.6, 1.3, 1.0, 0.7, 0.4, 0.2, 0.08, 0.02, 0, 0, 0,
                ],
            },
        },
    },
    {
        id: 'working-hours',
        label: 'Working hours (0/1)',
        description: '1 during 7:00-17:00 on weekdays, 0 otherwise -- gate formulas on whether the site is in operation.',
        key: 'working_hours',
        source: {
            kind: 'profile',
            interval_seconds: 300,
            profile: {
                base: 1,
                spread_percent: 0,
                hour_factors: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
                weekday_factors: [1, 1, 1, 1, 1, 0, 0],
            },
        },
    },
    {
        id: 'weekend',
        label: 'Weekend (0/1)',
        description: '1 on Saturday and Sunday, 0 on weekdays, flat across the day.',
        key: 'weekend',
        source: {
            kind: 'profile',
            interval_seconds: 3600,
            profile: {
                base: 1,
                spread_percent: 0,
                weekday_factors: [0, 0, 0, 0, 0, 1, 1],
            },
        },
    },
    {
        id: 'custom-profile',
        label: 'Custom (empty profile)',
        description: 'A blank day-cycle profile to build from scratch.',
        key: '',
        source: {
            kind: 'profile',
            interval_seconds: 300,
            profile: {},
        },
    },
    {
        id: 'replay-dataset',
        label: 'Replay a dataset',
        description: 'Replays an uploaded dataset or a platform device\'s recorded timeseries as the context value.',
        key: '',
        source: {
            kind: 'dataset',
            interval_seconds: 300,
            dataset: {},
        },
    },
];

/** A fresh, independent copy of a preset's source: two "Add context" picks of the same preset must not share array/object references. */
export function clonePresetSource(source: Source): Source {
    return JSON.parse(JSON.stringify(source)) as Source;
}
