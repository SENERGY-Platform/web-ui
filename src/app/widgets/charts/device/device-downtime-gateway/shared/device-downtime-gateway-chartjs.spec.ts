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
import { downtimePerGatewayChart } from './device-downtime-gateway-chartjs';

describe('downtimePerGatewayChart', () => {
    const frame = googleFrame(605, 305, '90%', '80%');
    const chart = downtimePerGatewayChart([
        { name: 'Halle', failureRatio: 0.0298, label: '2.98%' },
        { name: 'Lager', failureRatio: 0.7143, label: '71.43%' },
        { name: 'Dach', failureRatio: null, label: '' },
    ], frame);
    const axes = (chart.options.plugins as any).googleAxes;

    it('draws one #4484ce column per gateway with its ratio, none for an unknown one', () => {
        expect(chart.data.labels).toEqual(['Halle', 'Lager', 'Dach']);
        expect(chart.data.datasets[0].data).toEqual([0.0298, 0.7143, null]);
        expect(chart.data.datasets[0].backgroundColor).toBe('#4484ce');
    });

    it('labels the columns with their percentage', () => {
        expect((chart.options.plugins as any).googleBarLabels.labels).toEqual(['2.98%', '71.43%', '']);
    });

    it('labels the value axis from 0 in the #.## % format', () => {
        expect(axes.y[0].ticks.filter((t: any) => t.major).map((t: any) => t.label)).toEqual(['0 %', '20 %', '40 %', '60 %', '80 %']);
    });

    it('names the gateways below the columns', () => {
        expect(axes.x.ticks.map((t: any) => t.label)).toEqual(['Halle', 'Lager', 'Dach']);
    });

    it('has no tooltip', () => {
        const external = (chart.options.plugins as any).tooltip.external;
        const parent = document.createElement('div');
        const canvas = document.createElement('canvas');
        parent.appendChild(canvas);
        external({ chart: { canvas, width: 605 }, tooltip: { opacity: 1, dataPoints: [{ dataIndex: 0, element: { x: 10, y: 10, base: 100, width: 20 } }] } });
        expect(parent.querySelector('svg')).toBeNull();
    });
});
