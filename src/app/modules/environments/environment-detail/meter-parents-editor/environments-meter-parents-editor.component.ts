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

import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MeterParent } from '../../shared/environments.model';
import { NodeProblem } from '../../shared/environments-path';
import { meterWeightHint, meterWeightProblem } from '../../shared/environments-meter-graph';
import { SubmeteringOption } from '../../shared/environments-submetering';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatHint, MatSuffix } from '@angular/material/form-field';
import { MtxSelect } from '@ng-matero/extensions/select';
import { FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton, MatButton } from '@angular/material/button';

interface RowProblem {
    field?: string;
    message: string;
}

/**
 * The row editor for a parent list of the meter graph -- an asset's meter_parents or a meter
 * group's parents: target, optional weight and the medium change flag per row. Unlike the
 * in-place list editors in this module it emits the whole new list through `parentsChange`, so
 * the parent decides how to store it (an asset drops the field when the list is empty). Row
 * edits mutate the row object itself and emit the same array; add/remove emit a new one and
 * additionally `parentsRestructured`, because they shift the server's index-based problems.
 */
@Component({
    selector: 'senergy-environments-meter-parents-editor',
    templateUrl: './environments-meter-parents-editor.component.html',
    styleUrls: ['./environments-meter-parents-editor.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        MatIcon,
        MatFormField,
        MatLabel,
        MtxSelect,
        FormsModule,
        MatHint,
        MatInput,
        MatSuffix,
        MatTooltip,
        MatCheckbox,
        MatIconButton,
        MatButton,
    ],
})
export class EnvironmentsMeterParentsEditorComponent implements OnChanges {
    @Input() parents: MeterParent[] | undefined;
    /** What a row can name. A stored id missing from here (e.g. another site's asset) is still shown, by id. */
    @Input() options: SubmeteringOption[] = [];
    /** The selected node's problems (environment-detail's selectedNodeProblems); filtered to the ones under `problemPrefix`. */
    @Input() problems: NodeProblem[] = [];
    /** The problem suffix the list lives under, e.g. "meter_parents" or "meter_groups[0].parents". */
    @Input() problemPrefix = 'meter_parents';
    @Output() parentsChange = new EventEmitter<MeterParent[]>();
    @Output() parentsRestructured = new EventEmitter<void>();

    /** options plus the ids the rows name that options lacks; a stable array rebuilt only on input change, not read as a getter, so the select keeps its tracked item. */
    displayOptions: SubmeteringOption[] = [];
    private listProblems: string[] = [];
    private rowProblemsByIndex = new Map<number, RowProblem[]>();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['options'] || changes['parents']) {
            this.rebuildDisplayOptions();
        }
        if (changes['problems'] || changes['problemPrefix']) {
            this.indexProblems();
        }
    }

    private rebuildDisplayOptions(): void {
        const known = new Set(this.options.map((o) => o.id));
        const extra: SubmeteringOption[] = [];
        (this.parents || []).forEach((parent) => {
            if (parent.id && !known.has(parent.id)) {
                known.add(parent.id);
                extra.push({ id: parent.id, label: parent.id });
            }
        });
        this.displayOptions = [...this.options, ...extra];
    }

    private indexProblems(): void {
        this.listProblems = [];
        this.rowProblemsByIndex = new Map();
        const rowRe = /^\[(\d+)\](?:\.(.+))?$/;
        this.problems.forEach((p) => {
            if (!p.suffix || !p.suffix.startsWith(this.problemPrefix)) {
                return;
            }
            const rest = p.suffix.slice(this.problemPrefix.length);
            if (rest === '') {
                this.listProblems.push(p.message);
                return;
            }
            const match = rowRe.exec(rest);
            if (match) {
                const index = parseInt(match[1], 10);
                const existing = this.rowProblemsByIndex.get(index) || [];
                existing.push({ field: match[2], message: p.message });
                this.rowProblemsByIndex.set(index, existing);
            }
        });
    }

    listProblemMessages(): string[] {
        return this.listProblems;
    }

    rowProblems(index: number): RowProblem[] {
        return this.rowProblemsByIndex.get(index) || [];
    }

    /** The remark on one row's own weight (not whole, or outside 1..100); save is blocked on these. */
    weightProblem(parent: MeterParent): string | undefined {
        return meterWeightProblem(parent.weight);
    }

    weightHint(): string | undefined {
        return meterWeightHint(this.parents);
    }

    trackByParent(_index: number, parent: MeterParent): MeterParent {
        return parent;
    }

    /** A new row has no target yet; the select asks for one and the server refuses a save with the id still empty. */
    add(): void {
        this.parentsChange.emit([...(this.parents || []), { id: '' }]);
        this.parentsRestructured.emit();
    }

    remove(index: number): void {
        this.parentsChange.emit((this.parents || []).filter((_, i) => i !== index));
        this.parentsRestructured.emit();
    }

    setTarget(parent: MeterParent, id: string | null): void {
        parent.id = id || '';
        this.emitEdited();
    }

    /** The number input hands over null for an emptied field; an empty weight is omitted, not sent as 0. */
    setWeight(parent: MeterParent, value: number | string | null): void {
        if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
            delete parent.weight;
        } else {
            parent.weight = Number(value);
        }
        this.emitEdited();
    }

    setConversion(parent: MeterParent, checked: boolean): void {
        if (checked) {
            parent.conversion = true;
        } else {
            delete parent.conversion;
        }
        this.emitEdited();
    }

    private emitEdited(): void {
        this.parentsChange.emit(this.parents || []);
    }
}
