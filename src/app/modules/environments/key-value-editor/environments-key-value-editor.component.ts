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

export type KeyValueEditorMode = 'mixed' | 'number';

interface Row {
    key: string;
    value: string;
    /** Only meaningful in 'mixed' mode; 'number' mode always writes numbers. */
    isText: boolean;
    /** A value this editor cannot represent as number/text (boolean, object, array, null) -- shown as a JSON preview and passed through unchanged. */
    readOnly: boolean;
    rawValue?: unknown;
}

/**
 * Small key/value table editor for a Record<string, unknown>, used for a zone's or
 * asset's initial_states (number or text values) and a zone's time_constants (number
 * only, seconds).
 *
 * Rebuilds its rows from `record` on every genuinely new input, but not from the record
 * it just emitted itself: the parent typically writes the emitted value straight back
 * onto the same property this component is bound to (e.g. `[record]="zone.initial_states"
 * (recordChange)="zone.initial_states = $event"`), and rebuilding rows from that echo on
 * every keystroke would recreate every row object and drop input focus while typing.
 *
 * The echo guard is intentionally one-shot (consumed and cleared on the very next
 * ngOnChanges, whether or not it matched): comparing `currentValue` against a `lastEmitted`
 * that lives on indefinitely misfires the moment the bound object's identity round-trips,
 * e.g. selecting zone A, then B, then back to A with A's own initial_states untouched in
 * between -- the third change arrives with the exact reference this component emitted
 * earlier (for A), so a lingering guard would skip the rebuild and silently keep showing
 * B's rows while bound to A, corrupting A on the next keystroke.
 */
@Component({
    selector: 'senergy-environments-key-value-editor',
    templateUrl: './environments-key-value-editor.component.html',
    styleUrls: ['./environments-key-value-editor.component.css'],
})
export class EnvironmentsKeyValueEditorComponent implements OnChanges {
    @Input() record: Record<string, unknown> | undefined;
    @Input() mode: KeyValueEditorMode = 'mixed';
    @Input() keyLabel = 'Key';
    /** Optional per-row annotation, e.g. flagging a zone key that also has a time constant. Returns undefined for no hint. */
    @Input() keyHint: ((key: string) => string | undefined) | undefined;
    @Output() recordChange = new EventEmitter<Record<string, unknown>>();

    rows: Row[] = [];

    /** Set right after emit(); consumed (and cleared) by the very next ngOnChanges, matched or not. */
    private lastEmittedRef: Record<string, unknown> | undefined;

    ngOnChanges(changes: SimpleChanges): void {
        const change = changes['record'];
        if (!change) {
            return;
        }
        const isOwnEcho = change.currentValue === this.lastEmittedRef;
        this.lastEmittedRef = undefined;
        if (!isOwnEcho) {
            this.rows = this.toRows(this.record);
        }
    }

    addRow(): void {
        this.rows.push({ key: '', value: this.mode === 'number' ? '0' : '', isText: false, readOnly: false });
        this.emit();
    }

    removeRow(index: number): void {
        this.rows.splice(index, 1);
        this.emit();
    }

    emit(): void {
        const record: Record<string, unknown> = {};
        for (const row of this.rows) {
            if (!row.key) {
                continue;
            }
            if (row.readOnly) {
                record[row.key] = row.rawValue;
            } else if (this.mode === 'number' || !row.isText) {
                const parsed = Number(row.value);
                record[row.key] = row.value === '' || Number.isNaN(parsed) ? 0 : parsed;
            } else {
                record[row.key] = row.value;
            }
        }
        this.lastEmittedRef = record;
        this.recordChange.emit(record);
    }

    trackByIndex(index: number): number {
        return index;
    }

    hintFor(key: string): string | undefined {
        return this.keyHint ? this.keyHint(key) : undefined;
    }

    private toRows(record: Record<string, unknown> | undefined): Row[] {
        return Object.entries(record || {}).map(([key, value]) => {
            if (typeof value === 'number') {
                return { key, value: String(value), isText: false, readOnly: false };
            }
            if (typeof value === 'string') {
                return { key, value, isText: this.mode === 'mixed', readOnly: false };
            }
            // boolean, object, array or null: this editor has no widget for it, so it is
            // shown read-only (a JSON preview) and passed through verbatim on emit rather
            // than being lossily stringified into "false" or "[object Object]".
            return { key, value: JSON.stringify(value), isText: false, readOnly: true, rawValue: value };
        });
    }
}
