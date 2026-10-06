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
import { anomalyOfBar, curveAnomaliesPerDevice, phaseTimelineData, phaseVAxes, phaseWindows } from './anomaly-phases';

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
            [iso(t2), 1], [iso(t5), 1], [iso(t5), 0], [iso(t6), 0],
        ]);
    });

    // A nested anomaly ending first used to end the anomaly phase and start the trailing normal phase early.
    it('keeps a device anomalous until the latest end of anomalies lying within one another, whatever their order', () => {
        const expected = [[earliest, 0], [iso(t2), 0], [iso(t2), 1], [iso(t5), 1], [iso(t5), 0], [iso(t6), 0]];
        expect(phaseWindows({ d: [anomaly(t2, t5), anomaly(t3, t4)] }, earliest, now)[0]).toEqual(expected);
        expect(phaseWindows({ d: [anomaly(t3, t4), anomaly(t2, t5)] }, earliest, now)[0]).toEqual(expected);
    });

    it('sorts anomalies detected out of order by their start', () => {
        expect(phaseWindows({ d: [anomaly(t4, t5), anomaly(t2, t3)] }, earliest, now)[0].slice(2, 8)).toEqual([
            [iso(t2), 1], [iso(t3), 1], [iso(t3), 0], [iso(t4), 0], [iso(t4), 1], [iso(t5), 1],
        ]);
    });

    // SNRGY-4848: the trailing normal phase started at the end of the first anomaly.
    it('starts the trailing normal phase at the end of the last anomaly', () => {
        const phases = phaseWindows({ d: [anomaly(t2, t3), anomaly(t4, t5)] }, earliest, now)[0];
        expect(phases.slice(-2)).toEqual([[iso(t5), 0], [iso(t6), 0]]);
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
    // SNRGY-4848: the phases went to the timeline oldest first, and a sort comparing arrays reordered nothing.
    it('wraps every device into a request of its own, in device order, with the phase bounds newest first', () => {
        const a = [[new Date(t1), 0], [iso(t6), 0]];
        const b = [[iso(t1 - 1000), 1], [iso(t6), 1]];
        const c = [[new Date(t1), 0], [iso(t2), 0]];
        expect(phaseTimelineData([a, b, c])).toEqual([[[a[1], a[0]]], [[b[1], b[0]]], [[c[1], c[0]]]]);
    });

    it('leaves the given phases alone', () => {
        const a = [[new Date(t1), 0], [iso(t6), 0]];
        phaseTimelineData([a]);
        expect(a[0]).toEqual([new Date(t1), 0]);
    });
});

describe('anomaly phases on the timeline', () => {
    it('names the rows by device id and colours anomalies red and normal phases green', () => {
        const vAxes = phaseVAxes(['dev-1']);
        const data = phaseTimelineData(phaseWindows({ 'dev-1': [anomaly(t2, t3)] }, new Date(t1), new Date(t6)));
        const result = timelineSeries(data, vAxes);
        expect(result.map((s) => [s.name, s.color])).toEqual([['auffaellig', '#ff0000'], ['normal', '#008000']]);
        expect(result.every((s) => s.bars.every((bar) => bar.row === 'dev-1'))).toBeTrue();
    });

    // SNRGY-4848: every bar used to run backwards, from its end to its start.
    it('draws every phase from its start to its end', () => {
        const data = phaseTimelineData(phaseWindows({ 'dev-1': [anomaly(t2, t3), anomaly(t4, t5)] }, new Date(t1), new Date(t6)));
        const result = timelineSeries(data, phaseVAxes(['dev-1']));
        expect(result.find((s) => s.name === 'auffaellig')!.bars).toEqual([{ row: 'dev-1', start: t4, end: t5 }, { row: 'dev-1', start: t2, end: t3 }]);
        expect(result.find((s) => s.name === 'normal')!.bars).toEqual([
            { row: 'dev-1', start: t5, end: t6 }, { row: 'dev-1', start: t3, end: t4 }, { row: 'dev-1', start: t1, end: t2 },
        ]);
    });

    it('draws overlapping anomalies as one bar', () => {
        const data = phaseTimelineData(phaseWindows({ 'dev-1': [anomaly(t2, t4), anomaly(t3, t5)] }, new Date(t1), new Date(t6)));
        const result = timelineSeries(data, phaseVAxes(['dev-1']));
        expect(result.find((s) => s.name === 'auffaellig')!.bars).toEqual([{ row: 'dev-1', start: t2, end: t5 }]);
    });
});

describe('anomalyOfBar', () => {
    const first = anomaly(t2, t3);
    const second = anomaly(t4, t5);

    // SNRGY-4848: a click always opened the first anomaly of the device.
    it('is the anomaly within the clicked anomaly bar', () => {
        expect(anomalyOfBar([first, second], { seriesName: 'auffaellig', row: 'd', start: t4, end: t5 })).toBe(second);
        expect(anomalyOfBar([first, second], { seriesName: 'auffaellig', row: 'd', start: t2, end: t3 })).toBe(first);
    });

    it('is the first anomaly by start of a bar merged from overlapping or nested ones', () => {
        expect(anomalyOfBar([anomaly(t2, t4), anomaly(t3, t5)], { seriesName: 'auffaellig', row: 'd', start: t2, end: t5 })?.start_time).toBe(iso(t2));
        expect(anomalyOfBar([anomaly(t3, t4), anomaly(t2, t5)], { seriesName: 'auffaellig', row: 'd', start: t2, end: t5 })?.start_time).toBe(iso(t2));
    });

    it('is undefined for a normal phase', () => {
        expect(anomalyOfBar([first, second], { seriesName: 'normal', row: 'd', start: t1, end: t6 })).toBeUndefined();
    });
});
