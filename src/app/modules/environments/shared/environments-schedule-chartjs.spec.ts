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

import { scheduleChartConfig, scheduleTooltipView } from './environments-schedule-chartjs';
import { schedulePreview } from './environments-schedule-preview';

const preview = schedulePreview({ states: [{ name: 'idle', duration_seconds: 600, value: 0 }, { name: 'run', duration_seconds: 300, value: 15 }] })!;

describe('scheduleChartConfig', () => {
    it('draws every block as a blue bar from its start to its end in ms, in the row of its state', () => {
        const config = scheduleChartConfig(preview);
        expect(config.data.labels).toEqual(['idle', 'run']);
        const dataset = config.data.datasets[0];
        expect(dataset.data.length).toBe(6);
        expect(dataset.data[0]).toEqual({ x: [0, 600000], y: 'idle' });
        expect(dataset.data[1]).toEqual({ x: [600000, 900000], y: 'run' });
        expect(dataset.backgroundColor).toBe('rgba(0, 143, 251, 0.85)');
    });

    it('labels the time axis with the elapsed time of the millisecond tick value', () => {
        const callback = (scheduleChartConfig(preview).options.scales?.['x']?.ticks as any).callback;
        expect(callback.call({}, 5400000, 0, [])).toBe('1:30');
        expect(callback.call({}, 0, 0, [])).toBe('0:00');
    });
});

describe('scheduleTooltipView', () => {
    it('names the series above the state and its elapsed start and end', () => {
        expect(scheduleTooltipView(preview, [{ raw: { x: [600000, 900000], y: 'run' } } as any])).toEqual({
            range: { name: 'Schedule', color: 'rgba(0, 143, 251, 0.85)', category: 'run', start: '0:10', end: '0:15' },
        });
    });
});
