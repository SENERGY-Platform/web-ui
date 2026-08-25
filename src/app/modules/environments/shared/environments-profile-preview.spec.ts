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

import { mondayStartWeekday, profilePreviewPoints } from './environments-profile-preview';
import { ProfileSource } from './environments.model';

describe('profilePreviewPoints', () => {
    it('returns 24 points, one per hour', () => {
        const points = profilePreviewPoints({ base: 10 }, 0);
        expect(points.length).toBe(24);
        expect(points.map((p) => p.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    });

    it('defaults to neutral (1) factors, so an unconfigured profile is flat at base', () => {
        const points = profilePreviewPoints({ base: 10 }, 3);
        points.forEach((p) => expect(p.value).toBe(10));
    });

    it('applies the hour factor of each hour', () => {
        const profile: ProfileSource = { base: 10, hour_factors: new Array(24).fill(1) };
        profile.hour_factors![5] = 2;
        const points = profilePreviewPoints(profile, 0);
        expect(points[5].value).toBe(20);
        expect(points[6].value).toBe(10);
    });

    it('applies the given weekday\'s factor uniformly across every hour', () => {
        const profile: ProfileSource = { base: 10, weekday_factors: [1, 1, 0.5, 1, 1, 1, 1] };
        const points = profilePreviewPoints(profile, 2);
        points.forEach((p) => expect(p.value).toBe(5));
    });

    it('bands the value by spread_percent around the resolved value', () => {
        const points = profilePreviewPoints({ base: 100, spread_percent: 10 }, 0);
        expect(points[0].low).toBeCloseTo(90);
        expect(points[0].high).toBeCloseTo(110);
    });

    it('collapses the band to the value itself when spread is unset', () => {
        const points = profilePreviewPoints({ base: 100 }, 0);
        expect(points[0].low).toBe(100);
        expect(points[0].high).toBe(100);
    });
});

describe('mondayStartWeekday', () => {
    it('maps Sunday (JS day 0) to index 6', () => {
        expect(mondayStartWeekday(new Date('2026-08-23T00:00:00'))).toBe(6); // a Sunday
    });

    it('maps Monday (JS day 1) to index 0', () => {
        expect(mondayStartWeekday(new Date('2026-08-24T00:00:00'))).toBe(0); // a Monday
    });
});
