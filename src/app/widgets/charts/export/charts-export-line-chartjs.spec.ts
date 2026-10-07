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
import { chartsExportLineConfig, chartsExportPieConfig, chartsExportSeries } from './charts-export-line-chartjs';
import { ChartsExportChart } from './shared/charts-export-table';

describe('charts export lines and pies', () => {
    const t = (h: number) => new Date(2026, 9, 5, h);
    function chart(extra: Partial<ChartsExportChart> = {}): ChartsExportChart {
        return {
            chartType: 'LineChart',
            dataTable: [['time', 'Temperatur', 'Feuchte'], [t(1), 20, null], [t(0), 21.5, 55], [t(2), null, 60]],
            colors: ['#e91e63', '#2196f3'],
            hAxisLabel: 'Zeit', vAxisLabel: '°C', secondVAxisLabel: '%', hAxisFormat: 'HH:mm',
            curved: false, secondAxis: [false, true],
            ...extra,
        };
    }
    const frame = googleFrame(605, 305, '80%', '85%');

    it('makes one series per column in its colour and axis, points in time order without gaps', () => {
        expect(chartsExportSeries(chart())).toEqual([
            { label: 'Temperatur', color: '#e91e63', secondAxis: false, points: [{ x: t(0).getTime(), y: 21.5 }, { x: t(1).getTime(), y: 20 }] },
            { label: 'Feuchte', color: '#2196f3', secondAxis: true, points: [{ x: t(0).getTime(), y: 55 }, { x: t(2).getTime(), y: 60 }] },
        ]);
    });

    it('titles both value axes and the time axis, and labels the time in the stored format', () => {
        const axes = (chartsExportLineConfig(chart(), frame).options.plugins as any).googleAxes;
        expect(axes.y.map((a: any) => [a.side, a.title])).toEqual([['left', '°C'], ['right', '%']]);
        expect(axes.x.title).toBe('Zeit');
        expect(axes.x.dateFormat(new Date(2026, 9, 5, 7, 5))).toBe('07:05');
    });

    it('aligns the gridlines of the second axis to the first', () => {
        const axes = (chartsExportLineConfig(chart(), frame).options.plugins as any).googleAxes;
        const count = (a: any) => a.ticks.filter((tick: any) => tick.major).length;
        expect(count(axes.y[1])).toBe(count(axes.y[0]));
    });

    it('draws a scatter as points and a curved line smoothed', () => {
        const scatter = chartsExportLineConfig(chart({ chartType: 'ScatterChart' }), frame).data.datasets[0] as any;
        const curved = chartsExportLineConfig(chart({ curved: true }), frame).data.datasets[0] as any;
        expect([scatter.showLine, scatter.pointRadius]).toEqual([false, 4.5]);
        expect(curved.googleCurve).toBeTrue();
    });

    it('uses Google\'s own date labels without a stored format', () => {
        expect((chartsExportLineConfig(chart({ hAxisFormat: '' }), frame).options.plugins as any).googleAxes.x.dateFormat).toBeUndefined();
    });

    it('makes a slice per row of a pie in the series colours', () => {
        const pie = chartsExportPieConfig(chart({ chartType: 'PieChart', dataTable: [['', ''], ['Halle', 42], ['Buero', 27], ['Lager', 13.5]], colors: ['#3f51b5', '#ff9800', '#4484ce'] }), frame);
        expect(pie.data.labels).toEqual(['Halle', 'Buero', 'Lager']);
        expect(pie.data.datasets[0].data).toEqual([42, 27, 13.5]);
        expect(pie.data.datasets[0].backgroundColor).toEqual(['#3f51b5', '#ff9800', '#4484ce']);
    });

    it('groups slices below the stored threshold into one grey Sonstiges slice, and shows all slices for a threshold of 0', () => {
        const table = [['', ''], ['Halle', 80], ['Buero', 12], ['Lager', 5], ['Keller', 3]];
        const grouped = chartsExportPieConfig(chart({ chartType: 'PieChart', dataTable: table, colors: ['#3f51b5', '#ff9800', '#4484ce', '#109618'], sliceThreshold: 0.1 }), frame);
        expect(grouped.data.labels).toEqual(['Halle', 'Buero', 'Sonstiges']);
        expect(grouped.data.datasets[0].data).toEqual([80, 12, 8]);
        expect((grouped.data.datasets[0].backgroundColor as string[])[2]).toBe('#cccccc');
        const all = chartsExportPieConfig(chart({ chartType: 'PieChart', dataTable: table, colors: ['#3f51b5', '#ff9800', '#4484ce', '#109618'], sliceThreshold: 0 }), frame);
        expect(all.data.labels).toEqual(['Halle', 'Buero', 'Lager', 'Keller']);
    });
});
