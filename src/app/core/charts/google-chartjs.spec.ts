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

import { Chart, registerables } from 'chart.js';
import { darkened, fitLabel, googleFocusPlugin, googleFrame, googleLayout, googleSelection, valueAxisTicks, xAxisLayout } from './google-chartjs';
import { googleValueTicks } from './google-look';

describe('google chart frame', () => {
    it('pins chart.js to the chart area, half a pixel inside as Google mapped the values', () => {
        expect(googleLayout(googleFrame(605, 305, '90%', '80%')).padding).toEqual({ left: 30.5, top: 31.5, right: 30.5, bottom: 30.5 });
    });

    it('shows x labels only where the bottom margin holds them, as Google measured at 12px', () => {
        const frame = (margin: number) => ({ ...googleFrame(605, 305), area: { left: 61, top: margin, width: 484, height: 305 - 2 * margin } });
        expect([14, 16, 28].map((m) => xAxisLayout(frame(m), false).labels)).toEqual([false, true, true]);
        expect([28, 30].map((m) => xAxisLayout(frame(m), true).labels)).toEqual([false, true]);
        expect(xAxisLayout(frame(30), false).labelBaseline).toBeCloseTo(275 + 17.16, 1);
        expect(xAxisLayout(frame(16), false).labelBaseline).toBeCloseTo(305 - 3.84, 1);
        expect(xAxisLayout(frame(23), true).titleBaseline).toBeCloseTo(297.7, 1);
    });
});

describe('fitLabel', () => {
    it('wraps a label at its spaces, or cuts it with an ellipsis, when it is wider than the margin', () => {
        expect(fitLabel('0 %', 1000, 12)).toEqual(['0 %']);
        expect(fitLabel('20 %', 1, 12).length).toBe(1);
        const narrow = fitLabel('20 %', 20, 12);
        expect(narrow).toEqual(['20', '%']);
        expect(fitLabel('250.000', 20, 12)[0].endsWith('…')).toBeTrue();
    });
});

describe('google chart helpers', () => {
    it('darkens a column colour to 70% for labels above it', () => {
        expect(darkened('#4484ce')).toBe('#305c90');
    });

    it('turns value ticks into labelled major and unlabelled minor gridlines', () => {
        const ticks = valueAxisTicks(googleValueTicks(0, 7, 259), (v) => 'v' + v);
        expect(ticks.filter((t) => t.major).map((t) => t.label)).toEqual(['v0', 'v2', 'v4', 'v6', 'v8']);
        expect(ticks.filter((t) => !t.major).map((t) => [t.value, t.label])).toEqual([[1, ''], [3, ''], [5, ''], [7, '']]);
    });
});

describe('google selection', () => {
    let chart: Chart;
    let host: HTMLElement;

    beforeEach(() => {
        Chart.register(...registerables);
        const canvas = document.createElement('canvas');
        // chart.js only updates on a resize while its canvas is attached to the document
        host = document.createElement('div');
        host.style.cssText = 'width:300px;height:200px';
        host.appendChild(canvas);
        document.body.appendChild(host);
        chart = new Chart(canvas, {
            type: 'line',
            data: { datasets: [{ data: [1, 2, 3] }] },
            options: { animation: false, responsive: false },
            plugins: [googleFocusPlugin],
        });
        (chart as unknown as { $googleSelection: unknown[] }).$googleSelection = [{ datasetIndex: 0, index: 1 }];
    });

    afterEach(() => {
        chart.destroy();
        host.remove();
    });

    it('is cleared when the data or options are replaced, as Google clears its selection on draw', () => {
        expect(googleSelection(chart).length).toBe(1);
        chart.data.datasets = [{ data: [4, 5] }];
        chart.update();
        expect(googleSelection(chart)).toEqual([]);
    });

    it('is cleared when the chart is resized', () => {
        chart.resize(200, 100);
        expect(googleSelection(chart)).toEqual([]);
    });
});
