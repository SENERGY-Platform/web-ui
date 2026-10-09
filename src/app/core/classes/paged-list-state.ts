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

export interface PagedListOptions {
    sortBy: string;
    sortDirection: SortDirection;
}

/**
 * Paging and sort state of a server-side list page. A reload starts at the first page and only the latest
 * load stays subscribed, so the answer of a superseded request can never overwrite a newer one.
 */
export class PagedListState {
    pageSize: number;
    offset = 0;
    sortBy: string;
    sortDirection: SortDirection;
    private paginator?: MatPaginator;
    private loadSub = new Subscription();
    // the observer of the latest reload, kept until a load answers so a page change cannot swallow it
    private pending?: Partial<Observer<unknown>>;

    /** `load` fetches the page described by this state and applies the answer to the page. */
    constructor(
        private readonly preferencesService: PreferencesService,
        private readonly load: () => Observable<unknown>,
        options: PagedListOptions,
    ) {
        this.pageSize = preferencesService.pageSize;
        this.sortBy = options.sortBy;
        this.sortDirection = options.sortDirection;
    }

    /** Follows the paginator: a page event stores the page size and loads the chosen page. */
    connect(paginator: MatPaginator, destroyRef: DestroyRef): void {
        this.paginator = paginator;
        paginator.page.pipe(takeUntilDestroyed(destroyRef)).subscribe((e) => {
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = paginator.pageSize;
            this.offset = paginator.pageSize * paginator.pageIndex;
            this.run();
        });
        destroyRef.onDestroy(() => this.loadSub.unsubscribe());
    }

    /** Goes back to the first page, drops the load in flight and loads again; `observer` follows the answer. */
    reload(observer?: Partial<Observer<unknown>> | (() => void)): void {
        this.offset = 0;
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.pending = typeof observer === 'function' ? { next: () => observer() } : observer;
        this.run();
    }

    /** Takes over the sort; the page reloads afterwards. `remap` translates column names to backend keys. */
    sortChanged(event: Sort, remap?: Record<string, string>): void {
        this.sortBy = remap?.[event.active] ?? event.active;
        this.sortDirection = event.direction;
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
