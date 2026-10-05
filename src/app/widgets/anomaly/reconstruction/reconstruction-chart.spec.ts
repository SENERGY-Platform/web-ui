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

import { reconstructionAxisTitle, reconstructionChart, reconstructionPoints, reconstructionSeriesNames } from './reconstruction-chart';

describe('reconstructionPoints', () => {
    it('orders the curve newest first and keeps both values of every point', () => {
        const points = reconstructionPoints([
            ['2024-04-29T12:01:54.288Z', 1, 2],
            ['2024-04-29T14:01:54.288Z', 2, 3],
            ['2024-04-29T13:01:54.288Z', 2, 2],
        ]);
        expect(points).toEqual([
            { time: new Date('2024-04-29T14:01:54.288Z'), expected: 2, true: 3 },
            { time: new Date('2024-04-29T13:01:54.288Z'), expected: 2, true: 2 },
            { time: new Date('2024-04-29T12:01:54.288Z'), expected: 1, true: 2 },
        ]);
    });

    it('accepts epoch milliseconds as time', () => {
        const ms = Date.UTC(2024, 3, 29, 12);
        expect(reconstructionPoints([[ms, 5, 6]])).toEqual([{ time: new Date(ms), expected: 5, true: 6 }]);
    });

    // The model documents value[1] as the true and value[2] as the reconstructed value; the chart names them the other way round.
    it('names value[1] "expected" and value[2] "true"', () => {
        expect(reconstructionSeriesNames).toEqual(['expected', 'true']);
        expect(reconstructionAxisTitle).toBe('Expected Value');
    });
});

describe('reconstructionChart (Google)', () => {
    it('puts the points under the time/expected/true header', () => {
        const points = reconstructionPoints([['2024-04-29T12:00:00Z', 1, 2]]);
        expect(reconstructionChart(points).dataTable).toEqual([['time', 'expected', 'true'], [points[0].time, 1, 2]]);
    });
});
