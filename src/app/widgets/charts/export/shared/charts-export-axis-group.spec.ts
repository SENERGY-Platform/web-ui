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

import { isAxisGroupInterval } from '../../shared/data-source-selector/group-options';
import { axisLabel, effectiveGroupType } from './charts-export-axis-group';
import { ChartsExportVAxesModel } from './charts-export-properties.model';

const axis = (valueName: string, extra: Partial<ChartsExportVAxesModel> = {}): ChartsExportVAxesModel => ({
    exportName: 'e', valueName, valueType: 'float', math: '', color: '', ...extra,
});

describe('charts export axis group', () => {
    describe('axisLabel', () => {
        it('adds no suffix to a drilled series without a name, which keeps its device label', () => {
            expect(axisLabel(axis('', { ownGroup: { type: 'median', time: '1h' } }), 'LineChart')).toBe('');
        });

        it('still suffixes a named axis', () => {
            expect(axisLabel(axis('Vorlauf', { ownGroup: { type: 'median', time: '1h' } }), 'LineChart')).toBe('Vorlauf (median 1h)');
        });
    });

    describe('effectiveGroupType', () => {
        it('takes the own type on a line chart and the widget type otherwise', () => {
            const a = axis('a', { ownGroup: { type: 'median', time: '1h' } });
            expect(effectiveGroupType(a, 'LineChart', 'difference-last')).toBe('median');
            expect(effectiveGroupType(a, 'ColumnChart', 'difference-last')).toBe('difference-last');
            expect(effectiveGroupType(axis('b'), 'LineChart', 'mean')).toBe('mean');
        });
    });

    describe('isAxisGroupInterval', () => {
        it('rejects the units the timescale-wrapper rejects', () => {
            ['1ns', '1u', '1µ', '', '1', 'h'].forEach(time => expect(isAxisGroupInterval(time)).withContext(time).toBeFalse());
            ['15ms', '1s', '1m', '1h', '1d', '1w', '1months', '1y'].forEach(time => expect(isAxisGroupInterval(time)).withContext(time).toBeTrue());
        });
    });
});
