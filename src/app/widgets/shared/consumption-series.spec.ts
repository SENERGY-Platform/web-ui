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

import { consumptionColors, consumptionSeries } from './consumption-series';

const t1 = '2026-10-05T08:00:00Z';
const t2 = '2026-10-05T09:00:00Z';
const t3 = '2026-10-05T10:00:00Z';

describe('consumptionSeries', () => {
    it('splits the consumptions into a normal and an anomalous series, keeping their order', () => {
        expect(consumptionSeries([[t1, 1.5, 0], [t2, 9, 1], [t3, 2, 0]])).toEqual([
            { name: 'Normal Consumption', data: [{ x: Date.parse(t1), y: 1.5 }, { x: Date.parse(t3), y: 2 }] },
            { name: 'Anomalous Consumption', data: [{ x: Date.parse(t2), y: 9 }] },
        ]);
    });

    it('counts only a flag of exactly 1 as anomalous', () => {
        const series = consumptionSeries([[t1, 1, true], [t2, 2, '1'], [t3, 3, null]]);
        expect(series[0].data.map((p) => p.y)).toEqual([1, 2, 3]);
        expect(series[1].data).toEqual([]);
    });

    it('always has both series, empty without consumptions', () => {
        expect(consumptionSeries([])).toEqual([
            { name: 'Normal Consumption', data: [] },
            { name: 'Anomalous Consumption', data: [] },
        ]);
    });

    it('draws normal consumption blue and anomalous consumption red', () => {
        expect(consumptionColors).toEqual(['#008FFB', '#FF0000']);
    });
});
