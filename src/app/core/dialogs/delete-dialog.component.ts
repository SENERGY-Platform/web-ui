/*
 * Copyright 2020 InfAI (CC SES)
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

import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../directives/close-mtx-select-on-scroll.directive';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';

export interface DeleteDialogOptions {
    checkboxText?: string;
    /** Initial state of the checkbox, e.g. to default a destructive follow-up action to on. Defaults to false. */
    checkboxDefault?: boolean;
    /** Extra context shown below the question, e.g. a side effect of the deletion the user would otherwise not know about. */
    note?: string;
}

export interface DeleteDialogResponse {
    confirmed: boolean;
    checkboxChecked?: boolean;
}

@Component({
    templateUrl: './delete-dialog.component.html',
    styleUrls: ['./delete-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatCheckbox, FormsModule, MatDialogActions, MatButton]
})
export class DeleteDialogComponent {
    text: string;
    options: DeleteDialogOptions | undefined;
    checked = false;

    constructor(private dialogRef: MatDialogRef<DeleteDialogComponent>, @Inject(MAT_DIALOG_DATA) data: { text: string, options?: DeleteDialogOptions }) {
        this.text = data.text;
        this.options = data.options;
        this.checked = data.options?.checkboxDefault ?? false;
    }

    cancel(): void {
        if (this.options === undefined) {
            this.dialogRef.close(false); // legacy return value
            return;
        }
        const resp: DeleteDialogResponse = { confirmed: false };
        if (this.options?.checkboxText !== undefined) {
            resp.checkboxChecked = this.checked;
        }
        this.dialogRef.close(resp);
    }

    delete(): void {
        if (this.options === undefined) {
            this.dialogRef.close(true);  // legacy return value
            return;
        }
        const resp: DeleteDialogResponse = { confirmed: true };
        if (this.options?.checkboxText !== undefined) {
            resp.checkboxChecked = this.checked;
        }
        this.dialogRef.close(resp);
    }
}
