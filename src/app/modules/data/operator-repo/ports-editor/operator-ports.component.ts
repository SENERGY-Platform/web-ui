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

import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {ErrorStateMatcher} from '@angular/material/core';
import {IOModel} from '../shared/operator.model';
import {blockingIncompleteRows, duplicateNames, lookalikeNames, newDuplicateNames, stateMatcher} from '../shared/operator-validation';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatFormField, MatLabel, MatError, MatHint} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {MtxSelect, MtxOption} from '@ng-matero/extensions/select';
import {MatTooltip} from '@angular/material/tooltip';

/** Rows of name and type for the inputs, outputs or config values of an operator or of one of its versions. */
@Component({
    selector: 'senergy-operator-ports',
    templateUrl: './operator-ports.component.html',
    styleUrls: ['./operator-ports.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatButton, MatIconButton, MatIcon, MatFormField, MatLabel, MatError, MatHint, MatInput, FormsModule, MtxSelect, MtxOption, MatTooltip],
})
export class OperatorPortsComponent {
    /** Heading of the block, e.g. "Inputs". */
    @Input() title = '';
    /** What one row is, used in the button and the empty state, e.g. "input". */
    @Input() noun = 'entry';
    /** Shown under the heading, e.g. why the rows cannot be edited. */
    @Input() hint = '';
    /** Leave out the heading and the add button, because the enclosing form section shows them. */
    @Input() section = false;
    @Input() ports: IOModel[] | undefined;
    /** The list as stored: duplicates that are already in it only warn, a duplicate the edit adds is an error. */
    @Input() before: IOModel[] | undefined;
    @Output() portsChange = new EventEmitter<IOModel[]>();
    /** Show the rows as text, without add and remove. */
    @Input() readonly = false;
    /** Keep the editors but make them inert, for a user without write permission. */
    @Input() disabled = false;

    readonly types = ['float', 'string', 'int', 'bool'];

    private readonly matchers = new WeakMap<IOModel, ErrorStateMatcher>();

    get rows(): IOModel[] {
        return this.ports ?? [];
    }

    isDuplicate(port: IOModel): boolean {
        return !!port.name && duplicateNames(this.ports).has(port.name);
    }

    /** Whether the row lacks a name or a type and is not in the stored list as it is, which stops the save. */
    isBlockingIncomplete(port: IOModel): boolean {
        return blockingIncompleteRows(this.ports, this.before).has(port);
    }

    /** What stops the save for this row: a missing name, or a duplicate that is not in the stored list. */
    nameError(port: IOModel): string {
        if (!port.name?.trim()) {
            return this.isBlockingIncomplete(port) ? 'Name required' : '';
        }
        return newDuplicateNames(this.ports, this.before).has(port.name) ? 'Name is used more than once' : '';
    }

    /** A hint that does not stop the save. */
    nameWarning(port: IOModel): string {
        if (!port.name?.trim()) {
            return this.nameError(port) === '' ? 'Name missing (already stored)' : '';
        }
        if (this.nameError(port) !== '') {
            return '';
        }
        if (this.isDuplicate(port)) {
            return 'Name is used more than once (already stored)';
        }
        return lookalikeNames(this.ports).has(port.name) ? 'Differs from another name only in spaces' : '';
    }

    typeError(port: IOModel): string {
        return !port.type && this.isBlockingIncomplete(port) ? 'Type required' : '';
    }

    typeWarning(port: IOModel): string {
        return !port.type && !this.isBlockingIncomplete(port) ? 'Type missing (already stored)' : '';
    }

    nameMatcher(port: IOModel): ErrorStateMatcher {
        let matcher = this.matchers.get(port);
        if (matcher === undefined) {
            matcher = stateMatcher(() => this.nameError(port) !== '');
            this.matchers.set(port, matcher);
        }
        return matcher;
    }

    add() {
        const ports = this.ports ?? [];
        ports.push({} as IOModel);
        this.ports = ports;
        this.portsChange.emit(ports);
    }

    remove(port: IOModel) {
        const index = this.rows.indexOf(port);
        if (index > -1) {
            this.rows.splice(index, 1);
        }
    }
}
