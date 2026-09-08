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
import { FAULT_KINDS, Fault, FaultKind, faultKindDescription, faultKindLabel } from '../../shared/environments.model';
import { NodeProblem } from '../../shared/environments-path';
import { toLocalDateTimeInput, toRfc3339Seconds } from '../../shared/environments-datetime';

/** A fault is either dated (from/to) or rated (per_hour/duration_seconds); see mode(). */
export type FaultMode = 'window' | 'rate';

/** Mirrors domain.MaxChannelFaults in moses -- a bound on both memory and per-evaluation runtime cost. */
const MAX_FAULTS = 8;

/** Mirrors domain.MaxFaultLookbackSlots in moses -- how far a drawn occurrence is searched back, in evaluation steps. */
const MAX_LOOKBACK_SLOTS = 64;

/** The four numeric fields routed through setNumber; see its comment for why. */
type NumberField = 'per_hour' | 'duration_seconds' | 'factor' | 'reset_to';

/** Parses a fault problem's suffix, e.g. "faults[1].to" -> index 1, field "to" (undefined for one naming the whole fault). */
const ROW_SUFFIX_RE = /^faults\[(\d+)\](?:\.(.+))?$/;

interface RowProblem {
    field?: string;
    message: string;
}

/**
 * The injected-faults editor: one row per Fault (kind, window-or-rate, kind-specific fields),
 * add/remove like the timeline editor's row list. Mutates `faults` in place; `faultsChange` is
 * only a "something in here changed, mark dirty" signal, not a replacement value -- same
 * convention as every other source/list editor in this module. `faultsRestructured` is the
 * narrower signal for add/remove: the parent needs it to drop stale index-based problems, the
 * same way it does for every other structural edit (see afterStructuralChange in
 * environment-detail.component.ts). See docs/injected-faults.md in moses for the rules this
 * mirrors, including the client-side pre-checks in clientProblems, which mirror moses
 * lib/domain/validate.go closely enough to warn early without duplicating its authority.
 */
@Component({
    selector: 'senergy-environments-faults-editor',
    templateUrl: './environments-faults-editor.component.html',
    styleUrls: ['./environments-faults-editor.component.css'],
})
export class EnvironmentsFaultsEditorComponent implements OnChanges {
    @Input() faults: Fault[] | undefined;
    /** Whether the channel's source counts up -- the only kind of reading a meter_exchange fault can restart. */
    @Input() cumulative = false;
    /** The selected channel's problems (environment-detail's selectedNodeProblems); filtered internally to the ones naming a fault. */
    @Input() problems: NodeProblem[] = [];
    /** The channel's publish interval (interval_seconds): what a drawn fault's rate and lookback are counted in, for clientProblems. Undefined skips those two checks. */
    @Input() stepSeconds: number | undefined;
    @Output() faultsChange = new EventEmitter<void>();
    /** Fires on add/remove only, not on a field edit -- see the class comment. */
    @Output() faultsRestructured = new EventEmitter<void>();

    readonly FAULT_KINDS = FAULT_KINDS;
    readonly MAX_FAULTS = MAX_FAULTS;
    faultKindLabel = faultKindLabel;
    faultKindDescription = faultKindDescription;

