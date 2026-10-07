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

import { googleFrame } from 'src/app/core/charts/google-chartjs';
import { totalDowntimeChart } from './device-total-downtime-chartjs';

describe('totalDowntimeChart', () => {
    const frame = googleFrame(605, 305, '90%', '90%');
    const at = (h: number, m: number) => new Date(2026, 9, 5, h, m);
    const chart = totalDowntimeChart([
        { from: at(0, 0), to: at(0, 15), failureRatio: 1 / 3 },
        { from: at(0, 15), to: at(0, 30), failureRatio: null },
    ], frame);
    const plugins = chart.options.plugins as any;

    it('draws the steps as #4484ce area with a gap for an interval without ratio', () => {
        expect(chart.data.datasets[0].data).toEqual([
            { x: at(0, 0).getTime(), y: 1 / 3 }, { x: at(0, 15).getTime(), y: 1 / 3 }, { x: at(0, 15).getTime(), y: null }, { x: at(0, 30).getTime(), y: null },
        ]);
        expect(chart.data.datasets[0].borderColor).toBe('#4484ce');
        expect((chart.data.datasets[0] as any).fill).toBe('origin');
        expect((chart.data.datasets[0] as any).spanGaps).toBeFalse();
    });

    it('labels the value axis from 0 in the #.## % format and the time axis HH:mm', () => {
        expect(plugins.googleAxes.y[0].ticks.filter((t: any) => t.major).map((t: any) => t.label)).toEqual(['0 %', '10 %', '20 %', '30 %', '40 %']);
        expect(plugins.googleAxes.x.dateFormat(at(9, 5))).toBe('09:05');
    });

    it('zooms by dragging along x, at most to a thousandth of the day so far', () => {
        expect(plugins.zoom.zoom.drag.enabled).toBeTrue();
        expect(plugins.zoom.limits.x).toEqual({ min: at(0, 0).getTime(), max: at(0, 30).getTime(), minRange: 1800 });
    });

    it('shows the time and the ratio of the hovered step end', () => {
        const parent = document.createElement('div');
        const canvas = document.createElement('canvas');
        parent.appendChild(canvas);
        plugins.tooltip.external({ chart: { canvas, width: 605 }, tooltip: { opacity: 1, dataPoints: [{ datasetIndex: 0, dataIndex: 1, element: { x: 300, y: 100 } }] } });
        expect(Array.from(parent.querySelectorAll('svg text')).map((t) => t.textContent))
            .toEqual([at(0, 15).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 'failure ratio: 33.33%']);
    });
});
