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

import { ChartsExportVAxesModel } from './charts-export-properties.model';
import { applyRemainder, DEFAULT_REMAINDER_LABEL, remainderAxis, REMAINDER_COLOR } from './charts-export-remainder';

describe('charts export remainder', () => {
    const axis = (extra: Partial<ChartsExportVAxesModel> = {}): ChartsExportVAxesModel => ({
        deviceId: 'dev-A',
        serviceId: 'svc-A',
        exportName: 'A',
        valueName: 'A',
        valueAlias: 'A',
        valueType: 'float',
        valuePath: 'value',
        math: '',
        color: '#5a8bcb',
        ...extra,
    });
    const sub = axis({ deviceId: 'dev-Sub', valueAlias: 'Sub' });

    describe('remainderAxis', () => {
        it('answers none for an axis that does not ask for one', () => {
            expect(remainderAxis(axis({ subAxes: [sub] }))).toBeUndefined();
        });

        it('queries what the parent queried, under the default label', () => {
            const rest = remainderAxis(axis({ subAxes: [sub], showRemainder: true }));
            expect(rest?.deviceId).toBe('dev-A');
            expect(rest?.serviceId).toBe('svc-A');
            expect(rest?.valueAlias).toBe(DEFAULT_REMAINDER_LABEL);
            expect(rest?.color).toBe(REMAINDER_COLOR);
            expect(rest?.isRemainder).toBeTrue();
        });

        it('takes the label the axis names, ignoring one that is only spaces', () => {
            expect(remainderAxis(axis({ subAxes: [sub], showRemainder: true, remainderAlias: 'Unbekannt' }))?.valueAlias).toBe('Unbekannt');
            expect(remainderAxis(axis({ subAxes: [sub], showRemainder: true, remainderAlias: '  ' }))?.valueAlias).toBe(DEFAULT_REMAINDER_LABEL);
        });

        it('drops the sub axes, so the remainder offers no drill of its own', () => {
            const rest = remainderAxis(axis({ subAxes: [sub], showRemainder: true }));
            expect(rest).toBeDefined();
            expect(rest?.subAxes).toBeUndefined();
            expect(rest?.showRemainder).toBeUndefined();
        });

        it('leaves the axis it was built from alone', () => {
            const parent = axis({ subAxes: [sub], showRemainder: true });
            expect(remainderAxis(parent)).toBeDefined();
            expect(parent.valueAlias).toBe('A');
            expect(parent.subAxes?.length).toBe(1);
            expect(parent.isRemainder).toBeUndefined();
        });

        it('keeps the parent on the axis the parent was drawn on', () => {
            expect(remainderAxis(axis({ subAxes: [sub], showRemainder: true, displayOnSecondVAxis: true }))?.displayOnSecondVAxis).toBeTrue();
        });
    });

    describe('applyRemainder', () => {
        const rest = { ...axis({ valueAlias: 'Unclear' }), isRemainder: true } as ChartsExportVAxesModel;
        const table = (): (Date | number | string | null)[][] => [
            ['time', 'Sub 1', 'Sub 2', 'Unclear'],
            [new Date(0), 2, 3, 10],
            [new Date(1), 1, null, 4],
        ];

        it('leaves a table without a remainder axis alone', () => {
            const data = table();
            applyRemainder(data, [0, 0, 1], [axis(), axis()]);
            expect(data[1]).toEqual([new Date(0), 2, 3, 10]);
        });

        it('keeps what the sub axes leave of the parent value', () => {
            const data = table();
            applyRemainder(data, [0, 0, 1], [axis(), rest]);
            expect(data[1][3]).toBe(5);
            expect(data[2][3]).toBe(3);
        });

        it('leaves nothing rather than a negative bar when the sub axes reach past the parent', () => {
            const data: (Date | number | string | null)[][] = [['time', 'Sub', 'Unclear'], [new Date(0), 9, 4]];
            applyRemainder(data, [0, 1], [axis(), rest]);
            expect(data[1][2]).toBe(0);
        });

        it('keeps no remainder in a row the parent has no value in', () => {
            const data: (Date | number | string | null)[][] = [['time', 'Sub', 'Unclear'], [new Date(0), 2, 'n/a']];
            applyRemainder(data, [0, 1], [axis(), rest]);
            expect(data[1][2]).toBeNull();
        });

        it('carries one remainder for a parent split over several columns', () => {
            const data: (Date | number | string | null)[][] = [['time', 'Sub', 'Unclear d1', 'Unclear d2'], [new Date(0), 2, 4, 6]];
            applyRemainder(data, [0, 1, 1], [axis(), rest]);
            expect(data[1]).toEqual([new Date(0), 2, 8, null]);
        });

        it('nets rows that share a time, so a parent answered in a row of its own still counts', () => {
            const data: (Date | number | string | null)[][] = [
                ['time', 'Sub', 'Unclear'],
                [new Date(0), 4, null],
                [new Date(0), null, 10],
            ];
            applyRemainder(data, [0, 1], [axis(), rest]);
            expect(data[1][2]).toBeNull();
            expect(data[2][2]).toBe(6);
        });

        it('keeps the rows of different times apart', () => {
            const data: (Date | number | string | null)[][] = [
                ['time', 'Sub', 'Unclear'],
                [new Date(0), 4, 10],
                [new Date(1000), 1, 10],
            ];
            applyRemainder(data, [0, 1], [axis(), rest]);
            expect([data[1][2], data[2][2]]).toEqual([6, 9]);
        });

        it('puts the remainder in a column that held a parent value, not in an empty one', () => {
            const data: (Date | number | string | null)[][] = [['time', 'Sub', 'Unclear d1', 'Unclear d2'], [new Date(0), 2, null, 7]];
            applyRemainder(data, [0, 1, 1], [axis(), rest]);
            expect(data[1]).toEqual([new Date(0), 2, null, 5]);
        });

        it('does nothing without the column mapping the axes are read through', () => {
            const data = table();
            applyRemainder(data, undefined, [axis(), rest]);
            expect(data[1][3]).toBe(10);
        });
    });
});
