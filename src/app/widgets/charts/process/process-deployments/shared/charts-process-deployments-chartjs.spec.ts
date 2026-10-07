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
import { deploymentsChart } from './charts-process-deployments-chartjs';

describe('deploymentsChart', () => {
    const frame = googleFrame(605, 305, '90%', '90%');
    const days = [{ date: new Date(2026, 9, 1), count: 1 }, { date: new Date(2026, 9, 2), count: 2 }, { date: new Date(2026, 9, 5), count: 5 }];
    const chart = deploymentsChart(days, frame);
    const plugins = chart.options.plugins as any;

    it('draws one #4484ce column per day at its local midnight, days without instances left empty', () => {
        expect(chart.data.datasets[0].data).toEqual(days.map((d) => ({ x: d.date.getTime(), y: d.count })));
        expect(chart.data.datasets[0].backgroundColor).toBe('#4484ce');
    });

    it('leaves half the shortest distance of days as room before the first and after the last day', () => {
        const x = (chart.options.scales as any).x;
        expect([x.min, x.max]).toEqual([days[0].date.getTime() - 43200000, days[2].date.getTime() + 43200000]);
    });

    it('labels the value axis from 0 with whole counts', () => {
        expect(plugins.googleAxes.y[0].ticks.filter((t: any) => t.major).map((t: any) => t.label)).toEqual(['0', '1', '2', '3', '4', '5']);
    });

    it('shows the date and the count in the tooltip', () => {
        const parent = document.createElement('div');
        const canvas = document.createElement('canvas');
        parent.appendChild(canvas);
        plugins.tooltip.external({
            chart: { canvas, width: 605, chartArea: { left: 30, right: 575 } },
            tooltip: { opacity: 1, dataPoints: [{ dataIndex: 2, element: { x: 536, y: 16, base: 289, width: 48 } }] },
        });
        expect(Array.from(parent.querySelectorAll('svg text')).map((t) => t.textContent)).toEqual([days[2].date.toLocaleDateString(), 'count: 5']);
    });
});
