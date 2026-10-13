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

import { Chart, ChartOptions, registerables } from 'chart.js';
import { buildColumnChartOptions, ChartsExportColumnOptionsHost } from './charts-export-column-options';

function host(overrides: Partial<ChartsExportColumnOptionsHost> = {}): ChartsExportColumnOptionsHost {
    return {
        zoom: false,
        stacked: false,
        dateFormat: 'MM.yyyy',
        properties: { vAxisLabel: 'kWh', hAxisLabel: '' } as any,
        chartjs: { tooltipContext: undefined, tooltipDisplay: 'none', tooltipDatasets: [], cursorLocked: false, minDateMs: 10, maxDateMs: 20 },
        updateDatasetHoverStyle: () => undefined,
        drillable: () => true,
        drillDown: () => undefined,
        onLegendClick: () => () => undefined,
        ...overrides,
    };
}

describe('buildColumnChartOptions', () => {
    it('titles an axis only when the widget has a label for it', () => {
        const scales = buildColumnChartOptions(host())?.scales as any;
        expect(scales.y.title).toEqual({ text: 'kWh', display: true });
        expect(scales.x.title.display).toBeFalse();
        expect(scales.y2.title.display).toBeFalse();
    });

    it('stacks all three axes as the host says and bounds the x axis by the chart state', () => {
        const scales = buildColumnChartOptions(host({ stacked: true }))?.scales as any;
        expect([scales.y.stacked, scales.y2.stacked, scales.x.stacked]).toEqual([true, true, true]);
        expect([scales.x.min, scales.x.max]).toEqual([10, 20]);
        expect(scales.x.time.displayFormats.day).toBe('MM.yyyy');
    });

    it('shows the legend only in the maximized view', () => {
        expect((buildColumnChartOptions(host({ zoom: true }))?.plugins?.legend as any).display).toBeTrue();
        expect((buildColumnChartOptions(host())?.plugins?.legend as any).display).toBeFalse();
    });

    it('drills a click only when exactly one drillable column is hit', () => {
        const drilled: number[] = [];
        const options = buildColumnChartOptions(host({ drillDown: i => drilled.push(i), drillable: i => i !== 2 }));
        (options as any).onClick(null, [{ datasetIndex: 1 }]);
        (options as any).onClick(null, [{ datasetIndex: 2 }]);
        (options as any).onClick(null, [{ datasetIndex: 0 }, { datasetIndex: 1 }]);
        expect(drilled).toEqual([1]);
    });

    it('turns the cursor into a pointer over a drillable column and locks it', () => {
        const state = host().chartjs;
        const style: any = { cursor: '' };
        const chart: any = { canvas: { parentNode: { style } } };
        const options = buildColumnChartOptions(host({ chartjs: state }));
        (options as any).onHover(null, [{ datasetIndex: 0 }], chart);
        expect([style.cursor, state.cursorLocked]).toEqual(['pointer', true]);
        (options as any).onHover(null, [], chart);
        expect([style.cursor, state.cursorLocked]).toEqual(['default', false]);
    });

    it('collects the hovered datasets for the tooltip and places later points to the left', () => {
        const state = host().chartjs;
        const options = buildColumnChartOptions(host({ chartjs: state }));
        (options?.plugins?.tooltip as any).callbacks.afterBody([
            { datasetIndex: 0, formattedValue: '1', dataset: { label: 'A', data: [1, 2, 3, 4] }, dataIndex: 0 },
            { datasetIndex: 1, formattedValue: '2', dataset: { data: [1, 2, 3, 4] }, dataIndex: 3 },
        ]);
        expect(state.tooltipDatasets).toEqual([
            { datasetIndex: 0, label: 'A', formattedValue: '1', drawToLeft: false },
            { datasetIndex: 1, label: '', formattedValue: '2', drawToLeft: true },
        ]);
    });

    it('keeps both value axes starting at zero, so an all-zero series spans 0..1 and not -1..1', () => {
        Chart.register(...registerables);
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        const options = buildColumnChartOptions(host()) as ChartOptions<'bar'>;
        // The time axis needs a date adapter; the value axes are what this spec is about.
        options.scales = { ...options.scales, x: { type: 'category' } };
        const chart = new Chart(canvas, {
            type: 'bar',
            data: { labels: ['a', 'b'], datasets: [{ data: [0, 0], yAxisID: 'y' }, { data: [0, 0], yAxisID: 'y2' }] },
            options: { ...options, animation: false, responsive: false },
        });
        try {
            expect([chart.scales['y'].min, chart.scales['y'].max]).toEqual([0, 1]);
            expect([chart.scales['y2'].min, chart.scales['y2'].max]).toEqual([0, 1]);
        } finally {
            chart.destroy();
            canvas.remove();
        }
    });
});
