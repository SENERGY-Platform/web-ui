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

import { ResourceHistoricalConnectionStatesModelV2 } from '../../../../../modules/devices/device-instances/shared/device-instances-history.model';
import { ConnectionTimeline, failureRatioIntervals, failureRatioPoints, failureRatioTooltip, toConnectionTimelines } from './device-total-downtime-chart';

// local wall-clock times, so the interval layout does not depend on the time zone the suite runs in
function today(h: number, m: number, s = 0): Date {
    return new Date(2026, 9, 5, h, m, s);
}

function secs(d: Date): number {
    return d.getTime() / 1000;
}

describe('toConnectionTimelines', () => {
    it('starts at since with prev_state and lists every change in unix seconds', () => {
        const since = today(0, 0);
        const histories = new Map<string, ResourceHistoricalConnectionStatesModelV2[]>([
            ['d1', [{ id: 'd1', next_state: null, prev_state: { connected: true, time: '' }, states: [{ connected: false, time: today(0, 30).toISOString() }] }]],
            ['d2', [{ id: 'd2', next_state: null, prev_state: null, states: null }]],
            ['d3', [{ id: 'd3', next_state: null, prev_state: null, states: [{ connected: true, time: today(0, 40).toISOString() }] }]],
        ]);
        expect(toConnectionTimelines(histories, since)).toEqual([
            [[secs(since), true], [secs(today(0, 30)), false]],
            [[secs(today(0, 40)), true]],
        ]);
    });
});

describe('failureRatioIntervals', () => {
    const midnight = today(0, 0);

    it('splits the day into 15 minute intervals counted back from now, oldest first', () => {
        const timelines: ConnectionTimeline[] = [[[secs(midnight), true], [secs(today(0, 30)), false]]];
        const intervals = failureRatioIntervals(timelines, today(1, 0));
        expect(intervals.map((i) => [i.from, i.to])).toEqual([
            [today(0, 0), today(0, 15)],
            [today(0, 15), today(0, 30)],
            [today(0, 30), today(0, 45)],
            [today(0, 45), today(1, 0)],
        ]);
        expect(intervals.map((i) => i.failureRatio)).toEqual([0, 0, 1, 1]);
    });

    it('stretches the oldest interval back to midnight when now is not on a quarter hour', () => {
        const timelines: ConnectionTimeline[] = [[[secs(midnight), true]]];
        const intervals = failureRatioIntervals(timelines, today(0, 20));
        expect(intervals.map((i) => [i.from, i.to])).toEqual([
            [today(0, 0), today(0, 5)],
            [today(0, 5), today(0, 20)],
        ]);
    });

    // SNRGY-4848 item 3: the oldest interval used to start at midnight plus the seconds of now.
    it('starts the oldest interval at midnight exactly', () => {
        const intervals = failureRatioIntervals([[[secs(midnight), true]]], new Date(2026, 9, 5, 1, 0, 30, 250));
        expect(intervals[0].from).toEqual(today(0, 0));
        expect(intervals[intervals.length - 1].to).toEqual(new Date(2026, 9, 5, 1, 0, 30, 250));
    });

    it('averages over all devices', () => {
        const timelines: ConnectionTimeline[] = [[[secs(midnight), true]], [[secs(midnight), false]]];
        const intervals = failureRatioIntervals(timelines, today(0, 30));
        expect(intervals.map((i) => i.failureRatio)).toEqual([0.5, 0.5]);
    });

    // SNRGY-4848 item 3: an interval without data used to get the ratio NaN.
    it('has no ratio for an interval no device reported anything for', () => {
        const timelines: ConnectionTimeline[] = [[[secs(today(0, 20)), false]]];
        const intervals = failureRatioIntervals(timelines, today(0, 30));
        expect(intervals[0].failureRatio).toBeNull();
        expect(intervals[1].failureRatio).toBe(1);
    });

    it('covers a partially reported interval only with the reported time', () => {
        const timelines: ConnectionTimeline[] = [[[secs(midnight), true], [secs(today(0, 5)), false]]];
        const intervals = failureRatioIntervals(timelines, today(0, 15));
        expect(intervals.length).toBe(1);
        expect(intervals[0].failureRatio).toBeCloseTo(10 / 15, 12);
    });

    // SNRGY-4848 item 3: in the first minute after midnight the widget used to throw a TypeError.
    it('has one interval from midnight in the first minute of the day', () => {
        const intervals = failureRatioIntervals([[[secs(midnight), false]]], today(0, 0, 30));
        expect(intervals).toEqual([{ from: today(0, 0), to: today(0, 0, 30), failureRatio: 1 }]);
    });

    it('has no interval right at midnight', () => {
        expect(failureRatioIntervals([[[secs(midnight), true]]], today(0, 0))).toEqual([]);
    });

    it('keeps every interval within the day when the clocks change', () => {
        // spring forward in central Europe: the clock jumps from 02:00 to 03:00
        const now = new Date(2026, 2, 29, 3, 30);
        const dayStart = new Date(2026, 2, 29);
        const intervals = failureRatioIntervals([[[secs(dayStart), true]]], now);
        expect(intervals.length).toBe(Math.ceil((now.getTime() - dayStart.getTime()) / 900000));
        expect(intervals[0].from).toEqual(dayStart);
        expect(intervals.every((i) => i.from.getTime() <= i.to.getTime())).toBeTrue();
    });

    it('never counts negative time for changes stamped after now', () => {
        const intervals = failureRatioIntervals([[[secs(midnight), true], [secs(today(0, 40)), false]]], today(0, 30));
        expect(intervals.map((i) => i.failureRatio)).toEqual([0, 0]);
    });
});

describe('failureRatioTooltip', () => {
    it('shows the time and the ratio as percentage with up to 2 decimals', () => {
        expect(failureRatioTooltip(today(9, 45), 0.125, 'de-DE')).toBe('09:45\nfailure ratio: 12.5%');
        expect(failureRatioTooltip(today(9, 45), 1 / 3, 'de-DE')).toBe('09:45\nfailure ratio: 33.33%');
        expect(failureRatioTooltip(today(21, 5), 0, 'en-US')).toBe('09:05 PM\nfailure ratio: 0%');
    });

    it('formats the time in the browser locale by default', () => {
        const expected = today(9, 45).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        expect(failureRatioTooltip(today(9, 45), 0.5)).toBe(expected + '\nfailure ratio: 50%');
    });

});

describe('failureRatioPoints', () => {
    it('draws each interval as a flat step, a gap where it has no ratio', () => {
        expect(failureRatioPoints([
            { from: today(0, 0), to: today(0, 15), failureRatio: 0.25 },
            { from: today(0, 15), to: today(0, 30), failureRatio: null },
        ])).toEqual([
            { x: today(0, 0).getTime(), y: 0.25 }, { x: today(0, 15).getTime(), y: 0.25 },
            { x: today(0, 15).getTime(), y: null }, { x: today(0, 30).getTime(), y: null },
        ]);
    });
});
