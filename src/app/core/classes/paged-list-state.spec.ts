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


import { DestroyRef } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Observable, of, Subject } from 'rxjs';
import { PagedListState } from './paged-list-state';
import { PreferencesService } from '../services/preferences.service';
import { UrlStateService } from '../services/url-state.service';

describe('PagedListState', () => {
    let preferences: { pageSize: number };
    let paginator: { page: Subject<PageEvent>; pageSize: number; pageIndex: number };
    let destroyCallbacks: (() => void)[];
    let destroyRef: DestroyRef;
    let loads: Subject<string>[];
    let applied: string[];
    let state: PagedListState;

    beforeEach(() => {
        preferences = { pageSize: 50 };
        paginator = { page: new Subject<PageEvent>(), pageSize: 50, pageIndex: 0 };
        destroyCallbacks = [];
        destroyRef = {
            onDestroy: (cb: () => void) => {
                destroyCallbacks.push(cb);
                return () => undefined;
            },
        } as unknown as DestroyRef;
        loads = [];
        applied = [];
        const load = (): Observable<unknown> => {
            const answer = new Subject<string>();
            loads.push(answer);
            return new Observable<string>((subscriber) => answer.subscribe({
                next: (v) => {
                    applied.push(v);
                    subscriber.next(v);
                },
                error: (e) => subscriber.error(e),
            }));
        };
        state = new PagedListState(preferences as unknown as PreferencesService, load, { sortBy: 'name', sortDirection: 'asc' });
        state.connect(paginator as unknown as MatPaginator, destroyRef);
    });

    it('starts with the stored page size, the default sort and offset 0', () => {
        expect(state.pageSize).toBe(50);
        expect(state.offset).toBe(0);
        expect(state.sortBy).toBe('name');
        expect(state.sortDirection).toBe('asc');
    });

    it('a page event stores the page size, derives the offset and loads', () => {
        paginator.pageSize = 20;
        paginator.pageIndex = 3;
        paginator.page.next({ pageIndex: 3, pageSize: 20, length: 200 });

        expect(preferences.pageSize).toBe(20);
        expect(state.pageSize).toBe(20);
        expect(state.offset).toBe(60);
        expect(loads.length).toBe(1);
    });

    it('reload returns to the first page and loads', () => {
        state.offset = 60;
        paginator.pageIndex = 3;

        state.reload();

        expect(state.offset).toBe(0);
        expect(paginator.pageIndex).toBe(0);
        expect(loads.length).toBe(1);
    });

    it('reload works before a paginator is connected', () => {
        const load = jasmine.createSpy('load').and.returnValue(of(1));
        const unconnected = new PagedListState(preferences as unknown as PreferencesService, load, { sortBy: 'name', sortDirection: 'asc' });
        unconnected.offset = 40;

        unconnected.reload();

        expect(unconnected.offset).toBe(0);
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('drops the answer of a load that a newer one superseded', () => {
        state.reload();
        state.reload();
        loads[1].next('new');
        loads[0].next('old');

        expect(applied).toEqual(['new']);
    });

    it('refresh keeps the page and drops the answer of the load it superseded', () => {
        state.offset = 60;
        paginator.pageIndex = 3;

        state.refresh();
        state.refresh();
        loads[1].next('new');
        loads[0].next('old');

        expect(state.offset).toBe(60);
        expect(paginator.pageIndex).toBe(3);
        expect(applied).toEqual(['new']);
    });

    it('a page change supersedes a reload and still reports the reload as done', () => {
        const done = jasmine.createSpy('done');
        state.reload(done);
        paginator.page.next({ pageIndex: 1, pageSize: 50, length: 200 });
        loads[0].next('old');
        expect(done).not.toHaveBeenCalled();

        loads[1].next('page 2');

        expect(applied).toEqual(['page 2']);
        expect(done).toHaveBeenCalledTimes(1);
    });

    it('hands a failed load to the error handler of the reload', () => {
        const error = jasmine.createSpy('error');
        state.reload({ error });

        loads[0].error('boom');

        expect(error).toHaveBeenCalledWith('boom');
    });

    it('stops the load in flight when the page is destroyed', () => {
        state.reload();
        destroyCallbacks.forEach((cb) => cb());
        loads[0].next('late');

        expect(applied).toEqual([]);
    });

    it('sortChanged takes the column and direction as they are', () => {
        state.sortChanged({ active: 'created_at', direction: 'desc' });

        expect(state.sortBy).toBe('created_at');
        expect(state.sortDirection).toBe('desc');
    });

    it('sortChanged translates remapped columns to backend keys and leaves the others alone', () => {
        const remap = { log_state: 'annotations.connected' };

        state.sortChanged({ active: 'log_state', direction: 'asc' }, remap);
        expect(state.sortBy).toBe('annotations.connected');

        state.sortChanged({ active: 'display_name', direction: 'asc' }, remap);
        expect(state.sortBy).toBe('display_name');
    });

    describe('kept in the URL', () => {
        let url: jasmine.SpyObj<UrlStateService>;
        let inUrl: PagedListState;

        const create = (sort: { active: string; direction: 'asc' | 'desc' | '' }, page: number) => {
            url = jasmine.createSpyObj<UrlStateService>('UrlStateService', ['getSort', 'getPage', 'setPage', 'setSort']);
            url.getSort.and.returnValue(sort);
            url.getPage.and.returnValue(page);
            inUrl = new PagedListState(preferences as unknown as PreferencesService, load, {
                sortBy: 'display_name',
                sortDirection: 'asc',
                remap: { log_state: 'annotations.connected' },
                urlState: url,
            });
            inUrl.connect(paginator as unknown as MatPaginator, destroyRef);
        };
        let load: () => Observable<unknown>;

        beforeEach(() => {
            load = jasmine.createSpy('load').and.callFake(() => of(1));
        });

        it('restores sort and page before the first load, the sort through the remap', () => {
            create({ active: 'log_state', direction: 'desc' }, 3);

            expect(url.getSort).toHaveBeenCalledWith('display_name', 'asc');
            expect(inUrl.sortColumn).toBe('log_state');
            expect(inUrl.sortBy).toBe('annotations.connected');
            expect(inUrl.sortDirection).toBe('desc');
            expect(inUrl.pageIndex).toBe(3);
            expect(inUrl.offset).toBe(150);
            expect(load).not.toHaveBeenCalled();
        });

        it('the first reload keeps the page from the URL, every later one returns to the first page', () => {
            create({ active: 'display_name', direction: 'asc' }, 3);
            paginator.pageIndex = 3;

            inUrl.reload();
            expect(inUrl.offset).toBe(150);
            expect(inUrl.pageIndex).toBe(3);
            expect(paginator.pageIndex).toBe(3);
            expect(url.setPage).not.toHaveBeenCalled();

            inUrl.reload();
            expect(inUrl.offset).toBe(0);
            expect(inUrl.pageIndex).toBe(0);
            expect(paginator.pageIndex).toBe(0);
            expect(url.setPage).toHaveBeenCalledOnceWith(0);
            expect(load).toHaveBeenCalledTimes(2);
        });

        it('a page event before the opening load is the page the opening load keeps', () => {
            create({ active: 'display_name', direction: 'asc' }, 9);
            paginator.pageIndex = 4;
            paginator.page.next({ pageIndex: 4, previousPageIndex: 9, pageSize: 50, length: 230 });

            inUrl.reload();

            expect(inUrl.pageIndex).toBe(4);
            expect(inUrl.offset).toBe(200);
            expect(url.setPage.calls.allArgs()).toEqual([[4]]);
        });

        it('a page event writes the page', () => {
            create({ active: 'display_name', direction: 'asc' }, 0);
            paginator.pageIndex = 2;
            paginator.page.next({ pageIndex: 2, pageSize: 50, length: 200 });

            expect(inUrl.pageIndex).toBe(2);
            expect(url.setPage).toHaveBeenCalledOnceWith(2);
        });

        it('a sort change writes the sort against the defaults and the reload after it returns to the first page', () => {
            create({ active: 'display_name', direction: 'asc' }, 3);
            const sort = { active: 'log_state', direction: 'desc' as const };

            inUrl.sortChanged(sort);
            inUrl.reload();

            expect(url.setSort).toHaveBeenCalledOnceWith(sort, 'display_name', 'asc');
            expect(inUrl.sortBy).toBe('annotations.connected');
            expect(inUrl.sortColumn).toBe('log_state');
            expect(inUrl.offset).toBe(0);
            expect(url.setPage).toHaveBeenCalledOnceWith(0);
        });
    });

    it('without the URL the first reload returns to the first page as well', () => {
        paginator.pageIndex = 2;
        paginator.page.next({ pageIndex: 2, pageSize: 50, length: 200 });

        state.reload();

        expect(state.offset).toBe(0);
        expect(state.pageIndex).toBe(0);
    });
});
