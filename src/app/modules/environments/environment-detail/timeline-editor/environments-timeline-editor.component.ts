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

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { DatedChange } from '../../shared/environments.model';
import { TimelineTargetOption } from '../../shared/environments-timeline-targets';
import { NodeProblem } from '../../shared/environments-path';
import { toLocalDateTimeInput, toRfc3339Seconds } from '../../shared/environments-datetime';

/** Parses a timeline problem's suffix, e.g. "timeline[1].at" -> index 1, field "at" (undefined for one naming the whole entry). */
const ROW_SUFFIX_RE = /^timeline\[(\d+)\](?:\.(.+))?$/;

interface RowProblem {
    field?: string;
    message: string;
}

/**
 * One row's template-facing data, precomputed instead of calling localValue()/rowProblems()/
 * clientProblems() from the template on every change-detection pass -- see rebuildRowViews,
 * which is the one place that still calls them, once per actual data change. `index` is the
 * row's position in the full (unpaginated) `timeline`, which is what moveRowUp/moveRowDown/
 * removeRow and the server's index-based problem paths key on.
 */
interface RowView {
    row: DatedChange;
    index: number;
    localAt: string;
    problems: RowProblem[];
    clientProblems: string[];
    hasProblem: boolean;
}

export const TIMELINE_PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
export const TIMELINE_DEFAULT_PAGE_SIZE = 50;

/**
 * The timeline editor: one row per DatedChange (when/target/value), add/remove/reorder like the
 * schedule editor's state list. Mutates `timeline` in place; `timelineChange` is only a
 * "something in here changed, mark dirty" signal, not a replacement value -- same convention as
 * every other source editor in this module. `timelineRestructured` is the narrower signal for
 * add/remove/move: the parent needs it to drop stale index-based problems, the same way it does
 * for the faults editor (see afterStructuralChange in environment-detail.component.ts).
 *
 * Paginated (SNRGY-4739): a large environment's timeline can run into the thousands of entries,
 * and rendering every row's mtx-select/inputs/tooltips at once made the page unusably slow. Only
 * the current page's rows reach the DOM; a row keeps its absolute `timeline` index regardless of
 * which page it is shown on, so server problem paths (`timeline[i]`) and moveRow's splicing stay
 * unaffected by pagination.
 *
 * pageIndex/pageSize are inputs, not private state: environment-detail.component.html's
 * `*ngIf="dataReady && environment"` destroys and recreates this whole component around every
 * load() (including the reload after a save), so a page chosen here would otherwise be lost on
 * every save. The parent holds the values across that destroy/recreate and passes them back in;
 * this component only proposes changes via the *Change outputs.
 */
@Component({
    selector: 'senergy-environments-timeline-editor',
    templateUrl: './environments-timeline-editor.component.html',
    styleUrls: ['./environments-timeline-editor.component.css'],
})
export class EnvironmentsTimelineEditorComponent implements OnChanges {
    @Input() timeline: DatedChange[] | undefined;
    @Input() targetOptions: TimelineTargetOption[] = [];
    /** The environment node's problems (environment-detail's selectedNodeProblems); filtered internally to the ones naming a timeline entry. */
    @Input() problems: NodeProblem[] = [];
    @Output() timelineChange = new EventEmitter<void>();
    /** Fires on add/remove/move only, not on a field edit -- see the class comment. */
    @Output() timelineRestructured = new EventEmitter<void>();

    @Input() pageIndex = 0;
    @Output() pageIndexChange = new EventEmitter<number>();
    @Input() pageSize = TIMELINE_DEFAULT_PAGE_SIZE;
    @Output() pageSizeChange = new EventEmitter<number>();
    readonly pageSizeOptions = TIMELINE_PAGE_SIZE_OPTIONS;

    /** The current page's rows, precomputed -- bound directly in the template instead of calling a method per row per pass. */
    visibleRows: RowView[] = [];
    /** Absolute (unpaginated) indexes of every row with a problem, in ascending order -- drives the "N rows have a problem, jump to first" summary. */
    problemRowIndexes: number[] = [];

    /** Every row as a precomputed view model, rebuilt in rebuildRowViews -- visibleRows is this array's current page slice. */
    private rowViews: RowView[] = [];

    /** Per-row server problems, indexed by row; rebuilt in ngOnChanges instead of re-parsing every problem's suffix on every *ngIf/*ngFor read of rowProblems. */
    private rowProblemsByIndex = new Map<number, RowProblem[]>();

    /** Row indexes that duplicate an earlier row's target+at, rebuilt by indexDuplicates() so clientProblems stays O(1) per row instead of O(n) per row (O(n²) per recompute). */
    private duplicateRowIndexes = new Set<number>();

    ngOnChanges(changes: SimpleChanges): void {
        let needsRebuild = false;
        if (changes['problems']) {
            this.indexRowProblems();
            needsRebuild = true;
        }
        if (changes['timeline']) {
            this.indexDuplicates();
            // Not a reset to 0: pageIndex may be an input the parent restored after a reload
            // (see the class comment), so a shorter timeline only clamps it back into range.
            this.clampPageIndex();
            needsRebuild = true;
        }
        if (needsRebuild) {
            this.rebuildRowViews();
        }
    }

    private indexRowProblems(): void {
        this.rowProblemsByIndex = new Map();
        this.problems.forEach((p) => {
            const match = p.suffix ? ROW_SUFFIX_RE.exec(p.suffix) : null;
            if (!match) {
                return;
            }
            const index = parseInt(match[1], 10);
            const existing = this.rowProblemsByIndex.get(index) || [];
            existing.push({ field: match[2], message: p.message });
            this.rowProblemsByIndex.set(index, existing);
        });
    }

