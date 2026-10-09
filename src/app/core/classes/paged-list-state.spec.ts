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
});
