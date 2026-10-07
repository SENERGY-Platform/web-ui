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

import { nextPvPredictionText, pvPredictionAxisTitle, pvPredictionPoints } from './pv-prediction-chart';
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
    // newest first, as the export query returns them; hours 0..5 of the day, now at hour 2
    const data = { predictions: [5, 4, 3, 2, 1, 0].map((h) => ({ timestamp: new Date(Date.UTC(2026, 9, 5, h)).toISOString(), value: 10 ** h })) };
    const now = new Date(Date.UTC(2026, 9, 5, 2));

    // SNRGY-4848 item 6: "next N h" used to sum the last N predictions of the list instead of the next ones.
    it('sums the next n hourly predictions from now on, rounded to 2 decimals', () => {
        expect(nextPvPredictionText(data, 'h', 2, now)).toBe('1100 Wh');
        const fractions = { predictions: [{ timestamp: now.toISOString(), value: 1.111 }, { timestamp: new Date(now.getTime() + 3600000).toISOString(), value: 2.222 }] };
        expect(nextPvPredictionText(fractions, 'h', 2, now)).toBe('3.33 Wh');
    });

    it('includes the prediction of the slot that is running now, but not the one before', () => {
        const during = new Date(Date.UTC(2026, 9, 5, 2, 37));
        // slots 2 and 3; slot 1 (10 Wh) is over
        expect(nextPvPredictionText(data, 'h', 2, during)).toBe('1100 Wh');
        expect(nextPvPredictionText(data, 'h', 1, during)).toBe('100 Wh');
    });

    it('takes the slot length from the distance of the prediction timestamps', () => {
        const halfHourly = { predictions: [0, 30, 60, 90, 120].map((m, i) => ({ timestamp: new Date(Date.UTC(2026, 9, 5, 10, m)).toISOString(), value: 10 ** i })) };
        // 10:37 lies in the slot of 10:30 (10 Wh), so the next 2 are the slots of 10:30 and 11:00
        expect(nextPvPredictionText(halfHourly, 'h', 2, new Date(Date.UTC(2026, 9, 5, 10, 37)))).toBe('110 Wh');
    });

    // SNRGY-4848 item 6: a time of 0 used to sum all predictions, since slice(-0) is slice(0).
    it('sums nothing for a time of 0', () => {
        expect(nextPvPredictionText(data, 'h', 0, now)).toBe('0 Wh');
    });

    it('takes 24 predictions per day for level d', () => {
        const daily = { predictions: Array.from({ length: 30 }, (_, i) => ({ timestamp: new Date(now.getTime() + i * 3600000).toISOString(), value: i })) };
        // the first 24 of 0..29 are 0..23
        expect(nextPvPredictionText(daily, 'd', 1, now)).toBe((23 * 24) / 2 + ' Wh');
    });

    it('sums everything ahead when fewer predictions exist than asked for', () => {
        expect(nextPvPredictionText(data, 'h', 10, now)).toBe('111100 Wh');
    });
});
