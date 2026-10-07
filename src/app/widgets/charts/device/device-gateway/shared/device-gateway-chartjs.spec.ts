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
import { devicesPerGatewayChart } from './device-gateway-chartjs';

describe('devicesPerGatewayChart', () => {
    const frame = googleFrame(605, 305, '90%', '80%');
    const chart = devicesPerGatewayChart([{ name: 'Hub A', count: 7 }, { name: 'Hub B', count: 0 }, { name: 'Hub C', count: 4 }], frame);
    const plugins = chart.options.plugins as any;

    it('draws one #4484ce column per gateway labelled with its count', () => {
        expect(chart.data.labels).toEqual(['Hub A', 'Hub B', 'Hub C']);
        expect(chart.data.datasets[0].data).toEqual([7, 0, 4]);
        expect(chart.data.datasets[0].backgroundColor).toBe('#4484ce');
        expect(plugins.googleBarLabels.labels).toEqual(['7', '0', '4']);
    });

    it('labels the value axis from 0 in steps Google chose for the height', () => {
        expect(plugins.googleAxes.y[0].ticks.filter((t: any) => t.major).map((t: any) => t.label)).toEqual(['0', '2', '4', '6', '8']);
    });

    it('shows the gateway in bold and its count in the tooltip', () => {
        const parent = document.createElement('div');
        const canvas = document.createElement('canvas');
        parent.appendChild(canvas);
        plugins.tooltip.external({
            chart: { canvas, width: 605, chartArea: { left: 30, right: 575 } },
            tooltip: { opacity: 1, dataPoints: [{ dataIndex: 0, element: { x: 98, y: 62, base: 274, width: 86 } }] },
        });
        const texts = Array.from(parent.querySelectorAll('svg text')).map((t) => t.textContent);
        expect(texts).toEqual(['Hub A', 'Count: 7']);
        expect(parent.querySelector('svg text tspan')?.getAttribute('font-weight')).toBe('bold');
    });
});
