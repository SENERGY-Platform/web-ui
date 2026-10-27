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

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, provideRouter, Router } from '@angular/router';
import { Location } from '@angular/common';

import { UrlStateService } from './url-state.service';

@Component({ template: '' })
class EmptyComponent {}

/** Keeps a navigation to the guarded route running past the tick it started in, as lazy modules and guards do in the app. */
const slowGuard = () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 5));

/** Lets the batched write and the navigation it starts run to completion. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('UrlStateService', () => {
    let service: UrlStateService;
    let router: Router;
    let navigations: string[];

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'list', component: EmptyComponent },
                    { path: 'other', component: EmptyComponent },
                    { path: 'slow', component: EmptyComponent, canActivate: [slowGuard], runGuardsAndResolvers: 'always' },
                ]),
            ],
        });
        service = TestBed.inject(UrlStateService);
        router = TestBed.inject(Router);
        await router.navigateByUrl('/list?keep=1');
        navigations = [];
        router.events.subscribe((e) => {
            if (e instanceof NavigationStart) {
                navigations.push(e.url);
            }
        });
    });

    it('merges into the query parameters and removes empty values', async () => {
        service.set({ search: 'foo', keep: null, generated: false, ids: ['a', 'b'] });
        await settle();
        expect(router.url).toBe('/list?search=foo&ids=a&ids=b');
    });

    it('replaces the history entry instead of adding one', async () => {
        const location = TestBed.inject(Location);
        spyOn(location, 'go').and.callThrough();
        spyOn(location, 'replaceState').and.callThrough();
        service.set({ search: 'foo' });
        await settle();
        expect(location.replaceState).toHaveBeenCalled();
        expect(location.go).not.toHaveBeenCalled();
    });

    it('sends writes of the same tick as one navigation', async () => {
        service.set({ search: 'foo' });
        service.setPage(3);
        await settle();
        expect(navigations).toEqual(['/list?keep=1&search=foo&page=3']);
    });

    it('does not navigate when nothing changes', async () => {
        service.set({ keep: '1', page: null });
        await settle();
        expect(navigations).toEqual([]);
    });

    it('drops a write when the page is left before it goes out', async () => {
        service.set({ search: 'foo' });
        await router.navigateByUrl('/other');
        await settle();
        expect(router.url).toBe('/other');
    });

    it('waits for a running navigation on the same page and keeps its parameters', async () => {
        const running = router.navigateByUrl('/list?keep=1&hub=h1');
        service.set({ search: 'foo' });
        await running;
        await settle();
        expect(router.url).toBe('/list?keep=1&hub=h1&search=foo');
    });

    it('waits for a navigation that is still running when the write goes out', async () => {
        await router.navigateByUrl('/slow?keep=1');
        const running = router.navigateByUrl('/slow?keep=1&hub=h1');
        service.set({ search: 'foo' });
        await Promise.resolve();
        expect(router.getCurrentNavigation()).not.toBeNull();
        await running;
        await settle();
        expect(router.url).toBe('/slow?keep=1&hub=h1&search=foo');

        // and keeps writing afterwards
        service.setPage(2);
        await settle();
        expect(router.url).toBe('/slow?keep=1&hub=h1&search=foo&page=2');
    });

    it('drops a write when a running navigation leaves the page', async () => {
        const running = router.navigateByUrl('/other');
        service.set({ search: 'foo' });
        await running;
        await settle();
        expect(router.url).toBe('/other');
    });

    it('reads sort and page and falls back on invalid values', async () => {
        await router.navigateByUrl('/list?sort=created_at&dir=desc&page=2');
        expect(service.getSort('name', 'asc')).toEqual({ active: 'created_at', direction: 'desc' });
        expect(service.getPage()).toBe(2);

        await router.navigateByUrl('/list?sort=name%26limit%3D1&dir=up&page=-1');
        expect(service.getSort('name', 'asc')).toEqual({ active: 'name', direction: 'asc' });
        expect(service.getPage()).toBe(0);

        await router.navigateByUrl('/list?sort=name&dir=none');
        expect(service.getSort('name', 'asc')).toEqual({ active: 'name', direction: '' });
    });

    it('writes the default sort as no parameter and returns to the first page', async () => {
        await router.navigateByUrl('/list?page=4');
        service.setSort({ active: 'created_at', direction: 'desc' }, 'name', 'asc');
        await settle();
        expect(router.url).toBe('/list?sort=created_at&dir=desc');

        service.setSort({ active: 'name', direction: 'asc' }, 'name', 'asc');
        await settle();
        expect(router.url).toBe('/list');
    });

    it('reads show and hide toggles with a fallback', async () => {
        await router.navigateByUrl('/list?a=show&b=hide&c=true');
        expect(service.getShown('a', false)).toBeTrue();
        expect(service.getShown('b', true)).toBeFalse();
        expect(service.getShown('c', false)).toBeFalse();
        expect(service.getShown('d', true)).toBeTrue();
    });

    it('reads booleans with a fallback', async () => {
        await router.navigateByUrl('/list?a=true&b=false&c=yes');
        expect(service.getBoolean('a', false)).toBeTrue();
        expect(service.getBoolean('b', true)).toBeFalse();
        expect(service.getBoolean('c', true)).toBeTrue();
        expect(service.getBoolean('d', false)).toBeFalse();
    });
});
