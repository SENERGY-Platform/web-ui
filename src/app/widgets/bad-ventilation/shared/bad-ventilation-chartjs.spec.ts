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

import { badVentilationChartConfig, humidityTooltipView, ventilationAnnotations } from './bad-ventilation-chartjs';

const t1 = new Date(2026, 9, 5, 8, 22).getTime();
const t2 = new Date(2026, 9, 5, 8, 23).getTime();
const points = [{ x: t1, y: 51.01 }, { x: t2, y: 52 }];
const ranges = [
    { from: t1, to: t2, color: '#EE4B2B', label: 'High Humidity Increase' },
    { from: t1 - 60000, to: t1, color: '#097969', label: 'Open Window' },
];

describe('badVentilationChartConfig', () => {
    it('draws the humidity as a 5px blue line without legend', () => {
        const config = badVentilationChartConfig(points, ranges);
        expect(config.data.datasets.map((d) => [d.label, d.borderColor, d.borderWidth, d.data])).toEqual([['Humidity', 'rgba(0, 143, 251, 0.85)', 5, points]]);
        expect(config.options.plugins?.legend?.display).toBeFalse();
    });

    it('labels the value axis with three decimals', () => {
        const callback = (badVentilationChartConfig(points, ranges).options.scales as any).y.ticks.callback;
        expect(callback.call({}, 70, 0, [])).toBe('70.000');
    });
});

describe('ventilationAnnotations', () => {
    it('shades each range at 0.3 and labels it, every label right after its own range', () => {
        const annotations = ventilationAnnotations(ranges) as any[];
        expect(annotations.map((a) => [a.type, a.xMin ?? a.xValue, a.backgroundColor, a.content])).toEqual([
            ['box', t1, 'rgba(238, 75, 43, 0.3)', undefined],
            ['label', t1, '#EE4B2B', 'High Humidity Increase'],
            ['box', t1 - 60000, 'rgba(9, 121, 105, 0.3)', undefined],
            ['label', t1 - 60000, '#097969', 'Open Window'],
        ]);
    });
});

describe('humidityTooltipView', () => {
    it('shows the time to the millisecond and the humidity with three decimals', () => {
        expect(humidityTooltipView(points, [{ datasetIndex: 0, dataIndex: 0 } as any])).toEqual({
            title: '05.10 08:22:00.000', axisLabel: '05.10 08:22:00.000', rows: [{ color: 'rgba(0, 143, 251, 0.85)', label: 'Humidity', value: '51.010' }],
        });
    });
});
