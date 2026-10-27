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

import { Injectable } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, Params, Router } from '@angular/router';
import { Sort, SortDirection } from '@angular/material/sort';
import { filter, take } from 'rxjs';

export type UrlStateValue = string | number | boolean | string[] | null | undefined;

/** Sort keys end up in backend query strings, some of them concatenated, so only plain field names are taken from the URL. */
const SORT_KEY = /^[A-Za-z0-9_.:-]+$/;

/**
 * Keeps the view state of a routed page (search, filters, sort, page, tab) in query parameters, so a reload or a
 * shared link restores it. See docs/view-state-lives-in-the-url.md.
 *
 * Writes merge into the current query parameters and replace the history entry. Writes made in the same tick go out
 * as one navigation. A write never interrupts another navigation: it waits for that one to finish and is dropped if
 * the page was left in the meantime.
 */
@Injectable({
    providedIn: 'root',
})
export class UrlStateService {
    private pending: { path: string; params: Params } | null = null;

    constructor(private router: Router) {}

    get(key: string): string | null {
        return this.router.parseUrl(this.router.url).queryParamMap.get(key);
    }

    getAll(key: string): string[] {
        return this.router.parseUrl(this.router.url).queryParamMap.getAll(key);
    }

    getBoolean(key: string, fallback: boolean): boolean {
        const value = this.get(key);
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }
        return fallback;
    }

    /** Reads a toggle written as `show` or `hide`, so the same key means the same on every page. */
    getShown(key: string, fallback: boolean): boolean {
        const value = this.get(key);
        if (value === 'show') {
            return true;
        }
        if (value === 'hide') {
            return false;
        }
        return fallback;
    }

    getInt(key: string, fallback: number): number {
        const value = this.get(key);
        if (value === null || !/^\d+$/.test(value)) {
            return fallback;
        }
        return parseInt(value, 10);
    }

    /** The zero-based page index from `page`. */
    getPage(): number {
        return this.getInt('page', 0);
    }

    /** Sort column and direction from `sort` and `dir`, the defaults where the URL names none or an invalid one. */
    getSort(defaultActive: string, defaultDirection: SortDirection): { active: string; direction: SortDirection } {
        const active = this.get('sort');
        const dir = this.get('dir');
        return {
            active: active !== null && SORT_KEY.test(active) ? active : defaultActive,
            direction: dir === 'asc' || dir === 'desc' ? dir : dir === 'none' ? '' : defaultDirection,
        };
    }

    /**
     * Merges the given parameters into the URL. `null`, `undefined`, `''`, `false` and an empty list remove a
     * parameter, so a page passes the default of a value as `null` and keeps the URL short.
     */
    set(params: { [key: string]: UrlStateValue }): void {
        const path = this.path();
        if (this.pending === null || this.pending.path !== path) {
            const first = this.pending === null;
            this.pending = { path, params: {} };
            if (first) {
                queueMicrotask(() => this.flush());
            }
        }
        Object.entries(params).forEach(([key, value]) => {
            this.pending!.params[key] = this.normalize(value);
        });
    }

    /** Writes the sort and returns the list to its first page, since another order puts other rows on every page. */
    setSort(sort: Sort, defaultActive: string, defaultDirection: SortDirection): void {
        const isDefault = sort.active === defaultActive && sort.direction === defaultDirection;
        this.set({
            sort: isDefault ? null : sort.active,
            dir: isDefault ? null : sort.direction === '' ? 'none' : sort.direction,
            page: null,
        });
    }

    setPage(pageIndex: number): void {
        this.set({ page: pageIndex > 0 ? pageIndex : null });
    }

    private flush(): void {
        if (this.pending === null) {
            return;
        }
        if (this.router.getCurrentNavigation() !== null) {
            this.router.events
                .pipe(
                    filter((e) => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError || e instanceof NavigationSkipped),
                    take(1),
                )
                // the router emits NavigationEnd before it clears the current navigation, so the check runs again
                // once that has happened
                .subscribe(() => queueMicrotask(() => this.flush()));
            return;
        }
        const { path, params } = this.pending;
        this.pending = null;

        if (this.path() !== path) {
            // the page that wrote these parameters is gone
            return;
        }
        const current = this.router.parseUrl(this.router.url);
        const queryParams: Params = { ...current.queryParams };
        Object.entries(params).forEach(([key, value]) => {
            if (value === null) {
                delete queryParams[key];
            } else {
                queryParams[key] = value;
            }
        });
        const target = this.router.createUrlTree([], { queryParams, fragment: current.fragment ?? undefined });
        if (this.router.serializeUrl(target) === this.router.serializeUrl(current)) {
            return;
        }
        this.router.navigateByUrl(target, { replaceUrl: true });
    }

    private normalize(value: UrlStateValue): string | string[] | null {
        if (value === null || value === undefined || value === '' || value === false) {
            return null;
        }
        if (Array.isArray(value)) {
            return value.length > 0 ? value : null;
        }
        return String(value);
    }

    private path(): string {
        return this.router.url.split(/[?#]/)[0];
    }
}
