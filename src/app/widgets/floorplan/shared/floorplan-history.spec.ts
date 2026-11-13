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

import { fpCriteriaConnectionStatus, FloorplanWidgetCapabilityModel } from './floorplan.model';
import {
    durationMillis,
    frameTimes,
    groupTypeFor,
    historyFrames,
    historyRequest,
    HistoryRequest,
    replayable,
} from './floorplan-history';

const MIN = 60 * 1000;

function placement(over: Partial<FloorplanWidgetCapabilityModel> = {}): FloorplanWidgetCapabilityModel {
    return {
        alias: 'Room',
        deviceGroupId: 'group-1',
        criteria: { function_id: 'fn-temp', interaction: 'event', aspect_id: 'a', device_class_id: 'c' },
        coloring: [{ value: 20, icon: 'circle', color: '#f00', showValue: false, showValueWhenZoomed: false }],
        position: { x: 0.5, y: 0.5 },
        ...over,
    } as FloorplanWidgetCapabilityModel;
}

describe('durationMillis', () => {
    it('reads every unit the wrapper knows', () => {
        expect(durationMillis('500ms')).toBe(500);
        expect(durationMillis('30s')).toBe(30000);
        expect(durationMillis('5m')).toBe(5 * MIN);
        expect(durationMillis('6h')).toBe(6 * 60 * MIN);
        expect(durationMillis('1d')).toBe(24 * 60 * MIN);
        expect(durationMillis('2w')).toBe(14 * 24 * 60 * MIN);
    });

    it('answers 0 for anything that is not a duration', () => {
        ['', 'abc', '5', 'm', '5x', '-5m', '1.5h', '5m extra'].forEach(text => expect(durationMillis(text)).toBe(0, text));
    });
});

describe('frameTimes', () => {
    const now = new Date(Date.UTC(2026, 10, 13, 12, 37, 42));

    it('rounds the newest moment down to a multiple of the step and ends there', () => {
        const times = frameTimes('1h', '5m', now);

        expect(times[times.length - 1].toISOString()).toBe('2026-11-13T12:35:00.000Z');
    });

    it('lists ceil(window / step) moments, ascending, one step apart', () => {
        const times = frameTimes('1h', '25m', now);

        expect(times.length).toBe(3);
        times.slice(1).forEach((t, i) => expect(t.getTime() - times[i].getTime()).toBe(25 * MIN));
    });

    it('holds at least one moment when the window is shorter than the step', () => {
        expect(frameTimes('1m', '5m', now).length).toBe(1);
    });

    it('is empty when window or step are not durations', () => {
        expect(frameTimes('', '5m', now)).toEqual([]);
        expect(frameTimes('1h', 'x', now)).toEqual([]);
    });
});

describe('replayable', () => {
    it('needs a device group and a measuring criteria', () => {
        expect(replayable(placement())).toBeTrue();
        expect(replayable(placement({ deviceGroupId: null }))).toBeFalse();
        expect(replayable(placement({ criteria: { function_id: '' } as any }))).toBeFalse();
    });

    it('excludes the connection status, which is no measurement', () => {
        expect(replayable(placement({ criteria: { function_id: fpCriteriaConnectionStatus } as any }))).toBeFalse();
    });
});

describe('groupTypeFor', () => {
    it('averages when every colouring step is a number', () => {
        expect(groupTypeFor(placement())).toBe('mean');
    });

    it('takes the last value for text steps, mixed steps and no colouring at all', () => {
        const step = (value: number | string) => ({ value, icon: 'x', color: '#000', showValue: false, showValueWhenZoomed: false });

        expect(groupTypeFor(placement({ coloring: [step('on'), step('off')] }))).toBe('last');
        expect(groupTypeFor(placement({ coloring: [step(1), step('off')] }))).toBe('last');
        expect(groupTypeFor(placement({ coloring: [] }))).toBe('last');
    });
});

