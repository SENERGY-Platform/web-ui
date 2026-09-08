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
 * The timeline editor: one row per DatedChange (when/target/value), add/remove/reorder like the
 * schedule editor's state list. Mutates `timeline` in place; `timelineChange` is only a
 * "something in here changed, mark dirty" signal, not a replacement value -- same convention as
 * every other source editor in this module. `timelineRestructured` is the narrower signal for
 * add/remove/move: the parent needs it to drop stale index-based problems, the same way it does
 * for the faults editor (see afterStructuralChange in environment-detail.component.ts).
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

    /** Per-row server problems, indexed by row; rebuilt in ngOnChanges instead of re-parsing every problem's suffix on every *ngIf/*ngFor read of rowProblems. */
    private rowProblemsByIndex = new Map<number, RowProblem[]>();

    /** Row indexes that duplicate an earlier row's target+at, rebuilt by indexDuplicates() so clientProblems stays O(1) per row instead of O(n) per row (O(n²) per recompute). */
    private duplicateRowIndexes = new Set<number>();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['problems']) {
            this.indexRowProblems();
        }
        if (changes['timeline']) {
            this.indexDuplicates();
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

    onFieldChange(): void {
        this.indexDuplicates();
        this.timelineChange.emit();
    }

    addRow(): void {
        if (!this.timeline) {
            return;
        }
        this.timeline.push({ at: '', target: '', value: 0 });
        this.onFieldChange();
        this.timelineRestructured.emit();
    }

    removeRow(index: number): void {
        if (!this.timeline) {
            return;
        }
        this.timeline.splice(index, 1);
        this.onFieldChange();
        this.timelineRestructured.emit();
    }

    moveRowUp(index: number): void {
        this.moveRow(index, index - 1);
    }

    moveRowDown(index: number): void {
        this.moveRow(index, index + 1);
    }

    trackByRow(_index: number, row: DatedChange): DatedChange {
        return row;
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

    /** Every server-reported problem naming row `index`, from the cache built in ngOnChanges. */
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
        this.onFieldChange();
        this.timelineRestructured.emit();
    }
}
