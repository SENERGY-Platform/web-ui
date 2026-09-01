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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatedChange } from '../../shared/environments.model';
import { TimelineTargetOption } from '../../shared/environments-timeline-targets';

/**
 * Converts a datetime-local input's value (local wall-clock time, no timezone) to RFC3339 with
 * whole seconds. Truncates rather than rounds any finer precision -- datetime-local's own
 * granularity (step="1" here, i.e. whole seconds) never produces one in practice.
 */
export function toRfc3339Seconds(localDateTime: string): string {
    return new Date(localDateTime).toISOString().slice(0, 19) + 'Z';
}

/** The inverse of toRfc3339Seconds: an RFC3339 instant to the local wall-clock string a datetime-local input expects. */
export function toLocalDateTimeInput(at: string): string {
    const date = new Date(at);
    const pad = (n: number): string => String(n).padStart(2, '0');
    return (
        date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
    );
}

/**
 * The timeline editor: one row per DatedChange (when/target/value), add/remove/reorder like the
 * schedule editor's state list. Mutates `timeline` in place; `timelineChange` is only a
 * "something in here changed, mark dirty" signal, not a replacement value -- same convention as
 * every other source editor in this module.
 */
@Component({
    selector: 'senergy-environments-timeline-editor',
    templateUrl: './environments-timeline-editor.component.html',
    styleUrls: ['./environments-timeline-editor.component.css'],
})
export class EnvironmentsTimelineEditorComponent {
    @Input() timeline: DatedChange[] | undefined;
    @Input() targetOptions: TimelineTargetOption[] = [];
    @Output() timelineChange = new EventEmitter<void>();

    onFieldChange(): void {
        this.timelineChange.emit();
    }

    addRow(): void {
        if (!this.timeline) {
            return;
        }
        this.timeline.push({ at: '', target: '', value: 0 });
        this.onFieldChange();
    }

    removeRow(index: number): void {
        if (!this.timeline) {
            return;
        }
        this.timeline.splice(index, 1);
        this.onFieldChange();
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

    private moveRow(from: number, to: number): void {
        const rows = this.timeline;
        if (!rows || to < 0 || to >= rows.length) {
            return;
        }
        const [row] = rows.splice(from, 1);
        rows.splice(to, 0, row);
        this.onFieldChange();
    }
}