    /** Per-row server problems, indexed by row; rebuilt in ngOnChanges instead of re-parsing every problem's suffix on every *ngIf/*ngFor read of rowProblems. */
    private rowProblemsByIndex = new Map<number, RowProblem[]>();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['problems']) {
            this.indexRowProblems();
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

    onFieldChange(): void {
        this.faultsChange.emit();
    }

    /** Seeds a usable one-hour window (now-1h to now) instead of an empty fault, which the server refuses outright (neither a window nor a rate). */
    addFault(): void {
        if (!this.faults || this.faults.length >= MAX_FAULTS) {
            return;
        }
        const to = new Date();
        to.setMilliseconds(0);
        const from = new Date(to.getTime() - 3600 * 1000);
        this.faults.push({ kind: 'outage', from: toRfc3339(from), to: toRfc3339(to) });
        this.onFieldChange();
        this.faultsRestructured.emit();
    }

    removeFault(index: number): void {
        if (!this.faults) {
            return;
        }
        this.faults.splice(index, 1);
        this.onFieldChange();
        this.faultsRestructured.emit();
    }

    trackByFault(_index: number, fault: Fault): Fault {
        return fault;
    }

    /** Window unless a rate field is present -- a freshly added fault (see addFault) starts as a window. */
    mode(fault: Fault): FaultMode {
        return fault.per_hour !== undefined || fault.duration_seconds !== undefined ? 'rate' : 'window';
    }

    /**
     * Drops whatever the new kind would ignore: only a spike reads factor, only a
     * meter_exchange reads reset_to, and a meter_exchange is always a window of one instant
     * (from alone, no to, no rate) -- see the template for why the mode toggle is hidden for it.
     */
    onKindChange(fault: Fault, kind: FaultKind): void {
        fault.kind = kind;
        if (kind === 'spike') {
            if (fault.factor === undefined) {
                fault.factor = 2;
            }
        } else {
            delete fault.factor;
        }
        if (kind === 'meter_exchange') {
            delete fault.per_hour;
            delete fault.duration_seconds;
            delete fault.to;
            if (fault.reset_to === undefined) {
                fault.reset_to = 0;
            }
        } else {
            delete fault.reset_to;
        }
        this.onFieldChange();
    }

    /** Drops the other mode's fields and seeds the new one with usable defaults. Not offered for meter_exchange (see the template). */
    onModeChange(fault: Fault, mode: FaultMode): void {
        if (mode === 'window') {
            delete fault.per_hour;
            delete fault.duration_seconds;
        } else {
            delete fault.from;
            delete fault.to;
            if (fault.per_hour === undefined) {
                fault.per_hour = 1;
            }
            if (fault.duration_seconds === undefined) {
                fault.duration_seconds = 60;
            }
        }
        this.onFieldChange();
    }

    localFrom(fault: Fault): string {
        return fault.from ? toLocalDateTimeInput(fault.from) : '';
    }

    setFrom(fault: Fault, value: string): void {
        if (value) {
            fault.from = toRfc3339Seconds(value);
        } else {
            delete fault.from;
        }
        this.onFieldChange();
    }

    localTo(fault: Fault): string {
        return fault.to ? toLocalDateTimeInput(fault.to) : '';
    }

    setTo(fault: Fault, value: string): void {
        if (value) {
            fault.to = toRfc3339Seconds(value);
        } else {
            delete fault.to;
        }
        this.onFieldChange();
    }

    /**
     * ngModelChange handler for per_hour/duration_seconds/factor/reset_to: clearing the input
     * or leaving it non-finite (e.g. 1e999, which parses to Infinity) deletes the property,
     * the same as any other unset field -- left as null/NaN it would reach the server as 0,
     * which Go decodes and accepts (e.g. a spike with factor 0 publishing zeros unnoticed).
     */
    setNumber(fault: Fault, field: NumberField, value: number | null): void {
        if (value === null || !Number.isFinite(value)) {
            delete fault[field];
        } else {
            fault[field] = value;
        }
        this.onFieldChange();
    }

    /** The "at most 8 faults" problem, if the server reported one -- located at the list itself, not at any row. */
    listProblem(): string | undefined {
        return this.problems.find((p) => p.suffix === 'faults')?.message;
    }

    /** Every server-reported problem naming row `index`, from the cache built in ngOnChanges. */
    rowProblems(index: number): RowProblem[] {
        return this.rowProblemsByIndex.get(index) || [];
    }

    hasRowProblem(index: number): boolean {
        return this.rowProblems(index).length > 0;
    }

    /**
     * Client-side pre-checks for refusals moses lib/domain/validate.go enforces server-side,
     * shown next to the row that would trip them so a doomed save is not the first sign of
     * the problem. Advisory only -- save is never blocked here, the server has the last word.
     */
    clientProblems(fault: Fault, index: number): string[] {
        const result: string[] = [];
        if (fault.kind === 'spike' && fault.factor === 1) {
            result.push('will be refused: a factor of 1 leaves the reading as it is, so the spike would be invisible in the series');
        }
        if (fault.kind === 'meter_exchange' && fault.reset_to !== undefined && fault.reset_to < 0) {
            result.push('will be refused: reset_to must not be negative, a meter does not count below zero');
        }
        if (fault.kind === 'meter_exchange' && fault.from) {
            const duplicateFrom = (this.faults || []).some(
                (other, otherIndex) => otherIndex !== index && other.kind === 'meter_exchange' && other.from === fault.from,
            );
            if (duplicateFrom) {
                result.push('will be refused: another meter exchange on this channel already starts at the same instant');
            }
        }
        if (this.stepSeconds && fault.per_hour !== undefined && fault.per_hour * this.stepSeconds > 3600) {
            result.push('will be refused: at this rate and evaluation interval, more than one occurrence would begin per step');
        }
        if (this.stepSeconds && fault.duration_seconds !== undefined && fault.duration_seconds > MAX_LOOKBACK_SLOTS * this.stepSeconds) {
            result.push('will be refused: the occurrence spans more than ' + MAX_LOOKBACK_SLOTS + ' evaluation steps');
        }
        return result;
    }
}

/** RFC3339, whole seconds -- the same truncation toRfc3339Seconds applies, for a Date already in hand rather than a datetime-local string. */
function toRfc3339(date: Date): string {
    return date.toISOString().slice(0, 19) + 'Z';
}
