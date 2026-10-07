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

import { googlePieConfig, pieLabels, pieSlices, pieTooltipView } from './google-pie';
import { googleFrame } from './google-chartjs';

describe('pieSlices', () => {
    it('colours the slices from Google\'s palette by their row, leaving out empty ones', () => {
        expect(pieSlices([{ label: 'A', value: 3 }, { label: 'S', value: 0 }, { label: 'C', value: 6 }])).toEqual([
            { label: 'A', value: 3, color: '#3366cc' }, { label: 'C', value: 6, color: '#ff9900' },
        ]);
    });

    it('groups slices under half a degree into a grey "Sonstiges" at the end', () => {
        const slices = pieSlices([{ label: 'A', value: 1000 }, { label: 'B', value: 1 }, { label: 'C', value: 0.5 }, { label: 'D', value: 300 }, { label: 'F', value: 0.25 }]);
        expect(slices.map((s) => [s.label, s.value, s.color])).toEqual([['A', 1000, '#3366cc'], ['D', 300, '#109618'], ['Sonstiges', 1.75, '#cccccc']]);
    });

    it('shows every slice with a threshold of 0 and keeps given colours', () => {
        expect(pieSlices([{ label: 'A', value: 1000, color: '#123456' }, { label: 'B', value: 0.1 }], 0).map((s) => s.color)).toEqual(['#123456', '#dc3912']);
    });
});

describe('pieLabels', () => {
    const area = { left: 30, top: 15, right: 575, bottom: 290 };
    const slices = pieSlices([{ label: 'Active', value: 3 }, { label: 'Suspended', value: 1 }, { label: 'Completed', value: 6 }, { label: 'Ext', value: 2 }, { label: 'Int', value: 1 }]);
    const labels = pieLabels(slices, { x: 303, y: 153 }, 137, area, 12);

    it('puts the dot at three quarters of the radius in the middle of the slice, as Google did', () => {
        expect(labels.map((l) => [l.dot.x, l.dot.y])).toEqual([[371.5, 76.5], [405.5, 165.5], [278.5, 253.5], [218.5, 95.5], [278.5, 53.5]]);
    });

    it('labels the right half at the right edge and the left half at the left edge with name and share', () => {
        expect(labels.map((l) => [l.side, l.edgeX, l.name, l.share])).toEqual([
            ['right', 575.5, 'Active', '23,1%'], ['right', 575.5, 'Suspended', '7,7%'], ['left', 30.5, 'Completed', '46,2%'],
            ['left', 30.5, 'Ext', '15,4%'], ['left', 30.5, 'Int', '7,7%'],
        ]);
        expect(labels.map((l) => l.elbowX)).toEqual([452, 452, 154, 154, 154]);
    });

    it('moves labels on one side apart until they are 2.9 font sizes apart', () => {
        const crowded = pieLabels(pieSlices(Array.from({ length: 10 }, (_, i) => ({ label: 'S' + i, value: i === 0 ? 50 : 1 }))), { x: 303, y: 153 }, 129, area, 12);
        const left = crowded.filter((l) => l.side === 'left').map((l) => l.lineY).sort((a, b) => a - b);
        left.slice(1).forEach((y, i) => expect(y - left[i]).toBeGreaterThanOrEqual(34));
        left.forEach((y) => expect(y).toBeGreaterThanOrEqual(area.top));
    });
});

describe('pie tooltip and config', () => {
    const slices = pieSlices([{ label: 'Halle', value: 42, color: '#3f51b5' }, { label: 'Buero', value: 27 }, { label: 'Lager', value: 13.5 }]);

    it('shows the name and the value with its share in bold', () => {
        expect(pieTooltipView(slices, 0, { x: 1, y: 2 })?.lines).toEqual([[{ text: 'Halle' }], [{ text: '42 (50,9%)', bold: true }]]);
        expect(pieTooltipView(slices, 2, { x: 1, y: 2 })?.lines[1]).toEqual([{ text: '13,5 (16,4%)', bold: true }]);
    });

    it('puts the box below the slice\'s edge, leaning to the side the tail came from', () => {
        const view = pieTooltipView(slices, 2, { x: 1, y: 2 }, 'left');
        expect([view?.below, view?.side]).toEqual([true, 'left']);
    });

    it('draws the slices with white 1px borders and without slice texts', () => {
        const config = googlePieConfig(slices, googleFrame(605, 305, '80%', '85%'));
        expect(config.data.datasets[0].data).toEqual([42, 27, 13.5]);
        expect(config.data.datasets[0].borderColor).toBe('#ffffff');
        expect(config.data.datasets[0].borderWidth).toBe(1);
    });
});
