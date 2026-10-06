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

import { profileChartConfig, profileTooltipView } from './environments-profile-chartjs';
import { profilePreview, profileValueLabel } from './environments-profile-preview';

const tick = (callback: any, value: number) => callback.call({}, value, 0, []);

describe('profileChartConfig', () => {
    it('draws one curve per series in its colour at 0.85 opacity, the band thin and dashed', () => {
        const config = profileChartConfig(profilePreview({ base: 100, spread_percent: 10 }, 0));
        expect(config.data.labels).toEqual(Array.from({ length: 24 }, (_, i) => i + ':00'));
        expect(config.data.datasets.map((d) => [d.label, d.borderColor, d.borderWidth, d.borderDash])).toEqual([
            ['Value', 'rgba(0, 143, 251, 0.85)', 3, []],
            ['Low', 'rgba(153, 153, 153, 0.85)', 1, [4, 4]],
            ['High', 'rgba(153, 153, 153, 0.85)', 1, [4, 4]],
        ]);
        expect(config.data.datasets[1].data).toEqual(new Array(24).fill(90));
    });

    it('shows the legend only with a band', () => {
        expect(profileChartConfig(profilePreview({ base: 100, spread_percent: 10 }, 0)).options.plugins?.legend?.display).toBeTrue();
        expect(profileChartConfig(profilePreview({ base: 100 }, 0)).options.plugins?.legend?.display).toBeFalse();
    });

    it('labels the value axis without float noise', () => {
        const callback = (profileChartConfig(profilePreview({ base: 1 }, 0)).options.scales?.['y']?.ticks as any).callback;
        expect(tick(callback, 25.0000000000001)).toBe('25');
        expect(tick(callback, 2.25)).toMatch(/^2[.,]3$/);
    });
});

describe('profileTooltipView', () => {
    it('shows the hour as title and in the axis bubble, and every series value', () => {
        const preview = profilePreview({ base: 100, spread_percent: 10, hour_factors: [1, 1, 1, 1, 1, 1, 1, 1, 0.25] }, 0);
        expect(profileTooltipView(preview, [{ dataIndex: 8 } as any])).toEqual({
            title: '8:00',
            axisLabel: '8:00',
            rows: [
                { color: 'rgba(0, 143, 251, 0.85)', label: 'Value', value: '25' },
                { color: 'rgba(153, 153, 153, 0.85)', label: 'Low', value: profileValueLabel(22.5) },
                { color: 'rgba(153, 153, 153, 0.85)', label: 'High', value: profileValueLabel(27.5) },
            ],
        });
    });

    it('shows nothing without hovered point', () => {
        expect(profileTooltipView(profilePreview({ base: 1 }, 0), [])).toBeUndefined();
    });
});
