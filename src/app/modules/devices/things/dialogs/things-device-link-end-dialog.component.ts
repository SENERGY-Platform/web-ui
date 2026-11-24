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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { DialogHeaderComponent } from '../../../../core/components/dialog-header/dialog-header.component';
import { toRfc3339Seconds } from '../../../environments/shared/environments-datetime';
import { ReadingRow, readingRowsError, rowsFor, toUntilValues } from '../shared/meter-columns';
import { ThingReadingsEditorComponent } from '../shared/thing-readings-editor.component';
import { ThingDeviceLinkEndModel, ThingDeviceLinkModel, parseReadingValue } from '../shared/things.model';

export interface ThingsDeviceLinkEndDialogData {
    deviceName: string;
    link: ThingDeviceLinkModel;
}

/** Ends the open link of a meter; the removal readings are asked for the readings the link holds. */
@Component({
    templateUrl: './things-device-link-end-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: ['.full-width { width: 100%; } .error { color: var(--mat-sys-error, #b3261e); }'],
    imports: [
        DialogHeaderComponent,
        CdkScrollable,
        MatDialogContent,
        MatDialogActions,
        FormsModule,
        MatFormField,
        MatLabel,
        MatHint,
        MatInput,
        MatButton,
        ThingReadingsEditorComponent,
    ],
})
export class ThingsDeviceLinkEndDialogComponent {
    private dialogRef = inject<MatDialogRef<ThingsDeviceLinkEndDialogComponent, ThingDeviceLinkEndModel>>(MatDialogRef);
    data = inject<ThingsDeviceLinkEndDialogData>(MAT_DIALOG_DATA);

    until = '';
    rows: ReadingRow[] = rowsFor(this.data.link.readings ?? []);
    submitted = false;

    error(): string | null {
        if (this.until && new Date(this.until).getTime() <= new Date(this.data.link.from).getTime()) {
            return 'The end has to be after the start of the link.';
        }
        return readingRowsError(this.rows, parseReadingValue);
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.submitted = true;
        if (this.error() !== null) {
            return;
        }
        const end: ThingDeviceLinkEndModel = {};
        if (this.until) {
            end.until = toRfc3339Seconds(this.until);
        }
        const values = toUntilValues(this.rows, parseReadingValue);
        if (values.length > 0) {
            end.until_values = values;
        }
        this.dialogRef.close(end);
    }
}
