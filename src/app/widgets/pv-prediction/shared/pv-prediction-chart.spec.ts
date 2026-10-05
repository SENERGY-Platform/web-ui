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

import { nextPvPredictionText, pvPredictionAxisTitle, pvPredictionChart, pvPredictionPoints } from './pv-prediction-chart';
import { PVPredictionResult } from './prediction.model';

function hourly(...values: number[]): PVPredictionResult {
    return { predictions: values.map((value, i) => ({ timestamp: new Date(Date.UTC(2026, 9, 5, i)).toISOString(), value })) };
}

describe('pvPredictionPoints', () => {
    it('plots every prediction at its timestamp, in the given order', () => {
        expect(pvPredictionPoints(hourly(10, 20.5))).toEqual([
            { time: new Date(Date.UTC(2026, 9, 5, 0)), value: 10 },
            { time: new Date(Date.UTC(2026, 9, 5, 1)), value: 20.5 },
        ]);
    });

    it('labels the value axis', () => {
        expect(pvPredictionAxisTitle).toBe('Average Power in W');
    });
});

describe('nextPvPredictionText', () => {
    it('sums the last n hourly predictions, rounded to 2 decimals', () => {
        expect(nextPvPredictionText(hourly(100, 1.111, 2.222), 'h', 2)).toBe('3.33 Wh');
    });

    it('takes 24 predictions per day for level d', () => {
        const values = Array.from({ length: 30 }, (_, i) => i);
        // the last 24 of 0..29 are 6..29
        expect(nextPvPredictionText(hourly(...values), 'd', 1)).toBe(((6 + 29) * 24 / 2) + ' Wh');
    });

    it('sums everything when fewer predictions exist than asked for', () => {
        expect(nextPvPredictionText(hourly(1, 2), 'h', 5)).toBe('3 Wh');
    });

    // slice(-0) is slice(0)
    it('sums every prediction for a time of 0', () => {
        expect(nextPvPredictionText(hourly(1, 2, 3), 'h', 0)).toBe('6 Wh');
    });
});

describe('pvPredictionChart (Google)', () => {
    it('puts the points in a time/energy table', () => {
        const points = pvPredictionPoints(hourly(10));
        expect(pvPredictionChart(points).dataTable).toEqual([['time', 'energy'], [points[0].time, 10]]);
    });
});
