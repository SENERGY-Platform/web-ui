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

import { ChartsExportConversion, ChartsExportVAxesModel } from '../../../export/shared/charts-export-properties.model';
import { aliasOfMatchingRule, mergeTimelineData, timelineSeries, timelineXRange } from './timeline-chart-data';

const t1 = Date.UTC(2026, 9, 5, 8);
const t2 = Date.UTC(2026, 9, 5, 9);
const t3 = Date.UTC(2026, 9, 5, 10);
const t4 = Date.UTC(2026, 9, 5, 11);

function iso(ms: number): string {
    return new Date(ms).toISOString();
}

function axis(conversions: ChartsExportConversion[], valueAlias = 'Door', exportName = 'export'): ChartsExportVAxesModel {
    return { exportName, valueName: 'open', valueAlias, valueType: 'boolean', math: '', color: '', conversions };
}

const doorConversions: ChartsExportConversion[] = [
    { from: 'false', to: 'true', alias: 'opened', color: '#00ff00' },
    { from: 'true', to: 'false', alias: 'closed', color: '#ff0000' },
];

// one request with one column, newest row first
const door = [[[iso(t4), true], [iso(t3), true], [iso(t2), false], [iso(t1), false]]];

describe('mergeTimelineData', () => {
    it('keeps only the first and last row of every run of equal values', () => {
        expect(mergeTimelineData(door)).toEqual([[iso(t4), true], [iso(t3), true], [iso(t2), false], [iso(t1), false]]);
        expect(mergeTimelineData([[[iso(t4), 1], [iso(t3), 1], [iso(t2), 1], [iso(t1), 0]]])).toEqual([
            [iso(t4), 1], [iso(t2), 1], [iso(t1), 0], [iso(t1), 0],
        ]);
    });
});

describe('aliasOfMatchingRule', () => {
    it('compares from and to as strings', () => {
        expect(aliasOfMatchingRule(axis(doorConversions), false, true)).toBe('opened');
        expect(aliasOfMatchingRule(axis(doorConversions), 'true', 'false')).toBe('closed');
        expect(aliasOfMatchingRule(axis(doorConversions), true, true)).toBeUndefined();
    });

    it('falls back to the target value without alias and lets the last matching conversion win', () => {
        expect(aliasOfMatchingRule(axis([{ from: 0, to: 1 }]), '0', '1')).toBe('1');
        expect(aliasOfMatchingRule(axis([{ from: 0, to: 1, alias: 'a' }, { from: 0, to: 1, alias: 'b' }]), 0, 1)).toBe('b');
    });
});

describe('timelineSeries', () => {
    it('draws a bar from the change into a state until the newer change out of it', () => {
        const result = timelineSeries([door], [axis(doorConversions)]);
        expect(result.data).toEqual([{ name: 'opened', data: [{ x: 'Door', y: [t2, t4] }] }]);
        expect(result.colors).toEqual(['#00ff00']);
    });

    it('ends every bar at the next change, the newest one at the newest row', () => {
        const data = [[[iso(t4), false], [iso(t3), true], [iso(t2), true], [iso(t1), false]]];
        const result = timelineSeries([data], [axis(doorConversions)]);
        expect(result.data).toEqual([
            { name: 'opened', data: [{ x: 'Door', y: [t1, t3] }] },
            { name: 'closed', data: [{ x: 'Door', y: [t3, t4] }] },
        ]);
        expect(result.colors).toEqual(['#00ff00', '#ff0000']);
    });

    it('labels the row with the export name when the axis has no alias', () => {
        const result = timelineSeries([door], [axis(doorConversions, '', 'Front door')]);
        expect(result.data[0].data[0].x).toBe('Front door');
    });

    it('gives every request its own row and collects equal aliases into one series', () => {
        const result = timelineSeries([door, door], [axis(doorConversions, 'A'), axis(doorConversions, 'B')]);
        expect(result.data).toEqual([{ name: 'opened', data: [{ x: 'A', y: [t2, t4] }, { x: 'B', y: [t2, t4] }] }]);
        expect(result.colors).toEqual(['#00ff00']);
    });

    it('skips requests without data', () => {
        expect(timelineSeries([[], door], [axis(doorConversions, 'A'), axis(doorConversions, 'B')]).data[0].data.map((b) => b.x)).toEqual(['B']);
    });

    it('colours the series of a conversion without alias with that conversion', () => {
        const result = timelineSeries([door], [axis([{ from: 'false', to: 'true', color: '#00ff00' }])]);
        expect(result.data).toEqual([{ name: 'true', data: [{ x: 'Door', y: [t2, t4] }] }]);
        expect(result.colors).toEqual(['#00ff00']);
    });

    // A conversion without alias matches every series (undefined === undefined), so it takes precedence over the series' own conversion.
    it('takes the colour of an earlier conversion without alias for any series', () => {
        const result = timelineSeries([[], door], [axis([{ from: 'x', to: 'y', color: '#123456' }], 'A'), axis(doorConversions, 'B')]);
        expect(result.data.map((s) => s.name)).toEqual(['opened']);
        expect(result.colors).toEqual(['#123456']);
    });
});

describe('timelineXRange', () => {
    it('spans from the oldest to the newest row of all requests', () => {
        const other = [[[iso(t3), 1], [iso(t2), 1]]];
        expect(timelineXRange([door, other])).toEqual([t1, t4]);
    });

    it('is undefined without any data', () => {
        expect(timelineXRange([])).toEqual([undefined, undefined]);
        expect(timelineXRange([[]])).toEqual([undefined, undefined]);
    });

    it('comes out reversed for rows sorted oldest first', () => {
        expect(timelineXRange([[[[iso(t1), 0], [iso(t4), 0]]]])).toEqual([t4, t1]);
    });
});
