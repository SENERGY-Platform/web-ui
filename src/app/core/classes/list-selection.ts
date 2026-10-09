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

import { SelectionModel } from '@angular/cdk/collections';

export interface ListSelectionOptions<T> {
    /** Rows that can be selected; the master toggle and the "all" check only consider these. */
    selectable?: (row: T) => boolean;
    /** 'all': every row selected. 'any': a selection of one up to the number of rows counts as all. */
    mode?: 'all' | 'any';
}

/** Row selection of a list page with a master toggle; `getRows` returns the rows currently shown. */
export class ListSelection<T> {
    readonly model = new SelectionModel<T>(true, []);

    constructor(
        private readonly getRows: () => T[],
        private readonly options: ListSelectionOptions<T> = {},
    ) {}

    get selected(): T[] {
        return this.model.selected;
    }

    isAllSelected(): boolean {
        if (this.options.mode === 'any') {
            const numSelected = this.model.selected.length;
            return numSelected > 0 && numSelected <= this.getRows().length;
        }
        return this.model.selected.length === this.selectableRows().length;
    }

    masterToggle(): void {
        if (this.isAllSelected()) {
            this.clear();
        } else {
            this.selectableRows().forEach((row) => this.model.select(row));
        }
    }

    clear(): void {
        this.model.clear();
    }

    private selectableRows(): T[] {
        const rows = this.getRows();
        return this.options.selectable ? rows.filter(this.options.selectable) : rows;
    }
}
