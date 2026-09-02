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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { deprecatedAspectName } from '../../device-types-overview/shared/device-type.model';

export interface AspectToClassDialogData {
    aspectName: string;
    /** Pre-fill for the class name: the aspect's name without a deprecated marker it may carry. */
    proposedClassName: string;
    /** Direct children, each of which becomes a root hierarchy of its own carrying the new class. */
    childNames: string[];
    /** Names of the classes that exist, so a name already taken is reused instead of duplicated. */
    existingClassNames: string[];
    /**
     * How many device-types reference the aspect itself, or undefined when the user may not ask.
     * Above zero the device-repository refuses to delete it, so only keeping it is on offer.
     */
    usedInCount?: number;
}

/** What becomes of the converted aspect itself. */
export type AspectFate = 'delete' | 'deprecate' | 'keep';

export interface AspectToClassDialogResult {
    className: string;
    fate: AspectFate;
}

@Component({
    templateUrl: './aspect-to-class-dialog.component.html',
    styleUrls: ['./aspect-to-class-dialog.component.css'],
})
export class AspectToClassDialogComponent {
    formGroup!: FormGroup;
    aspectName: string;
    childNames: string[];
    usedInCount?: number;

    private existingClassNames: string[];

    constructor(
        private dialogRef: MatDialogRef<AspectToClassDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) data: AspectToClassDialogData,
    ) {
        this.aspectName = data.aspectName;
        this.childNames = data.childNames;
        this.existingClassNames = data.existingClassNames;
        this.usedInCount = data.usedInCount;

        this.formGroup = this._formBuilder.group({
            className: [data.proposedClassName, Validators.required],
            fate: [this.deleteBlocked() ? 'deprecate' : 'delete' as AspectFate],
        });
    }

    /** A referenced aspect cannot go: the delete is answered with 400 while a device-type uses it. */
    deleteBlocked(): boolean {
        return (this.usedInCount || 0) > 0;
    }

    reusesExistingClass(): boolean {
        const name = (this.formGroup.get('className')?.value || '').trim();
        return name.length > 0 && this.existingClassNames.some(existing => existing === name);
    }

    deprecatedName(): string {
        return deprecatedAspectName(this.aspectName);
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        const chosen = this.formGroup.get('fate')?.value as AspectFate;
        const result: AspectToClassDialogResult = {
            className: (this.formGroup.get('className')?.value || '').trim(),
            fate: this.deleteBlocked() && chosen === 'delete' ? 'deprecate' : chosen,
        };
        this.dialogRef.close(result);
    }
}
