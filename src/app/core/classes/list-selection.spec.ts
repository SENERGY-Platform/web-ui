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

import { ListSelection } from './list-selection';

describe('ListSelection', () => {
    let rows: number[];

    function create(options = {}): ListSelection<number> {
        return new ListSelection<number>(() => rows, options);
    }

    describe('mode all (default)', () => {
        it('counts no rows as all selected', () => {
            rows = [];
            const s = create();
            expect(s.isAllSelected()).toBeTrue();
        });

        it('masterToggle with no rows selects nothing and stays empty', () => {
            rows = [];
            const s = create();
            s.masterToggle();
            expect(s.selected).toEqual([]);
        });

        it('one row: none selected is not all, toggle selects, toggle again clears', () => {
            rows = [1];
            const s = create();
            expect(s.isAllSelected()).toBeFalse();
            s.masterToggle();
            expect(s.selected).toEqual([1]);
            expect(s.isAllSelected()).toBeTrue();
            s.masterToggle();
            expect(s.selected).toEqual([]);
        });

        it('n rows: none and some selected are not all, toggle selects every row', () => {
            rows = [1, 2, 3];
            const s = create();
            expect(s.isAllSelected()).toBeFalse();
            s.model.select(2);
            expect(s.isAllSelected()).toBeFalse();
            s.masterToggle();
            expect(s.selected.sort()).toEqual([1, 2, 3]);
            expect(s.isAllSelected()).toBeTrue();
        });

        it('n rows: toggle with all selected clears', () => {
            rows = [1, 2, 3];
            const s = create();
            rows.forEach((r) => s.model.select(r));
            s.masterToggle();
            expect(s.selected).toEqual([]);
        });

        it('reads the rows at call time', () => {
            rows = [1, 2];
            const s = create();
            s.masterToggle();
            rows = [1, 2, 3];
            expect(s.isAllSelected()).toBeFalse();
        });

        it('clear empties the selection', () => {
            rows = [1, 2];
            const s = create();
            s.masterToggle();
            s.clear();
            expect(s.model.selected).toEqual([]);
        });
    });

    describe('mode any', () => {
        it('counts one selected row as all, none as not all (also for 0 rows)', () => {
            rows = [1, 2, 3];
            const s = create({ mode: 'any' });
            expect(s.isAllSelected()).toBeFalse();
            s.model.select(1);
            expect(s.isAllSelected()).toBeTrue();
            rows = [];
            const empty = create({ mode: 'any' });
            expect(empty.isAllSelected()).toBeFalse();
        });

        it('does not count more selected than shown rows as all; toggle then selects the shown rows', () => {
            rows = [1, 2, 3];
            const s = create({ mode: 'any' });
            s.masterToggle();
            rows = [1, 2];
            expect(s.isAllSelected()).toBeFalse();
            s.masterToggle();
            expect(s.selected.length).toBe(3);
        });

        it('toggle selects every row when none is selected, clears when some is selected', () => {
            rows = [1, 2, 3];
            const s = create({ mode: 'any' });
            s.masterToggle();
            expect(s.selected.sort()).toEqual([1, 2, 3]);
            s.model.deselect(3);
            s.masterToggle();
            expect(s.selected).toEqual([]);
        });
    });

    describe('selectable', () => {
        const even = (n: number) => n % 2 === 0;

        it('toggle selects only selectable rows', () => {
            rows = [1, 2, 3, 4];
            const s = create({ selectable: even });
            s.masterToggle();
            expect(s.selected.sort()).toEqual([2, 4]);
            expect(s.isAllSelected()).toBeTrue();
        });

        it('all is relative to the selectable rows; toggle clears when all selectable are selected', () => {
            rows = [1, 2, 3, 4];
            const s = create({ selectable: even });
            s.model.select(2);
            expect(s.isAllSelected()).toBeFalse();
            s.model.select(4);
            expect(s.isAllSelected()).toBeTrue();
            s.masterToggle();
            expect(s.selected).toEqual([]);
        });

        it('no selectable rows counts as all selected', () => {
            rows = [1, 3];
            const s = create({ selectable: even });
            expect(s.isAllSelected()).toBeTrue();
        });
    });
});
