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

import { timelineSeries } from '../../charts/shared/chart-types/timeline/timeline-chart-data';
import { ChartsExportVAxesModel } from '../../charts/export/shared/charts-export-properties.model';
import { fakeTimelineData, thresholdTimeline } from './fake-timeline';

const t1 = '2026-10-05T08:00:00.000Z';
const t2 = '2026-10-05T09:00:00.000Z';
const t3 = '2026-10-05T10:00:00.000Z';
const t4 = '2026-10-05T11:00:00.000Z';

describe('thresholdTimeline', () => {
    it('keeps the bounds of every run above the threshold as 1, newest first', () => {
        expect(thresholdTimeline([[t1, 50], [t2, 150], [t3, 150], [t4, 50]], 100)).toEqual([[t4, 0], [t3, 1], [t2, 1]]);
    });

    it('closes a run that reaches back to the oldest value at that value', () => {
        expect(thresholdTimeline([[t2, 150], [t3, 150], [t4, 50]], 100)).toEqual([[t4, 0], [t3, 1], [t2, 1]]);
    });

    it('treats a value equal to the threshold as normal', () => {
        expect(thresholdTimeline([[t1, 100], [t2, 100]], 100)).toEqual([[t2, 0], [t1, 0]]);
    });

    it('sorts the given rows newest first in place', () => {
        const rows = [[t1, 1], [t2, 1]];
        thresholdTimeline(rows, 100);
        expect(rows).toEqual([[t2, 1], [t1, 1]]);
    });
});

describe('fake anomaly timeline', () => {
    const conversions = [{ from: '1', to: '1', color: '#AA4A44', alias: 'auffällig' }, { from: '0', to: '0', color: '#50C878', alias: 'normal' }];
    const vAxis = (valueAlias: string): ChartsExportVAxesModel => ({ exportName: '', color: '', math: '', valueName: 'value', valueType: '', conversions, valueAlias });

    it('draws the anomaly from its start until the next normal value', () => {
        const data = [[thresholdTimeline([[t1, 50], [t2, 150], [t3, 150], [t4, 50]], 100)]];
        expect(timelineSeries(data, [vAxis('Temperatur'), vAxis('Druck')])).toEqual([
            { name: 'auffällig', color: '#AA4A44', bars: [{ row: 'Temperatur', start: Date.parse(t2), end: Date.parse(t4) }] },
            { name: 'normal', color: '#50C878', bars: [{ row: 'Temperatur', start: Date.parse(t4), end: Date.parse(t4) }] },
        ]);
    });

    // SNRGY-4848: the pressure rows were read from resp[0][1], which never exists, and the widget stayed empty.
    it('reads temperature and pressure each from their own request', () => {
        const resp = [[[[t2, 50], [t1, 50]]], [[[t2, 5], [t1, 5]]]];
        expect(fakeTimelineData(resp)).toEqual([[[[t2, 0], [t1, 0]]], [[[t2, 1], [t1, 1]]]]);
    });
});
