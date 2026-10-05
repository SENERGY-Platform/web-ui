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

import { timelineSeries } from '../../charts/shared/chart-types/timeline/timeline-chart-data';
import { AnomalyResultModel } from './anomaly.model';
import { curveAnomaliesPerDevice, phaseTimelineData, phaseVAxes, phaseWindows } from './anomaly-phases';

const t1 = Date.UTC(2026, 9, 5, 8);
const t2 = Date.UTC(2026, 9, 5, 9);
const t3 = Date.UTC(2026, 9, 5, 10);
const t4 = Date.UTC(2026, 9, 5, 11);
const t5 = Date.UTC(2026, 9, 5, 12);
const t6 = Date.UTC(2026, 9, 5, 13);
const iso = (ms: number) => new Date(ms).toISOString();

function anomaly(start: number, end: number, type = 'curve'): AnomalyResultModel {
    return { type, start_time: iso(start), end_time: iso(end) } as AnomalyResultModel;
}

describe('phaseWindows', () => {
    const earliest = new Date(t1);
    const now = new Date(t6);

    it('is one normal phase from the earliest start until now for a device without anomalies', () => {
        expect(phaseWindows({ d: [] }, earliest, now)).toEqual([[[earliest, 0], [iso(t6), 0]]]);
    });

    it('surrounds an anomaly with normal phases, oldest first', () => {
        expect(phaseWindows({ d: [anomaly(t2, t3)] }, earliest, now)).toEqual([[
            [earliest, 0], [iso(t2), 0],
            [iso(t2), 1], [iso(t3), 1],
            [iso(t3), 0], [iso(t6), 0],
        ]]);
    });

    it('adds a normal phase between two anomalies only when they do not overlap', () => {
        expect(phaseWindows({ d: [anomaly(t2, t3), anomaly(t4, t5)] }, earliest, now)[0].slice(2, 8)).toEqual([
            [iso(t2), 1], [iso(t3), 1], [iso(t3), 0], [iso(t4), 0], [iso(t4), 1], [iso(t5), 1],
        ]);
        expect(phaseWindows({ d: [anomaly(t2, t4), anomaly(t3, t5)] }, earliest, now)[0].slice(2, 6)).toEqual([
            [iso(t2), 1], [iso(t4), 1], [iso(t3), 1], [iso(t5), 1],
        ]);
    });

    // The trailing normal phase starts at the end of the first anomaly, not of the last one.
    it('starts the trailing normal phase at the end of the first anomaly', () => {
        const phases = phaseWindows({ d: [anomaly(t2, t3), anomaly(t4, t5)] }, earliest, now)[0];
        expect(phases.slice(-2)).toEqual([[iso(t3), 0], [iso(t6), 0]]);
    });

    it('starts with the anomaly when it began before the earliest start', () => {
        expect(phaseWindows({ d: [anomaly(t1 - 1000, t3)] }, earliest, now)[0][0]).toEqual([iso(t1 - 1000), 1]);
    });
});

describe('curveAnomaliesPerDevice', () => {
    it('keeps only the curve anomalies, keyed in device order', () => {
        const result = curveAnomaliesPerDevice({ b: [anomaly(t2, t3, 'extreme_value')], a: [anomaly(t2, t3), anomaly(t4, t5, 'freq')] }, ['a', 'b']);
        expect(Object.keys(result)).toEqual(['a', 'b']);
        expect(result['a'].length).toBe(1);
        expect(result['b']).toEqual([]);
    });
});

describe('phaseTimelineData', () => {
    it('wraps every device into a request with one column and keeps the device order', () => {
        const a = [[new Date(t1), 0], [iso(t6), 0]];
        const b = [[iso(t1 - 1000), 1], [iso(t6), 1]];
        const c = [[new Date(t1), 0], [iso(t2), 0]];
        expect(phaseTimelineData([a, b, c])).toEqual([[a], [b], [c]]);
    });
});

describe('anomaly phases on the timeline', () => {
    it('names the rows by device id and colours anomalies red and normal phases green', () => {
        const vAxes = phaseVAxes(['dev-1']);
        const data = phaseTimelineData(phaseWindows({ 'dev-1': [anomaly(t2, t3)] }, new Date(t1), new Date(t6)));
        const result = timelineSeries(data, vAxes);
        expect(result.data.map((s) => s.name)).toEqual(['auffaellig', 'normal']);
        expect(result.colors).toEqual(['#ff0000', '#008000']);
        expect(result.data.every((s) => s.data.every((bar) => bar.x === 'dev-1'))).toBeTrue();
    });

    // The phases are oldest first while the timeline expects newest first, so every bar runs backwards.
    it('hands the timeline bars whose start lies after their end', () => {
        const data = phaseTimelineData(phaseWindows({ 'dev-1': [anomaly(t2, t3)] }, new Date(t1), new Date(t6)));
        const result = timelineSeries(data, phaseVAxes(['dev-1']));
        expect(result.data[0].data).toEqual([{ x: 'dev-1', y: [t3, t2] }]);
        expect(result.data[1].data).toEqual([{ x: 'dev-1', y: [t2, t1] }, { x: 'dev-1', y: [t6, t3] }]);
    });
});
