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

import { AnomalyResultModel } from '../../shared/anomaly.model';
import { AnomalyLineSeries } from './anomaly-line-chart';
import { timeChartConfig, timeChartTooltipView, valueChartConfig, valueChartTooltipView } from './anomaly-line-chartjs';

const t1 = new Date(2026, 9, 5, 5).getTime();
const t2 = new Date(2026, 9, 5, 5, 1).getTime();
const outlier = { type: 'extreme_value', value: '95.2', lower_bound: 50, upper_bound: 70 } as AnomalyResultModel;
const series: AnomalyLineSeries[] = [
    { name: 'Original', type: 'line', data: [{ x: t1, y: 60.5 }, { x: t2, y: 61 }], color: '#008FFB', markerSize: 1 },
    { name: 'Outlier', type: 'scatter', data: [{ x: t1, y: 95.2 }], color: '#FF0000', markerSize: 7 },
];

describe('valueChartConfig', () => {
    it('draws lines 5px wide with white outlined markers of the series size, outliers as points above the line', () => {
        const config = valueChartConfig(series, [], [outlier]);
        expect(config.data.datasets.map((d) => [d.label, d.showLine, d.borderColor, d.borderWidth, d.pointRadius, d.pointBorderColor])).toEqual([
            ['Original', true, 'rgba(0, 143, 251, 0.85)', 5, 1, '#fff'],
            ['Outlier', false, 'rgba(255, 0, 0, 0.85)', 5, 7, '#fff'],
        ]);
        expect(config.data.datasets[1].order).toBeLessThan(config.data.datasets[0].order!);
    });

    it('shades the curve anomalies and titles the value axis', () => {
        const config = valueChartConfig(series, [{ from: t1, to: t2, color: '#FF4C4C', opacity: 0.4 }], [outlier]);
        const annotations = (config.options.plugins as any).annotation.annotations;
        expect(annotations.map((a: any) => [a.xMin, a.xMax, a.backgroundColor])).toEqual([[t1, t2, 'rgba(255, 76, 76, 0.4)']]);
        expect((config.options.scales as any).y.title.text).toBe('Device Output');
        expect((config.options.scales as any).y.ticks.callback.call({}, 100, 0, [])).toBe('100.000');
    });
});

describe('valueChartTooltipView', () => {
    it('names the series of the hovered value, the outlier with its bounds', () => {
        expect(valueChartTooltipView(series, [outlier], [{ datasetIndex: 0, dataIndex: 0 } as any])).toEqual({
            line: { label: 'Device Output:', value: '60.50' }, axisLabel: '05.10 05:00:00.000',
        });
        expect(valueChartTooltipView(series, [outlier], [{ datasetIndex: 1, dataIndex: 0 } as any])?.line).toEqual({ label: 'Extreme Outlier:', value: '95.2 [50-70]' });
    });

    it('shows the device output when the outlier lies at the same time', () => {
        expect(valueChartTooltipView(series, [outlier], [{ datasetIndex: 1, dataIndex: 0 }, { datasetIndex: 0, dataIndex: 0 }] as any)?.line).toEqual({ label: 'Device Output:', value: '60.50' });
    });
});

describe('timeChartConfig', () => {
    const waiting: AnomalyLineSeries[] = [
        { name: 'Waiting Time', data: [{ x: t1, y: 37 }, { x: t2, y: 0 }], color: '#008FFB', markerSize: 5 },
        { name: 'Outlier', type: 'scatter', data: [{ x: t1, y: 12 }], color: '#FF0000', markerSize: 7 },
    ];

    it('draws the waiting times as points and labels whole seconds without decimals', () => {
        const config = timeChartConfig(waiting, 'Waiting time in seconds');
        expect(config.data.datasets.map((d) => [d.label, d.showLine, d.pointRadius])).toEqual([['Waiting Time', false, 5], ['Outlier', false, 7]]);
        expect((config.options.scales as any).y.title.text).toBe('Waiting time in seconds');
        expect((config.options.scales as any).y.ticks.callback.call({}, 40, 0, [])).toBe('40');
    });

    it('shows the date and the waiting time of the hovered point', () => {
        expect(timeChartTooltipView(waiting, [{ datasetIndex: 0, dataIndex: 0 } as any])).toEqual({
            title: '05.10 05:00:00.000', axisLabel: '05.10 05:00:00.000', rows: [{ color: 'rgba(0, 143, 251, 0.85)', label: 'Waiting Time', value: '37' }],
        });
    });
});
