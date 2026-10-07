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

import { pvPredictionChart, pvPredictionFrame } from './pv-prediction-chartjs';

describe('pvPredictionChart', () => {
    const t = (h: number) => new Date(Date.UTC(2026, 9, 5, h));
    const chart = pvPredictionChart([{ time: t(2), value: 3200 }, { time: t(1), value: 0 }]);
    const plugins = chart.options.plugins as any;

    it('draws the predictions in time order as one line "energy" in #3366cc, 400x200 as Google defaulted', () => {
        expect(chart.data.datasets[0].label).toBe('energy');
        expect(chart.data.datasets[0].data).toEqual([{ x: t(1).getTime(), y: 0 }, { x: t(2).getTime(), y: 3200 }]);
        expect(chart.data.datasets[0].borderColor).toBe('#3366cc');
        expect([pvPredictionFrame.width, pvPredictionFrame.height]).toEqual([400, 200]);
    });

    it('titles the value axis and labels it in German digits', () => {
        expect(plugins.googleAxes.y[0].title).toBe('Average Power in W');
        expect(plugins.googleAxes.y[0].ticks.filter((tick: any) => tick.major).map((tick: any) => tick.label)).toEqual(['0', '2.000', '4.000']);
    });

    it('shows the date in bold and the value in the tooltip', () => {
        const parent = document.createElement('div');
        const canvas = document.createElement('canvas');
        parent.appendChild(canvas);
        plugins.tooltip.external({ chart: { canvas, width: 400 }, tooltip: { opacity: 1, dataPoints: [{ datasetIndex: 0, dataIndex: 1, element: { x: 300, y: 100 } }] } });
        expect(Array.from(parent.querySelectorAll('svg text')).map((x) => x.textContent)).toEqual([
            new Date(t(2)).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' + new Date(t(2)).toLocaleTimeString('de-DE'),
            'energy: 3.200',
        ]);
    });
});
