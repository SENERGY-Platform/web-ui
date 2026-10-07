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

import { categoryColumnsConfig } from './google-columns';
import { googleFrame } from './google-chartjs';

describe('google columns', () => {
    it('makes a column 61.8% of its slot plus the 1px outline wide', () => {
        const config = categoryColumnsConfig({ frame: googleFrame(605, 305, '90%', '80%'), categories: ['a', 'b', 'c', 'd'], values: [1, 2, 3, 4], color: '#4484ce', valueLabel: String });
        const slot = 545 / 4;
        expect((config.data.datasets[0] as any).categoryPercentage * slot).toBeCloseTo(85, 6);
        const set = config.data.datasets[0] as any;
        expect(set.borderColor).toBe('#4484ce');
        expect(set.borderSkipped).toBe('start');
    });

    it('keeps a zero value as a 1px column, as Google\'s outline left a hairline there, but not on a date axis', () => {
        const input = { frame: googleFrame(605, 305, '90%', '80%'), categories: ['a', 'b'], values: [0, 2], color: '#4484ce', valueLabel: String };
        expect((categoryColumnsConfig(input).data.datasets[0] as any).minBarLength).toBe(1);
        expect((categoryColumnsConfig({ ...input, outline: false }).data.datasets[0] as any).minBarLength).toBe(0);
    });

    it('widens a flat all-zero value axis by 1 to both sides, keeping 0 labelled, instead of a degenerate range', () => {
        const config = categoryColumnsConfig({ frame: googleFrame(605, 305, '90%', '80%'), categories: ['a', 'b'], values: [0, 0], color: '#4484ce', valueLabel: String });
        const y = config.options.scales!['y'] as { min: number; max: number };
        expect([y.min, y.max]).toEqual([-1, 1]);
        const labels = (config.options.plugins as any).googleAxes.y[0].ticks.filter((t: any) => t.major).map((t: any) => t.label);
        expect(labels).toContain('0');
        expect(labels.every((l: string) => !l.includes('NaN') && !l.includes('Infinity'))).toBeTrue();
    });
});
