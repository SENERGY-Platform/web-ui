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

import { consumptionChartConfig, consumptionTooltipView } from './consumption-chartjs';
import { consumptionSeries } from './consumption-series';

const t1 = new Date(2026, 9, 2, 6).getTime();
const t2 = new Date(2026, 9, 3, 6).getTime();
const series = consumptionSeries([[new Date(t1).toISOString(), 8.28, 0], [new Date(t2).toISOString(), 17, 1]]);
const tick = (callback: any, value: number) => callback.call({}, value, 0, []);

describe('consumptionChartConfig', () => {
    it('draws normal consumption as blue and anomalous consumption as red points', () => {
        const config = consumptionChartConfig(series, 'dd.MM');
        expect(config.data.datasets.map((d) => [d.label, d.backgroundColor, d.pointRadius])).toEqual([
            ['Normal Consumption', 'rgba(0, 143, 251, 0.85)', 4],
            ['Anomalous Consumption', 'rgba(255, 0, 0, 0.85)', 4],
        ]);
        expect(config.data.datasets[1].data).toEqual([{ x: t2, y: 17 }]);
    });

    it('labels the value axis with three decimals as the values have decimals', () => {
        const scales = consumptionChartConfig(series, 'dd.MM').options.scales as any;
        expect(tick(scales.y.ticks.callback, 20)).toBe('20.000');
    });
});

describe('consumptionTooltipView', () => {
    it('shows the date in the given format, the series name and its value', () => {
        expect(consumptionTooltipView(series, 'dd.MM', [{ datasetIndex: 0, dataIndex: 0 } as any])).toEqual({
            title: '02.10', axisLabel: '02.10', rows: [{ color: 'rgba(0, 143, 251, 0.85)', label: 'Normal Consumption', value: '8.280' }],
        });
        expect(consumptionTooltipView(series, 'dd.MM HH:mm:ss.SSS', [{ datasetIndex: 1, dataIndex: 0 } as any])?.title).toBe('03.10 06:00:00.000');
    });
});
