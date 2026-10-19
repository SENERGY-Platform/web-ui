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

import { Observable, of } from 'rxjs';
import { loadAllPages } from './load-all-pages';

describe('loadAllPages', () => {
    const rows = Array.from({ length: 1200 }, (_, i) => i);
    let fetchPage: jasmine.Spy;

    beforeEach(() => {
        fetchPage = jasmine.createSpy('fetchPage').and.callFake((limit: number, offset: number): Observable<number[]> => of(rows.slice(offset, offset + limit)));
    });

    it('collects all pages in order and stops at the first short page', (done) => {
        loadAllPages(fetchPage, 500).subscribe((all) => {
            expect(all).toEqual(rows);
            expect(fetchPage.calls.allArgs()).toEqual([[500, 0], [500, 500], [500, 1000]]);
            done();
        });
    });

    it('asks once more after a full last page and ends on the empty answer', (done) => {
        loadAllPages(fetchPage, 400).subscribe((all) => {
            expect(all.length).toBe(1200);
            expect(fetchPage.calls.count()).toBe(4);
            done();
        });
    });

    it('goes on after a short page until an empty one when asked to', (done) => {
        const pages = [[1], [2, 3], []];
        fetchPage.and.callFake(() => of(pages.shift() || []));
        loadAllPages(fetchPage, 3, true).subscribe((all) => {
            expect(all).toEqual([1, 2, 3]);
            expect(fetchPage.calls.allArgs()).toEqual([[3, 0], [3, 3], [3, 6]]);
            done();
        });
    });

    it('answers an empty list with one request', (done) => {
        fetchPage.and.returnValue(of([]));
        loadAllPages(fetchPage).subscribe((all) => {
            expect(all).toEqual([]);
            expect(fetchPage).toHaveBeenCalledTimes(1);
            done();
        });
    });
});