describe('historyRequest', () => {
    const now = new Date(Date.UTC(2026, 10, 13, 12, 37, 42));

    it('builds a grouped element and a start value element per replayable placement, in order', () => {
        const request = historyRequest([placement(), placement({ deviceGroupId: 'group-2' })], '6h', '5m', now);

        expect(request.placementOfElement).toEqual([0, 0, 1, 1]);
        expect(request.elements[0].deviceGroupId).toBe('group-1');
        expect(request.elements[0].groupTime).toBe('5m');
        expect(request.elements[0].columns[0].groupType).toBe('mean');
        expect(request.elements[1].groupTime).toBeUndefined();
        expect(request.elements[1].columns[0].groupType).toBeUndefined();
        expect(request.elements[2].deviceGroupId).toBe('group-2');
    });

    it('asks for the newest value before the first moment, newest first', () => {
        const element = historyRequest([placement()], '1h', '5m', now).elements[1];

        expect(element.time).toEqual({ start: '1970-01-01T00:00:00Z', end: '2026-11-13T11:40:00.000Z' });
        expect(element.limit).toBe(1);
        expect(element.orderColumnIndex).toBe(0);
        expect(element.orderDirection).toBe('desc');
    });

    it('builds nothing for a placement that cannot be replayed and keeps the indices of the others', () => {
        const request = historyRequest(
            [placement({ criteria: { function_id: fpCriteriaConnectionStatus } as any }), placement({ deviceGroupId: null }), placement()],
            '1h', '5m', now,
        );

        expect(request.elements.length).toBe(2);
        expect(request.placementOfElement).toEqual([2, 2]);
    });

    it('leaves the last known value of the criteria out of the elements', () => {
        const withValue = placement({ criteria: { function_id: 'fn-temp', value: { status_code: 200 } } as any });
        const request = historyRequest([withValue], '1h', '5m', now);

        request.elements.forEach(e => expect('value' in (e.columns[0].criteria as object)).toBeFalse());
    });

    it('never sets an empty groupType', () => {
        const request = historyRequest([placement(), placement({ coloring: [] })], '1h', '5m', now);

        request.elements.forEach(e => e.columns.forEach(c => {
            if ('groupType' in c) {
                expect(c.groupType).toBeTruthy();
                expect(e.groupTime).toBeTruthy();
            }
        }));
        expect(request.elements.filter(e => e.groupTime).length).toBe(2);
    });
});

describe('historyFrames', () => {
    const times = [0, 5, 10, 15].map(m => new Date(Date.UTC(2026, 0, 1, 0, m)));
    const at = (m: number) => new Date(Date.UTC(2026, 0, 1, 0, m)).toISOString();
    const request: HistoryRequest = { elements: [], placementOfElement: [0, 0, 1, 1] };

    it('carries the last value over gaps', () => {
        const frames = historyFrames([{ requestIndex: 0, deviceId: 'd', data: [[[at(5), 21]]] }], request, times, 2);

        expect(frames.map(f => f.values[0])).toEqual([undefined, 21, 21, 21]);
    });

    it('starts from the value before the window', () => {
        const frames = historyFrames([
            { requestIndex: 0, deviceId: 'd', data: [[[at(10), 22]]] },
            { requestIndex: 1, deviceId: 'd', data: [[['2025-12-31T08:00:00Z', 18]]] },
        ], request, times, 2);

        expect(frames.map(f => f.values[0])).toEqual([18, 18, 22, 22]);
    });

    it('assigns entries by requestIndex whatever the order of the answer', () => {
        const frames = historyFrames([
            { requestIndex: 3, deviceId: 'd', data: [[['2025-12-31T08:00:00Z', 'B-old']]] },
            { requestIndex: 2, deviceId: 'd', data: [[[at(5), 'B']]] },
            { requestIndex: 0, deviceId: 'd', data: [[[at(0), 'A']]] },
        ], request, times, 2);

        expect(frames[0].values).toEqual(['A', 'B-old']);
        expect(frames[1].values).toEqual(['A', 'B']);
    });

    it('skips a requestIndex that does not exist', () => {
        const frames = historyFrames([{ requestIndex: 9, deviceId: 'd', data: [[[at(0), 1]]] }], request, times, 2);

        expect(frames.every(f => f.values.every(v => v === undefined))).toBeTrue();
        expect(Object.keys(frames[0].values).length).toBe(2);
    });

    it('gives several devices as an array ordered by device id, once each has a value', () => {
        const frames = historyFrames([
            { requestIndex: 0, deviceId: 'b', data: [[[at(0), 2]]] },
            { requestIndex: 0, deviceId: 'a', data: [[[at(5), 1]]] },
        ], request, times, 2);

        expect(frames[0].values[0]).toBe(2);
        expect(frames[1].values[0]).toEqual([1, 2]);
    });

    it('sorts the rows of a device and treats a missing deviceId as one device', () => {
        const frames = historyFrames([
            { requestIndex: 0, data: [[[at(10), 3], [at(0), 1]]] },
            { requestIndex: 1, data: [[['2025-12-31T00:00:00Z', 0]]] },
        ], request, times, 2);

        expect(frames.map(f => f.values[0])).toEqual([1, 1, 3, 3]);
    });

    it('treats null as no value', () => {
        const frames = historyFrames([{ requestIndex: 0, deviceId: 'd', data: [[[at(0), 4], [at(5), null]]] }], request, times, 2);

        expect(frames.map(f => f.values[0])).toEqual([4, 4, 4, 4]);
    });

    it('keeps one value per placement and leaves placements without data undefined', () => {
        const frames = historyFrames([{ requestIndex: 0, deviceId: 'd', data: [[[at(0), 1]]] }], request, times, 3);

        frames.forEach(f => {
            expect(f.values.length).toBe(3);
            expect(f.values[1]).toBeUndefined();
            expect(f.values[2]).toBeUndefined();
        });
    });
});
