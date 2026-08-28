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

import { schedulePreviewBlocks, scheduleChartOptions } from './environments-schedule-preview';
import { ScheduleSource } from './environments.model';

describe('schedulePreviewBlocks', () => {
    it('lays out the first cycle back to back from t=0', () => {
        const schedule: ScheduleSource = {
            states: [
                { name: 'idle', duration_seconds: 600, value: 0 },
                { name: 'run', duration_seconds: 300, value: 15 },
            ],
        };
        const blocks = schedulePreviewBlocks(schedule);
        expect(blocks.slice(0, 2)).toEqual([
            { name: 'idle', startSeconds: 0, endSeconds: 600, value: 0 },
            { name: 'run', startSeconds: 600, endSeconds: 900, value: 15 },
        ]);
    });

    it('repeats the cycle up to 3 times while the programme stays inside 24h', () => {
        const schedule: ScheduleSource = {
            states: [
                { name: 'idle', duration_seconds: 600, value: 0 },
                { name: 'run', duration_seconds: 300, value: 15 },
            ],
        };
        const blocks = schedulePreviewBlocks(schedule);
        // 900s per cycle, well under 24h -> the 3-cycle cap applies, 6 blocks total
        expect(blocks.length).toBe(6);
        expect(blocks[4]).toEqual({ name: 'idle', startSeconds: 1800, endSeconds: 2400, value: 0 });
        expect(blocks[5]).toEqual({ name: 'run', startSeconds: 2400, endSeconds: 2700, value: 15 });
    });

    it('caps at 24h between whole cycles, without starting a cycle that would begin past it', () => {
        const schedule: ScheduleSource = {
            states: [{ name: 'run', duration_seconds: 10 * 3600, value: 5 }], // 10h per cycle
        };
        const blocks = schedulePreviewBlocks(schedule);
        // A 3rd whole cycle would end at 30h, past the 24h window, so only 2 cycles (20h) are laid out.
        expect(blocks.length).toBe(2);
        expect(blocks[1]).toEqual({ name: 'run', startSeconds: 36000, endSeconds: 72000, value: 5 });
    });

    it('still lays out one full cycle even when it alone exceeds 24h -- never truncates a block', () => {
        const schedule: ScheduleSource = {
            states: [{ name: 'long-run', duration_seconds: 30 * 3600, value: 5 }], // 30h
        };
        const blocks = schedulePreviewBlocks(schedule);
        expect(blocks).toEqual([{ name: 'long-run', startSeconds: 0, endSeconds: 108000, value: 5 }]);
    });

    it('returns an empty array for a schedule with no states', () => {
        expect(schedulePreviewBlocks({})).toEqual([]);
        expect(schedulePreviewBlocks({ states: [] })).toEqual([]);
    });

    it('drops states with zero or negative duration instead of looping forever', () => {
        const schedule: ScheduleSource = {
            states: [
                { name: 'stuck', duration_seconds: 0, value: 1 },
                { name: 'also-stuck', duration_seconds: -5, value: 1 },
                { name: 'run', duration_seconds: 60, value: 5 },
            ],
        };
        const blocks = schedulePreviewBlocks(schedule);
        expect(blocks.every((b) => b.name !== 'stuck' && b.name !== 'also-stuck')).toBe(true);
        expect(blocks.length).toBeGreaterThan(0);
    });

    it('returns an empty array when every state has a non-positive duration', () => {
        const schedule: ScheduleSource = { states: [{ name: 'stuck', duration_seconds: 0, value: 1 }] };
        expect(schedulePreviewBlocks(schedule)).toEqual([]);
    });
});

describe('scheduleChartOptions', () => {
    it('builds a rangeBar series with one entry per laid-out block', () => {
        const schedule: ScheduleSource = {
            states: [
                { name: 'idle', duration_seconds: 600, value: 0 },
                { name: 'run', duration_seconds: 300, value: 15 },
            ],
        };
        const options = scheduleChartOptions(schedule);
        expect(options).toBeDefined();
        expect(options!.chart.type).toBe('rangeBar');
        const data = options!.series[0].data as { x: string; y: number[] }[];
        expect(data.length).toBe(6); // 3 cycles x 2 states
        expect(data[0]).toEqual({ x: 'idle', y: [0, 600000] });
        expect(data[1]).toEqual({ x: 'run', y: [600000, 900000] });
    });

    it('is undefined when there is nothing to lay out', () => {
        expect(scheduleChartOptions({})).toBeUndefined();
        expect(scheduleChartOptions({ states: [{ name: 'stuck', duration_seconds: 0, value: 1 }] })).toBeUndefined();
    });
});
