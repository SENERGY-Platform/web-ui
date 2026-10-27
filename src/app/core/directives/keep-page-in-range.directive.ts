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

import { Directive, Input, OnChanges, inject } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';

/**
 * Moves a paginator that stands on a page beyond its length to the last page - a page from the URL of a list that has
 * since become shorter. It goes there through the page event a click emits, so the list loads that page and writes it
 * to the URL like after any page change. See docs/view-state-lives-in-the-url.md.
 */
@Directive({
    selector: 'mat-paginator[senergyKeepPageInRange]',
})
export class KeepPageInRangeDirective implements OnChanges {
    // the paginator's own inputs, bound here as well to notice when the page or the length changes
    @Input() length = 0;
    @Input() pageIndex = 0;

    private paginator = inject(MatPaginator);

    ngOnChanges(): void {
        // after change detection: the page event makes the list change its own fields and load
        Promise.resolve().then(() => this.keepInRange());
    }

    private keepInRange(): void {
        // a length of 0 is also what a list shows before its first answer, so it decides nothing
        if (this.paginator.length <= 0) {
            return;
        }
        const lastPageIndex = Math.max(0, this.paginator.getNumberOfPages() - 1);
        const previousPageIndex = this.paginator.pageIndex;
        if (previousPageIndex <= lastPageIndex) {
            return;
        }
        this.paginator.pageIndex = lastPageIndex;
        this.paginator.page.emit({
            pageIndex: lastPageIndex,
            previousPageIndex,
            pageSize: this.paginator.pageSize,
            length: this.paginator.length,
        });
    }
}
