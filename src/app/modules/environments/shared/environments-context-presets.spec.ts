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

import { clonePresetSource, CONTEXT_PRESETS } from './environments-context-presets';

describe('CONTEXT_PRESETS', () => {
    it('has a unique id and a non-empty label/description for every preset', () => {
        const ids = new Set<string>();
        CONTEXT_PRESETS.forEach((preset) => {
            expect(preset.label.length).toBeGreaterThan(0);
            expect(preset.description.length).toBeGreaterThan(0);
            expect(ids.has(preset.id)).toBe(false);
            ids.add(preset.id);
        });
    });

    // Mirrors the server's checkContextSource (lib/domain/validate.go): only 'profile' or
    // 'dataset' kinds are accepted for a context source, and interval_seconds must be a
    // positive integer -- a context source has no channel publish tick to piggyback on.
    it('is a valid context source kind with a positive integer interval_seconds', () => {
        CONTEXT_PRESETS.forEach((preset) => {
            expect(preset.source.kind === 'profile' || preset.source.kind === 'dataset').toBe(true);
            expect(Number.isInteger(preset.source.interval_seconds)).toBe(true);
            expect(preset.source.interval_seconds).toBeGreaterThan(0);
        });
    });

    // Boundary: hour_factors/weekday_factors must be exactly 24/7 long or left empty --
    // anything else is rejected by the server (checkContextSource -> profile.hour_factors).
    it('has profile factor arrays that are empty or exactly 24/7 entries long', () => {
        CONTEXT_PRESETS.filter((p) => p.source.kind === 'profile').forEach((preset) => {
            const hours = preset.source.profile?.hour_factors;
            const weekdays = preset.source.profile?.weekday_factors;
            expect(hours === undefined || hours.length === 24).toBe(true);
            expect(weekdays === undefined || weekdays.length === 7).toBe(true);
        });
    });

    it('sets a dataset object for every dataset-kind preset', () => {
        CONTEXT_PRESETS.filter((p) => p.source.kind === 'dataset').forEach((preset) => {
            expect(preset.source.dataset).toBeDefined();
        });
    });

    it('sets a profile object for every profile-kind preset', () => {
        CONTEXT_PRESETS.filter((p) => p.source.kind === 'profile').forEach((preset) => {
            expect(preset.source.profile).toBeDefined();
        });
    });
});

describe('clonePresetSource', () => {
    it('returns a deep copy that does not share array references with the original', () => {
        const preset = CONTEXT_PRESETS.find((p) => p.id === 'outdoor-temperature')!;
        const clone = clonePresetSource(preset.source);
        expect(clone).toEqual(preset.source);
        clone.profile!.hour_factors![0] = 999;
        expect(preset.source.profile!.hour_factors![0]).not.toBe(999);
    });

    it('produces independent clones on repeated calls, so picking the same preset twice does not alias', () => {
        const preset = CONTEXT_PRESETS.find((p) => p.id === 'working-hours')!;
        const a = clonePresetSource(preset.source);
        const b = clonePresetSource(preset.source);
        a.profile!.weekday_factors![0] = 42;
        expect(b.profile!.weekday_factors![0]).not.toBe(42);
    });
});