    /** Walks the timeline once, keyed by `${target} ${at}`, marking every index but the first that shares a key -- empty at/target never join a key, so a fresh row (see addRow) is never a duplicate. */
    private indexDuplicates(): void {
        this.duplicateRowIndexes = new Set();
        const firstIndexByKey = new Map<string, number>();
        (this.timeline || []).forEach((row, index) => {
            if (!row.at || !row.target) {
                return;
            }
            const key = `${row.target} ${row.at}`;
            if (firstIndexByKey.has(key)) {
                this.duplicateRowIndexes.add(index);
            } else {
                firstIndexByKey.set(key, index);
            }
        });
    }

    /**
     * (Re)builds every row's view model -- via localValue/rowProblems/clientProblems/hasRowProblem,
     * the same methods a direct caller (or a test) uses, so there is exactly one implementation of
     * each -- then refreshes the current page's slice and the problem-row index. Called once per
     * actual change, not per change-detection pass.
     */
    private rebuildRowViews(): void {
        this.rowViews = (this.timeline || []).map((row, index) => ({
            row,
            index,
            localAt: this.localValue(row),
            problems: this.rowProblems(index),
            clientProblems: this.clientProblems(row, index),
            hasProblem: this.hasRowProblem(index),
        }));
        this.problemRowIndexes = this.rowViews.filter((rv) => rv.hasProblem).map((rv) => rv.index);
        this.refreshVisibleRows();
    }

    private refreshVisibleRows(): void {
        const start = this.pageIndex * this.pageSize;
        this.visibleRows = this.rowViews.slice(start, start + this.pageSize);
    }

    /** Sets pageIndex and emits pageIndexChange when it actually moves -- the single place that changes it, so every caller's intent (jump to a row, follow a move, clamp after a shrink) reaches the parent the same way. */
    private setPageIndex(index: number): void {
        if (this.pageIndex !== index) {
            this.pageIndex = index;
            this.pageIndexChange.emit(index);
        }
    }

    /** Keeps pageIndex in range for the current timeline length and pageSize (e.g. after removeRow empties the last page, or a shorter timeline comes back in as an input). */
    private clampPageIndex(): void {
        const totalPages = Math.max(1, Math.ceil((this.timeline?.length || 0) / this.pageSize));
        this.setPageIndex(Math.min(this.pageIndex, totalPages - 1));
    }

    onPage(event: PageEvent): void {
        if (this.pageSize !== event.pageSize) {
            this.pageSize = event.pageSize;
            this.pageSizeChange.emit(event.pageSize);
        }
        this.setPageIndex(event.pageIndex);
        this.refreshVisibleRows();
    }

    /** Jumps to whichever page holds the earliest row with a problem -- the only way to reach a server-reported problem on a row outside the current page. */
    jumpToFirstProblem(): void {
        if (this.problemRowIndexes.length === 0) {
            return;
        }
        this.setPageIndex(Math.floor(this.problemRowIndexes[0] / this.pageSize));
        this.refreshVisibleRows();
    }

    onFieldChange(): void {
        this.indexDuplicates();
        this.rebuildRowViews();
        this.timelineChange.emit();
    }

    addRow(): void {
        if (!this.timeline) {
            return;
        }
        this.timeline.push({ at: '', target: '', value: 0 });
        this.setPageIndex(Math.floor((this.timeline.length - 1) / this.pageSize)); // the new row jumps into view
        this.onFieldChange();
        this.timelineRestructured.emit();
    }

    removeRow(index: number): void {
        if (!this.timeline) {
            return;
        }
        this.timeline.splice(index, 1);
        this.clampPageIndex();
        this.onFieldChange();
        this.timelineRestructured.emit();
    }

    moveRowUp(index: number): void {
        this.moveRow(index, index - 1);
    }

    moveRowDown(index: number): void {
        this.moveRow(index, index + 1);
    }

    trackByRow(_index: number, rv: RowView): DatedChange {
        return rv.row;
    }

    localValue(row: DatedChange): string {
        return row.at ? toLocalDateTimeInput(row.at) : '';
    }

    setAt(row: DatedChange, value: string): void {
        row.at = value ? toRfc3339Seconds(value) : '';
        this.onFieldChange();
    }

    /** The "timeline too long" problem, if the server reported one -- located at the list itself, not at any row. */
    listProblem(): string | undefined {
        return this.problems.find((p) => p.suffix === 'timeline')?.message;
    }

    /** Every server-reported problem naming row `index`, from the cache built in ngOnChanges -- the single implementation, used directly by tests and by rebuildRowViews alike. */
    rowProblems(index: number): RowProblem[] {
        return this.rowProblemsByIndex.get(index) || [];
    }

    hasRowProblem(index: number): boolean {
        return this.rowProblems(index).length > 0 || this.duplicateRowIndexes.has(index);
    }

    /**
     * Client-side pre-check for the one refusal that is cheap to see here: two rows changing the
     * same target at the same instant, reported on the later row like the server does. A missing
     * at/target is left to the server, since a freshly added row starts with both empty.
     */
    clientProblems(_row: DatedChange, index: number): string[] {
        return this.duplicateRowIndexes.has(index) ? ['will be refused: already changes this target at that instant'] : [];
    }

    private moveRow(from: number, to: number): void {
        const rows = this.timeline;
        if (!rows || to < 0 || to >= rows.length) {
            return;
        }
        const [row] = rows.splice(from, 1);
        rows.splice(to, 0, row);
        this.setPageIndex(Math.floor(to / this.pageSize)); // follow the moved row across a page boundary
        this.onFieldChange();
        this.timelineRestructured.emit();
    }
}
