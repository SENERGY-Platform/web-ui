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
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { DialogHeaderComponent } from '../../../../core/components/dialog-header/dialog-header.component';

/** The longest reason the service takes, counted in characters (code points). */
export const MAX_REJECT_REASON_LENGTH = 10000;

export interface RejectDialogData {
    /** Name of the smart service. */
    name: string;
}

/** Closes with the reason; the page sends it, so a refusal of the service does not keep the dialog open. */
@Component({
    selector: 'senergy-reject-dialog',
    templateUrl: './reject-dialog.component.html',
    styleUrls: ['./reject-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DialogHeaderComponent, CdkScrollable, MatDialogContent, MatDialogActions, MatButton, MatFormField, MatLabel, MatHint, MatInput, FormsModule]
})
export class RejectDialogComponent {
    private dialogRef = inject<MatDialogRef<RejectDialogComponent, string>>(MatDialogRef);
    data = inject<RejectDialogData>(MAT_DIALOG_DATA);

    readonly maxLength = MAX_REJECT_REASON_LENGTH;
    reason = '';

    get reasonLength(): number {
        return Array.from(this.reason).length;
    }

    canReject(): boolean {
        return this.reason.trim() !== '' && this.reasonLength <= this.maxLength;
    }

    cancel(): void {
        this.dialogRef.close();
    }

    reject(): void {
        if (this.canReject()) {
            this.dialogRef.close(this.reason);
        }
    }
}
