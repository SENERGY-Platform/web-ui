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

import { reconstructionAxisTitle, reconstructionPoints, reconstructionSeriesNames } from './reconstruction-chart';
import { reconstructionChart } from './reconstruction-chartjs';

describe('reconstructionPoints', () => {
    it('orders the curve newest first and keeps both values of every point', () => {
        const points = reconstructionPoints([
            ['2024-04-29T12:01:54.288Z', 1, 2],
            ['2024-04-29T14:01:54.288Z', 2, 3],
            ['2024-04-29T13:01:54.288Z', 2, 2],
        ]);
        expect(points).toEqual([
            { time: new Date('2024-04-29T14:01:54.288Z'), true: 2, expected: 3 },
            { time: new Date('2024-04-29T13:01:54.288Z'), true: 2, expected: 2 },
            { time: new Date('2024-04-29T12:01:54.288Z'), true: 1, expected: 2 },
        ]);
    });

    it('accepts epoch milliseconds as time', () => {
        const ms = Date.UTC(2024, 3, 29, 12);
        expect(reconstructionPoints([[ms, 5, 6]])).toEqual([{ time: new Date(ms), true: 5, expected: 6 }]);
    });

    // SNRGY-4848 item 7: value[1] was named "expected" and value[2] "true", the other way round to the model's documentation.
    it('names value[1] "true" and value[2] "expected"', () => {
        expect(reconstructionPoints([['2024-04-29T12:00:00Z', 70, 62]])[0]).toEqual(jasmine.objectContaining({ true: 70, expected: 62 }));
        expect(reconstructionSeriesNames).toEqual(['true', 'expected']);
        expect(reconstructionAxisTitle).toBe('Expected Value');
    });
});

describe('reconstructionChart', () => {
    const points = reconstructionPoints([['2024-04-29T12:05:00Z', 70, 62], ['2024-04-29T12:00:00Z', 71, 63]]);
    const chart = reconstructionChart(points);

    it('draws the true value in #3366cc and the expected one in #dc3912, oldest first', () => {
        expect(chart.data.datasets.map((d) => [d.label, d.borderColor])).toEqual([['true', '#3366cc'], ['expected', '#dc3912']]);
        expect(chart.data.datasets[0].data).toEqual([{ x: Date.parse('2024-04-29T12:00:00Z'), y: 71 }, { x: Date.parse('2024-04-29T12:05:00Z'), y: 70 }]);
        expect(chart.data.datasets[1].data.map((p: any) => p.y)).toEqual([63, 62]);
        expect([chart.frame.width, chart.frame.height]).toEqual([1000, 500]);
    });
});
