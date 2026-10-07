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

import { googleFrame } from './google-chartjs';
import { defaultTooltipLines, googleLinesConfig, googleTooltipDate, xDomain } from './google-lines';

describe('google lines', () => {
    const t = (h: number) => new Date(2026, 9, 5, h).getTime();
    const series = [{ label: 'Temperatur', color: '#e91e63', points: [{ x: t(0), y: 18 }, { x: t(12), y: 24 }] }];

    it('spans the x axis over the data of a line', () => {
        expect(xDomain({ frame: googleFrame(605, 305, '80%', '85%'), kind: 'line', series })).toEqual({ min: t(0), max: t(12) });
    });

    it('widens a scatter by half its range to both sides without x labels, to whole ticks with them', () => {
        expect(xDomain({ frame: googleFrame(605, 305, '80%', '85%'), kind: 'scatter', series, xTitle: 'Zeit' })).toEqual({ min: t(0) - 6 * 3600000, max: t(12) + 6 * 3600000 });
        const labelled = xDomain({ frame: googleFrame(605, 305, '80%', '85%'), kind: 'scatter', series: [{ ...series[0], points: [{ x: t(0) + 600000, y: 1 }, { x: t(12) - 600000, y: 2 }] }] });
        expect(labelled).toEqual({ min: t(0), max: t(12) });
    });

    it('shows the date in bold and the series with its value, a scatter the series and date with value in bold', () => {
        const point = { x: new Date(2026, 9, 4, 22).getTime(), y: 55 };
        expect(defaultTooltipLines('line', { ...series[0], label: 'Feuchte' }, point)).toEqual([[{ text: '04.10.2026, 22:00:00', bold: true }], [{ text: 'Feuchte: ' }, { text: '55', bold: true }]]);
        expect(defaultTooltipLines('scatter', series[0], { x: point.x, y: 21.78 })).toEqual([[{ text: 'Temperatur' }], [{ text: '04.10.2026, 22:00:00, 21,78', bold: true }]]);
        expect(googleTooltipDate(point.x)).toBe('04.10.2026, 22:00:00');
    });

    it('draws lines 2px wide in their colours, later series on top, an area at 30% opacity', () => {
        const config = googleLinesConfig({ frame: googleFrame(605, 305), kind: 'area', series: [series[0], { label: 'B', color: '#2196f3', points: [] }] });
        expect(config.data.datasets.map((d: any) => [d.borderColor, d.borderWidth, d.order])).toEqual([['#e91e63', 2, -0], ['#2196f3', 2, -1]]);
        expect(config.data.datasets[0].backgroundColor).toBe('rgba(233, 30, 99, 0.3)');
    });
});
