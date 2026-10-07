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
import { googleFocusPlugin } from 'src/app/core/charts/google-chartjs';
import {
    annotationAxesPlugin, annotationHoverPlugin, annotationLayout, annotationLegend, annotationMainConfig, annotationRange, annotationTimeTicks,
    annotationValueTicks, dragWindow, nearestTime, pointsAt,
} from './annotation-chart';

describe('annotation chart', () => {
    const t = (h: number, m = 0) => new Date(2026, 9, 5, h, m).getTime();
    const series = [
        { label: 'Temperatur', color: '#e91e63', points: [{ x: t(0), y: 18.04 }, { x: t(1), y: 21 }] },
        { label: 'Feuchte', color: '#2196f3', points: [{ x: t(0), y: 67 }, { x: t(1), y: 47.95 }] },
    ];

    it('splits the bordered box into legend, chart and navigator as Google did', () => {
        const layout = annotationLayout(1165, 645);
        expect([layout.width, layout.height, layout.chartHeight]).toEqual([1163, 643, 578]);
        expect(layout.area).toEqual({ left: 7, top: 7, right: 1156, bottom: 558 });
    });

    it('shows the exact values and the time of the hovered point in the legend', () => {
        expect(annotationLegend(series)).toEqual({ entries: [{ label: 'Temperatur', color: '#e91e63' }, { label: 'Feuchte', color: '#2196f3' }] });
        expect(annotationLegend(series, t(1))).toEqual({
            entries: [{ label: 'Temperatur', color: '#e91e63', value: '21' }, { label: 'Feuchte', color: '#2196f3', value: '47.95' }],
            date: '05.10.2026 01:00:00',
        });
    });

    it('starts at zoomStart within the range and ends at the last value', () => {
        expect(annotationRange(series, t(0, 30))).toEqual({ min: t(0), max: t(1), from: t(0, 30), to: t(1) });
        expect(annotationRange(series)).toEqual({ min: t(0), max: t(1), from: t(0), to: t(1) });
        expect(annotationRange(series, t(-5)).from).toBe(t(0));
    });

    it('spans one value axis over all series, labelled every 5', () => {
        expect(annotationValueTicks(series, annotationLayout(1165, 645)).major).toEqual([20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
    });

    it('labels hours and the quarters between them on the chart, only hours on the navigator', () => {
        const ticks = annotationTimeTicks(new Date(2026, 9, 4, 22, 50).getTime(), t(10), 1149, true);
        expect(ticks.slice(0, 6).map((x) => x.label)).toEqual(['23:00', ':15', ':30', ':45', '00:00', ':15']);
        expect(ticks.filter((x) => x.major).length).toBe(12);
        expect(annotationTimeTicks(t(10, 30), t(10) + 86400000, 1146, false).filter((x) => x.label !== '').every((x) => x.major)).toBeTrue();
    });

    it('moves and resizes the window by dragging, inside the range', () => {
        const range = { min: 0, max: 1000 };
        expect(dragWindow({ from: 500, to: 1000 }, range, 'both', -100, 100)).toEqual({ from: 0, to: 500 });
        expect(dragWindow({ from: 500, to: 1000 }, range, 'both', 100, 100)).toEqual({ from: 500, to: 1000 });
        expect(dragWindow({ from: 500, to: 1000 }, range, 'from', -10, 100)).toEqual({ from: 400, to: 1000 });
        expect(dragWindow({ from: 500, to: 1000 }, range, 'from', 100, 100)).toEqual({ from: 999, to: 1000 });
    });

    describe('series with their own timestamps', () => {
        const m = (minute: number) => t(0, minute);
        // Temperatur every minute, Feuchte every second minute, both from 00:00 to 00:59
        const minutely = {
            label: 'Temperatur', color: '#e91e63', points: Array.from({ length: 60 }, (_, i) => ({ x: m(i), y: 10 + i })),
        };
        const everyOther = {
            label: 'Feuchte', color: '#2196f3', points: Array.from({ length: 30 }, (_, i) => ({ x: m(2 * i), y: 100 + i })),
        };

        it('finds the time of the nearest point of any series, and each series own point at that time', () => {
            expect(nearestTime([minutely, everyOther], m(21) + 20000)).toBe(m(21));
            expect(nearestTime([minutely, everyOther], m(-5))).toBe(m(0));
            expect(pointsAt([minutely, everyOther], m(21))).toEqual([{ datasetIndex: 0, index: 21 }]);
            expect(pointsAt([minutely, everyOther], m(22))).toEqual([{ datasetIndex: 0, index: 22 }, { datasetIndex: 1, index: 11 }]);
        });

        it('shows the hovered time and leaves the value of a series without a point at that time empty', () => {
            const legend = annotationLegend([minutely, everyOther], m(21));
            expect(legend.date).toBe('05.10.2026 00:21:00');
            expect(legend.entries.map((e) => e.value)).toEqual(['31', '']);
            expect(annotationLegend([minutely, everyOther], m(22)).entries.map((e) => e.value)).toEqual(['32', '111']);
        });

        describe('hovering the chart', () => {
            let chart: Chart;
            let host: HTMLElement;
            let hovered: (number | undefined)[];

            // chart.js handles pointer events in the next animation frame
            const move = async (time: number) => {
                const rect = chart.canvas.getBoundingClientRect();
                const x = chart.scales['x'].getPixelForValue(time);
                chart.canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + x, clientY: rect.top + chart.chartArea.top + 20, bubbles: true }));
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            };

            beforeEach(() => {
                Chart.register(...registerables);
                hovered = [];
                const layout = annotationLayout(602, 400);
                const config = annotationMainConfig([minutely, everyOther], layout, { from: m(0), to: m(59) }, (x) => hovered.push(x));
                host = document.createElement('div');
                host.style.cssText = 'width:' + layout.width + 'px;height:' + layout.chartHeight + 'px';
                const canvas = document.createElement('canvas');
                host.appendChild(canvas);
                document.body.appendChild(host);
                chart = new Chart(canvas, { type: 'line', data: config.data, options: config.options, plugins: [annotationAxesPlugin, annotationHoverPlugin, googleFocusPlugin] } as any) as unknown as Chart;
            });

            afterEach(() => {
                chart.destroy();
                host.remove();
            });

            it('takes the time of the point under the pointer, not the index of the last series', async () => {
                await move(m(21));
                expect(hovered[hovered.length - 1]).toBe(m(21));
                expect(chart.getActiveElements().map((e) => [e.datasetIndex, e.index])).toEqual([[0, 21]]);
            });

            it('rings the points of all series that have one at the hovered time', async () => {
                await move(m(30));
                expect(hovered[hovered.length - 1]).toBe(m(30));
                expect(chart.getActiveElements().map((e) => [e.datasetIndex, e.index])).toEqual([[0, 30], [1, 15]]);
            });
        });
    });
});
