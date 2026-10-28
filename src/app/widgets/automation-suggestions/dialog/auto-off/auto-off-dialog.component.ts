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
import { wholeSecondsValidator } from './whole-seconds.validator';

/** Asks for the switch-off delay of one suggestion. Closes with the typed text, or with nothing on cancel. */
@Component({
    selector: 'app-automation-suggestions-auto-off',
    templateUrl: './auto-off-dialog.component.html',
})
export class AutoOffDialogComponent {
    readonly seconds: FormControl<string>;

    constructor(
        private dialogRef: MatDialogRef<AutoOffDialogComponent, string>,
        @Inject(MAT_DIALOG_DATA) data: { seconds: string },
    ) {
        this.seconds = new FormControl(data.seconds, { nonNullable: true, validators: [wholeSecondsValidator] });
    }

    set(): void {
        if (this.seconds.valid) {
            this.dialogRef.close(this.seconds.value.trim());
        }
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
