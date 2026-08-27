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

import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

/**
 * Shown instead of the generic error snackbar when a save answers 409: somebody else's write
 * landed on this environment since it was loaded (see Environment.version). There is no
 * automatic merge -- the two choices are reloading (and losing the unsaved edit) or staying
 * dirty so the user can copy out whatever they still need before doing that themselves.
 */
@Component({
    selector: 'senergy-environments-version-conflict-dialog',
    templateUrl: './environments-version-conflict-dialog.component.html',
    styleUrls: ['./environments-version-conflict-dialog.component.css'],
})
export class EnvironmentsVersionConflictDialogComponent {
    constructor(private dialogRef: MatDialogRef<EnvironmentsVersionConflictDialogComponent>) {}

    /** Keep the current, still-dirty edit open -- e.g. to copy values out before deciding to reload. */
    keepEditing(): void {
        this.dialogRef.close(false);
    }

    reload(): void {
        this.dialogRef.close(true);
    }
}
