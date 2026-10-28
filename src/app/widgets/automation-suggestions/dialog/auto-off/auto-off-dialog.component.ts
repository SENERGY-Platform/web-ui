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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { DialogHeaderComponent } from 'src/app/core/components/dialog-header/dialog-header.component';
import { wholeSecondsValidator } from './whole-seconds.validator';

/** Asks for the switch-off delay of one suggestion. Closes with the typed text, or with nothing on cancel. */
@Component({
    selector: 'senergy-automation-suggestions-auto-off',
    templateUrl: './auto-off-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DialogHeaderComponent, MatDialogContent, MatFormField, MatLabel, MatInput, ReactiveFormsModule, MatSuffix, MatError, MatDialogActions, MatButton],
})
export class AutoOffDialogComponent {
    private dialogRef = inject<MatDialogRef<AutoOffDialogComponent, string>>(MatDialogRef);

    readonly seconds: FormControl<string>;

    constructor() {
        const data = inject<{ seconds: string }>(MAT_DIALOG_DATA);
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
