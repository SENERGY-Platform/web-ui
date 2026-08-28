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
import { ScheduleSource, ScheduleState } from '../../shared/environments.model';
import { scheduleChartOptions, ScheduleChartOptions } from '../../shared/environments-schedule-preview';

/**
 * The schedule source editor: state list (name/duration/value, reorder, per-state
 * state_writes), the gate and run_once, plus the timeline preview. Takes the
 * ScheduleSource directly, same convention as the profile editor -- the caller owns
 * where the schedule lives and how the change gets persisted.
 *
 * Mutates `schedule` in place; `scheduleChange` is only a "something in here changed,
 * mark dirty" signal, not a replacement value.
 */
@Component({
    selector: 'senergy-environments-schedule-editor',
    templateUrl: './environments-schedule-editor.component.html',
    styleUrls: ['./environments-schedule-editor.component.css'],
})
export class EnvironmentsScheduleEditorComponent implements OnChanges {
    @Input() schedule: ScheduleSource | undefined;
    @Input() contextKeyOptions: string[] = [];
    @Output() scheduleChange = new EventEmitter<void>();

    chart: ScheduleChartOptions | undefined;

    /** Which state rows have their state_writes panel open, by object identity -- an index
     * would point at the wrong row the moment a state above it is removed or reordered. */
    private expandedWrites = new Set<ScheduleState>();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['schedule']) {
            this.refreshChart();
        }
    }

    /** Bound to every schedule field that is not a state row's own inputs (those go through onFieldChange too, just from the row). */
    onFieldChange(): void {
        this.refreshChart();
        this.scheduleChange.emit();
    }

    addState(): void {
        if (!this.schedule) {
            return;
        }
        if (!this.schedule.states) {
            this.schedule.states = [];
        }
        this.schedule.states.push({ name: '', duration_seconds: 60, value: 0 });
        this.onFieldChange();
    }

    removeState(index: number): void {
        if (!this.schedule?.states) {
            return;
        }
        const [removed] = this.schedule.states.splice(index, 1);
        this.expandedWrites.delete(removed);
        this.onFieldChange();
    }

    moveStateUp(index: number): void {
        this.moveState(index, index - 1);
    }

    moveStateDown(index: number): void {
        this.moveState(index, index + 1);
    }

    trackByState(_index: number, state: ScheduleState): ScheduleState {
        return state;
    }

    isWritesExpanded(state: ScheduleState): boolean {
        return this.expandedWrites.has(state);
    }

    /**
     * Collapsing is the only safe moment to drop an emptied-out state_writes back to
     * undefined (see setStateWrites): no editor is focused inside a panel that just
     * closed, so there is no in-progress row to disturb by doing it here instead of on
     * every keystroke.
     */
    toggleWrites(state: ScheduleState): void {
        if (this.expandedWrites.has(state)) {
            this.expandedWrites.delete(state);
            if (state.state_writes && Object.keys(state.state_writes).length === 0) {
                state.state_writes = undefined;
                this.onFieldChange();
            }
        } else {
            this.expandedWrites.add(state);
        }
    }

    writeCount(state: ScheduleState): number {
        return Object.keys(state.state_writes || {}).length;
    }

    /**
     * Writes the emitted record back by the exact same reference the key-value editor
     * just emitted it with (never a copy, never undefined for an empty one) -- its
     * ngOnChanges only skips rebuilding `rows` from `record` when the incoming value is
     * reference-equal to what it itself last emitted (its one-shot echo guard). Swapping
     * in undefined, or a clone, breaks that reference equality: the guard misses, rows
     * gets rebuilt from the (now empty) record, and the row the user is still typing in
     * disappears out from under the cursor. An empty {} sitting in the document until the
     * panel is collapsed (see toggleWrites) is a cosmetic cost the API tolerates fine.
     */
    setStateWrites(state: ScheduleState, record: Record<string, unknown>): void {
        state.state_writes = record as Record<string, number>;
        this.onFieldChange();
    }

    setGateEnabled(enabled: boolean): void {
        if (!this.schedule) {
            return;
        }
        this.schedule.gate = enabled ? this.schedule.gate || { context_key: '', threshold: 0 } : undefined;
        this.onFieldChange();
    }

    private moveState(from: number, to: number): void {
        const states = this.schedule?.states;
        if (!states || to < 0 || to >= states.length) {
            return;
        }
        const [state] = states.splice(from, 1);
        states.splice(to, 0, state);
        this.onFieldChange();
    }

    private refreshChart(): void {
        this.chart = this.schedule ? scheduleChartOptions(this.schedule) : undefined;
    }
}
