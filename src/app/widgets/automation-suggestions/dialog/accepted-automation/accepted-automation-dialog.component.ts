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

import { Component, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AutoOffChoice } from '../../shared/automation-suggestion.model';
import { wholeSecondsValidator } from '../auto-off/whole-seconds.validator';

/** Edits the switch-off of an accepted automation. Closes with the chosen switch and delay, or with nothing on cancel. */
@Component({
    selector: 'app-automation-suggestions-accepted',
    templateUrl: './accepted-automation-dialog.component.html',
    styleUrls: ['./accepted-automation-dialog.component.css'],
})
export class AcceptedAutomationDialogComponent {
    readonly enabled: FormControl<boolean>;
    /** Disabled while the switch-off is off, so it is not validated then. */
    readonly seconds: FormControl<string>;

    constructor(
        private dialogRef: MatDialogRef<AcceptedAutomationDialogComponent, AutoOffChoice>,
        @Inject(MAT_DIALOG_DATA) data: AutoOffChoice,
    ) {
        this.enabled = new FormControl(data.enabled, { nonNullable: true });
        this.seconds = new FormControl(data.seconds, { nonNullable: true, validators: [wholeSecondsValidator] });
        if (!data.enabled) {
            this.seconds.disable();
        }
    }

    setEnabled(enabled: boolean): void {
        this.enabled.setValue(enabled);
        if (enabled) {
            this.seconds.enable();
        } else {
            this.seconds.disable();
        }
    }

    canSave(): boolean {
        return !this.enabled.value || this.seconds.valid;
    }

    save(): void {
        if (this.canSave()) {
            this.dialogRef.close({ enabled: this.enabled.value, seconds: this.seconds.value.trim() });
        }
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
