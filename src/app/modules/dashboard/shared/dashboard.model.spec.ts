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

import { COLUMN_BANDS, MAX_COLUMNS, MIN_UNIT_PX } from './dashboard.model';

describe('COLUMN_BANDS', () => {
    /**
     * Mirrors gridstack's checkDynamicColumn(): start at the maximum, then walk the bands from the
     * front while they still cover the width, so the last one taken is the narrowest that fits.
     */
    const columnsForWidth = (width: number): number => {
        let columns = MAX_COLUMNS;
        let i = 0;
        while (i < COLUMN_BANDS.length && width <= COLUMN_BANDS[i].w) {
            columns = COLUMN_BANDS[i++].c;
        }
        return columns;
    };

    it('lists one band per column count, widest first', () => {
        expect(COLUMN_BANDS.map((band) => band.c)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    });

    it('orders the bands by descending width, as gridstack matches them', () => {
        const widths = COLUMN_BANDS.map((band) => band.w);
        expect(widths).toEqual([...widths].sort((a, b) => b - a));
    });

    it('takes the column count from the width in whole units', () => {
        expect(columnsForWidth(MIN_UNIT_PX)).toBe(1);
        expect(columnsForWidth(MIN_UNIT_PX * 2 - 1)).toBe(1);
        expect(columnsForWidth(MIN_UNIT_PX * 2)).toBe(2);
        expect(columnsForWidth(MIN_UNIT_PX * 3 - 1)).toBe(2);
        expect(columnsForWidth(MIN_UNIT_PX * MAX_COLUMNS)).toBe(MAX_COLUMNS);
    });

    it('keeps every column at least MIN_UNIT_PX wide at any width', () => {
        for (let width = MIN_UNIT_PX; width <= MIN_UNIT_PX * (MAX_COLUMNS + 2); width += 7) {
            expect(width / columnsForWidth(width)).toBeGreaterThanOrEqual(MIN_UNIT_PX);
        }
    });

    it('caps at MAX_COLUMNS however wide the grid gets', () => {
        expect(columnsForWidth(MIN_UNIT_PX * (MAX_COLUMNS + 5))).toBe(MAX_COLUMNS);
    });

    it('never drops below one column, however narrow the grid gets', () => {
        expect(columnsForWidth(1)).toBe(1);
    });
});
