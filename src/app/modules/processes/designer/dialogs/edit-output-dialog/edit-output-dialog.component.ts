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

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { BpmnParameter } from '../../shared/designer.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { MatButton } from '@angular/material/button';
import { ShortOutputVariableNamePipe } from '../../../../../core/pipe/short-output-variable-name.pipe';

@Component({
    templateUrl: './edit-output-dialog.component.html',
    styleUrls: ['./edit-output-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, MatFormField, MatInput, MatLabel, MatError, MatErrorMessagesDirective, MatDialogActions, MatButton, ShortOutputVariableNamePipe]
})
export class EditOutputDialogComponent {
    private dialogRef = inject<MatDialogRef<EditOutputDialogComponent>>(MatDialogRef);
    private dialogParams = inject<{
        outputs: BpmnParameter[];
    }>(MAT_DIALOG_DATA);

    outputs: BpmnParameter[];

    constructor() {
        const dialogParams = this.dialogParams;

        this.outputs = dialogParams.outputs;
    }

    close(): void {
        this.dialogRef.close();
    }
}
