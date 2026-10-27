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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatPaginator } from '@angular/material/paginator';
import { Sort, SortDirection } from '@angular/material/sort';
import { Observable, Observer, Subscription } from 'rxjs';
import { PreferencesService } from '../services/preferences.service';
import { UrlStateService } from '../services/url-state.service';

export interface PagedListOptions {
    /** The default sort column; also the backend key unless `remap` names another. */
    sortBy: string;
    sortDirection: SortDirection;
    /** Column names whose backend sort key differs, used for a sort from the URL as for a header click. */
    remap?: Record<string, string>;
    /** Keeps sort and page of a routed list in the URL, see docs/view-state-lives-in-the-url.md. */
    urlState?: UrlStateService;
}

/**
 * Paging and sort state of a server-side list page. A reload starts at the first page and only the latest
 * load stays subscribed, so the answer of a superseded request can never overwrite a newer one.
 * With `urlState`, sort and page come from the URL and every change is written back; the first reload is the
 * opening load and keeps the page from the URL.
 */
export class PagedListState {
    pageSize: number;
    offset = 0;
    /** Bound as `[pageIndex]` on the paginator, so a page from the URL shows from the first render. */
    pageIndex = 0;
    /** The backend sort key. */
    sortBy: string;
    /** The column header the sort shows on, bound as `[matSortActive]` where `remap` is used. */
    sortColumn: string;
    sortDirection: SortDirection;
    private paginator?: MatPaginator;
    private loadSub = new Subscription();
    // the observer of the latest reload, kept until a load answers so a page change cannot swallow it
    private pending?: Partial<Observer<unknown>>;
    private keepPageOnReload: boolean;

    /** `load` fetches the page described by this state and applies the answer to the page. */
    constructor(
        private readonly preferencesService: PreferencesService,
        private readonly load: () => Observable<unknown>,
        private readonly options: PagedListOptions,
    ) {
        this.pageSize = preferencesService.pageSize;
        const urlState = options.urlState;
        const sort = urlState?.getSort(options.sortBy, options.sortDirection) ?? { active: options.sortBy, direction: options.sortDirection };
        this.sortColumn = sort.active;
        this.sortBy = options.remap?.[sort.active] ?? sort.active;
        this.sortDirection = sort.direction;
        this.pageIndex = urlState?.getPage() ?? 0;
        this.offset = this.pageSize * this.pageIndex;
        this.keepPageOnReload = urlState !== undefined;
    }

    /** Follows the paginator: a page event stores the page size and loads the chosen page. */
    connect(paginator: MatPaginator, destroyRef: DestroyRef): void {
        this.paginator = paginator;
        paginator.page.pipe(takeUntilDestroyed(destroyRef)).subscribe((e) => {
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = paginator.pageSize;
            this.pageIndex = paginator.pageIndex;
            this.offset = paginator.pageSize * paginator.pageIndex;
            this.options.urlState?.setPage(this.pageIndex);
            this.run();
        });
        destroyRef.onDestroy(() => this.loadSub.unsubscribe());
    }

    /**
     * Goes back to the first page, drops the load in flight and loads again; `observer` follows the answer.
     * The first reload of a list kept in the URL is the opening load and stays on the page the list was opened with.
     */
    reload(observer?: Partial<Observer<unknown>> | (() => void)): void {
        if (this.keepPageOnReload) {
            this.keepPageOnReload = false;
        } else {
            this.offset = 0;
            this.pageIndex = 0;
            if (this.paginator) {
                this.paginator.pageIndex = 0;
            }
            this.options.urlState?.setPage(0);
        }
        this.pending = typeof observer === 'function' ? { next: () => observer() } : observer;
        this.run();
    }

    /** Loads the current page again and drops the load in flight, without going back to the first page. */
    refresh(): void {
        this.run();
    }

    /**
     * Takes over the sort and writes it to the URL; the page reloads afterwards. `remap` translates column names to
     * backend keys and defaults to the one in the options.
     */
    sortChanged(event: Sort, remap = this.options.remap): void {
        this.sortColumn = event.active;
        this.sortBy = remap?.[event.active] ?? event.active;
        this.sortDirection = event.direction;
        // another order puts other rows on every page, so the reload that follows returns to the first one
        this.keepPageOnReload = false;
        this.options.urlState?.setSort(event, this.options.sortBy, this.options.sortDirection);
    }

    private run(): void {
        this.loadSub.unsubscribe();
        this.loadSub = this.load().subscribe({
            next: (value) => this.settle()?.next?.(value),
            error: (err) => {
                const observer = this.settle();
                if (!observer?.error) {
                    throw err;
                }
                observer.error(err);
            },
        });
    }

    private settle(): Partial<Observer<unknown>> | undefined {
        const observer = this.pending;
        this.pending = undefined;
        return observer;
    }
}
