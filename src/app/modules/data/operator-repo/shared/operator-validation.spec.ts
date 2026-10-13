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

import {IOModel} from './operator.model';
import {blockingIncompleteRows, duplicateNames, hasBlockingRows, isIncomplete, lookalikeNames, newDuplicateNames, stateMatcher} from './operator-validation';

const io = (...names: (string | undefined)[]) => names.map(name => ({name, type: 'string'}) as IOModel);

describe('duplicateNames', () => {
    it('finds a name that occurs twice, once', () => {
        expect([...duplicateNames(io('a', 'b', 'a', 'a'))]).toEqual(['a']);
    });

    it('compares exactly like the repository: case and spaces matter, rows without a name are skipped', () => {
        expect(duplicateNames(io('a', 'A', ' a', undefined, undefined, '', '')).size).toBe(0);
    });

    it('accepts a missing list', () => {
        expect(duplicateNames(undefined).size).toBe(0);
    });
});

describe('newDuplicateNames', () => {
    it('reports a duplicate the edit introduced', () => {
        expect([...newDuplicateNames(io('a', 'a'), io('a'))]).toEqual(['a']);
        expect([...newDuplicateNames(io('a', 'b', 'b'), undefined)]).toEqual(['b']);
    });

    it('tolerates a duplicate that was stored already, but not one more of them', () => {
        expect(newDuplicateNames(io('a', 'a'), io('a', 'a')).size).toBe(0);
        expect([...newDuplicateNames(io('a', 'a', 'a'), io('a', 'a'))]).toEqual(['a']);
    });
});

describe('lookalikeNames', () => {
    it('finds names that differ only in surrounding spaces', () => {
        expect([...lookalikeNames(io('a', 'a ', 'b'))].sort()).toEqual(['a', 'a ']);
    });

    it('leaves exact duplicates and unrelated names alone', () => {
        expect(lookalikeNames(io('a', 'a', 'b', undefined)).size).toBe(0);
    });
});

describe('isIncomplete', () => {
    it('needs a name and a type', () => {
        expect(isIncomplete({name: 'a', type: 'float'})).toBeFalse();
        expect(isIncomplete({} as IOModel)).toBeTrue();
        expect(isIncomplete({name: '  ', type: 'float'})).toBeTrue();
        expect(isIncomplete({name: 'a'} as IOModel)).toBeTrue();
    });
});

describe('blockingIncompleteRows', () => {
    const row = (name?: string, type?: string) => ({name, type}) as IOModel;

    it('blocks every incomplete row when nothing is stored', () => {
        const rows = [row('a'), row(undefined, 'float'), row('b', 'float')];
        expect([...blockingIncompleteRows(rows, undefined)]).toEqual([rows[0], rows[1]]);
    });

    it('lets a stored incomplete row through while it is unchanged', () => {
        const stored = [row('a'), row(undefined, 'float')];
        const rows = stored.map(r => ({...r}));
        expect(blockingIncompleteRows(rows, stored).size).toBe(0);
    });

    it('blocks a stored incomplete row once it is edited, and one more of the same kind', () => {
        const stored = [row('a')];
        expect(blockingIncompleteRows([row('b')], stored).size).toBe(1);
        const rows = [row('a'), row('a')];
        expect([...blockingIncompleteRows(rows, stored)]).toEqual([rows[1]]);
    });
});

describe('hasBlockingRows', () => {
    it('blocks an incomplete row and a new duplicate, not a stored duplicate', () => {
        expect(hasBlockingRows([{} as IOModel], undefined)).toBeTrue();
        expect(hasBlockingRows(io('a', 'a'), io('a'))).toBeTrue();
        expect(hasBlockingRows(io('a', 'a'), io('a', 'a'))).toBeFalse();
        expect(hasBlockingRows(undefined, undefined)).toBeFalse();
        expect(hasBlockingRows([{name: 'a'} as IOModel], [{name: 'a'} as IOModel])).toBeFalse();
    });
});

describe('stateMatcher', () => {
    it('follows the rule, not the control', () => {
        let error = false;
        const matcher = stateMatcher(() => error);
        expect(matcher.isErrorState(null, null)).toBeFalse();
        error = true;
        expect(matcher.isErrorState(null, null)).toBeTrue();
    });
});
