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
import { CodeEditorComponent } from '../../../../core/components/code-editor/code-editor.component';
import { ContentReviewService } from '../shared/content-review.service';
import { ReviewRequestModel } from '../shared/content-review.model';

/** The longest test description the service takes, counted in characters. */
export const MAX_TEST_DESCRIPTION_LENGTH = 10000;

export interface ProposeDialogData {
    releaseId: string;
    /** Name of the smart service. */
    name: string;
}

/** Why the text is no valid test parameters, or null when it is empty or a JSON object. */
export function testParametersError(text: string): string | null {
    if (text.trim() === '') {
        return null;
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return 'The test parameters are no valid JSON.';
    }
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? null : 'The test parameters must be a JSON object.';
}

/** Closes with the new request after a 201. A refusal keeps it open: the backend's message shows in the snack bar. */
@Component({
    selector: 'senergy-propose-dialog',
    templateUrl: './propose-dialog.component.html',
    styleUrls: ['./propose-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DialogHeaderComponent, CdkScrollable, MatDialogContent, MatDialogActions, MatButton, MatFormField, MatLabel, MatHint, MatInput, FormsModule, CodeEditorComponent]
})
export class ProposeDialogComponent {
    private dialogRef = inject<MatDialogRef<ProposeDialogComponent, ReviewRequestModel>>(MatDialogRef);
    private contentReviewService = inject(ContentReviewService);
    data = inject<ProposeDialogData>(MAT_DIALOG_DATA);

    readonly maxLength = MAX_TEST_DESCRIPTION_LENGTH;
    description = '';
    testParameters = '';
    sending = false;

    get descriptionLength(): number {
        return Array.from(this.description).length;
    }

    get parametersError(): string | null {
        return testParametersError(this.testParameters);
    }

    canPropose(): boolean {
        return !this.sending && this.description.trim() !== '' && this.descriptionLength <= this.maxLength && this.parametersError === null;
    }

    cancel(): void {
        this.dialogRef.close();
    }

    propose(): void {
        if (!this.canPropose()) {
            return;
        }
        this.sending = true;
        const parameters = this.testParameters.trim();
        this.contentReviewService.propose(this.data.releaseId, this.description, parameters === '' ? undefined : parameters).subscribe((request) => {
            this.sending = false;
            if (request !== null) {
                this.dialogRef.close(request);
            }
        });
    }
}
