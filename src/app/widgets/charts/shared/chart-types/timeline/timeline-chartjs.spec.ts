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

import { TimelineSeries } from './timeline-chart-data';
import { timelineChartConfig, timelineSelection, timelineTooltipView } from './timeline-chartjs';

const t1 = new Date(2026, 9, 5, 6, 30).getTime();
const t2 = new Date(2026, 9, 5, 7, 45).getTime();
const t3 = new Date(2026, 9, 5, 9, 0, 5).getTime();

const series: TimelineSeries[] = [
    { name: 'An', color: '#4caf50', bars: [{ row: 'Pump', start: t1, end: t2 }, { row: 'Fan', start: t2, end: t3 }] },
    { name: 'Aus', color: '#9e9e9e', bars: [{ row: 'Pump', start: t2, end: t3 }] },
];

describe('timelineChartConfig', () => {
    it('draws one row per timeline row and the bars of every state in its colour', () => {
        const config = timelineChartConfig(series, [t1, t3], 'Zeit', 'Anlage');
        expect(config.data.labels).toEqual(['Pump', 'Fan']);
        expect(config.data.datasets.map((d) => [d.label, d.backgroundColor, d.hoverBackgroundColor])).toEqual([
            ['An', 'rgba(76, 175, 80, 0.85)', 'rgba(106, 238, 111, 0.85)'],
            ['Aus', 'rgba(158, 158, 158, 0.85)', 'rgba(216, 216, 216, 0.85)'],
        ]);
        expect(config.data.datasets[0].data).toEqual([{ x: [t1, t2], y: 'Pump' }, { x: [t2, t3], y: 'Fan' }]);
    });

    it('spans the time axis over the data and titles both axes', () => {
        const scales = timelineChartConfig(series, [t1, t3], 'Zeit', 'Anlage').options.scales as any;
        expect([scales.x.min, scales.x.max]).toEqual([t1, t3]);
        expect([scales.x.title.text, scales.y.title.text]).toEqual(['Zeit', 'Anlage']);
    });

    it('puts the legend on top, right aligned unless asked to centre it', () => {
        expect(timelineChartConfig(series, [t1, t3], '', '').options.plugins?.legend).toEqual(jasmine.objectContaining({ display: true, position: 'top', align: 'end' }));
        expect(timelineChartConfig(series, [t1, t3], '', '', 'center').options.plugins?.legend?.align).toBe('center');
    });
});

describe('timelineTooltipView', () => {
    it('shows the state in its colour above the row and the local start and end time', () => {
        expect(timelineTooltipView(series, [{ datasetIndex: 0, dataIndex: 0 } as any])).toEqual({
            range: { name: 'An', color: '#4caf50', category: 'Pump', start: '05.10 06:30:00', end: '05.10 07:45:00' },
        });
    });

    it('shows nothing without hovered bar', () => {
        expect(timelineTooltipView(series, [])).toBeUndefined();
    });
});

describe('timelineSelection', () => {
    it('is the state, row, start and end of a bar', () => {
        expect(timelineSelection(series, 0, 1)).toEqual({ seriesName: 'An', row: 'Fan', start: t2, end: t3 });
        expect(timelineSelection(series, 1, 5)).toBeUndefined();
    });
});
