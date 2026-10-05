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

import { mondayStartWeekday, profileChartOptions, profilePreviewPoints, profileValueLabel } from './environments-profile-preview';
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

describe('profileChartOptions', () => {
    it('renders a single series when spread is unset', () => {
        const options = profileChartOptions({ base: 10 }, 0);
        expect(options.series.length).toBe(1);
        expect(options.series[0].data as number[]).toEqual(new Array(24).fill(10));
        expect(options.legend.show).toBe(false);
    });

    it('adds low/high band series when spread is set', () => {
        const options = profileChartOptions({ base: 100, spread_percent: 10 }, 0);
        expect(options.series.length).toBe(3);
        expect(options.legend.show).toBe(true);
    });

    it('labels the x-axis with hour categories', () => {
        const options = profileChartOptions({ base: 1 }, 0);
        expect(options.xaxis.categories).toEqual(Array.from({ length: 24 }, (_, i) => i + ':00'));
    });
});

describe('profile preview look', () => {
    it('draws the value as solid blue line and the band as thin dashed grey lines', () => {
        const options = profileChartOptions({ base: 100, spread_percent: 10 }, 0);
        expect(options.series.map((s) => s.name)).toEqual(['Value', 'Low', 'High']);
        expect(options.series[1].data as number[]).toEqual(new Array(24).fill(90));
        expect((options.series[2].data as number[])[0]).toBeCloseTo(110);
        expect(options.colors).toEqual(['#008FFB', '#999999', '#999999']);
        expect(options.stroke.width).toEqual([3, 1, 1]);
        expect(options.stroke.dashArray).toEqual([0, 4, 4]);
    });

    it('draws a single solid blue line without band', () => {
        const options = profileChartOptions({ base: 10 }, 0);
        expect(options.series[0].name).toBe('Value');
        expect(options.colors).toEqual(['#008FFB']);
        expect(options.stroke.width).toEqual([3]);
        expect(options.stroke.dashArray).toEqual([0]);
    });

    it('labels the value axis through profileValueLabel', () => {
        const formatter = (options: any) => options.yaxis.labels.formatter;
        expect(formatter(profileChartOptions({ base: 1 }, 0))).toBe(profileValueLabel);
    });
});

describe('profileValueLabel', () => {
    it('cuts float noise off whole values', () => {
        expect(profileValueLabel(25.0000000000001)).toBe('25');
        expect(profileValueLabel(0)).toBe('0');
    });

    it('rounds to one decimal with the separators of the browser locale', () => {
        expect(profileValueLabel(1234.56)).toMatch(/^1[.,\u00a0\u202f]?234[.,]6$/);
        expect(profileValueLabel(2.25)).toMatch(/^2[.,]3$/);
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
