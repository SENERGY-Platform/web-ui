/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MeterColumn, ReadingRow } from './meter-columns';

/**
 * Counter positions per energy column. With `fixed` the columns are given (the energy columns of a device, the
 * readings of a link) and only the numbers are typed; without it service and column are entered by hand, as a
 * fallback for a device type from which no energy column can be told.
 */
@Component({
    selector: 'senergy-thing-readings-editor',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormsModule, MatFormField, MatLabel, MatInput, MatIconButton, MatButton, MatIcon],
    styles: ['.row { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; } .name { flex: 1 1 160px; min-width: 120px; } .value { flex: 0 1 160px; }'],
    template: `
        @for (row of rows; track row; let i = $index) {
            <div class="row">
                @if (fixed) {
                    <span class="name">{{ labelOf(row) }}</span>
                } @else {
                    <mat-form-field class="name">
                        <mat-label>Service id</mat-label>
                        <input matInput [(ngModel)]="row.service_id" [name]="'service' + i">
                    </mat-form-field>
                    <mat-form-field class="name">
                        <mat-label>Column</mat-label>
                        <input matInput [(ngModel)]="row.column" [name]="'column' + i">
                    </mat-form-field>
                }
                @if (showFrom) {
                    <mat-form-field class="value">
                        <mat-label>{{ fromLabel }}</mat-label>
                        <input matInput inputmode="decimal" [(ngModel)]="row.from" [name]="'from' + i">
                    </mat-form-field>
                }
                @if (showUntil) {
                    <mat-form-field class="value">
                        <mat-label>{{ untilLabel }}</mat-label>
                        <input matInput inputmode="decimal" [(ngModel)]="row.until" [name]="'until' + i">
                    </mat-form-field>
                }
                @if (!fixed) {
                    <button matIconButton type="button" aria-label="Remove reading" (click)="rows.splice(i, 1)">
                        <mat-icon>delete</mat-icon>
                    </button>
                }
            </div>
        }
        @if (!fixed) {
            <button matButton type="button" (click)="add()">
                <mat-icon>add</mat-icon>
                Add reading
            </button>
        }
    `,
})
export class ThingReadingsEditorComponent {
    /** Mutated in place; the opener reads them when the dialog saves. */
    @Input({ required: true }) rows: ReadingRow[] = [];
    @Input() fixed = true;
    @Input() showFrom = true;
    @Input() showUntil = false;
    @Input() fromLabel = 'Reading at installation';
    @Input() untilLabel = 'Reading at removal';
    /** Display names of the columns by `columnKey`-less lookup: service and column. */
    @Input() columns: MeterColumn[] = [];

    labelOf(row: ReadingRow): string {
        return this.columns.find((c) => c.service_id === row.service_id && c.column === row.column)?.label ?? row.column;
    }

    add(): void {
        this.rows.push({ service_id: '', column: '', from: '', until: '' });
    }
}
