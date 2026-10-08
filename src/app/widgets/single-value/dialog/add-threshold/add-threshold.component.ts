/*
 * Copyright 2025 InfAI (CC SES)
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
import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { ValueHighlightConfig } from '../../shared/single-value.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'single-value-add-threshold',
    templateUrl: './add-threshold.component.html',
    styleUrls: ['./add-threshold.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MtxOption, MatDialogActions, MatButton]
})
export class AddThresholdComponent {
    private dialogRef = inject<MatDialogRef<AddThresholdComponent>>(MatDialogRef);
    config? = inject<ValueHighlightConfig>(MAT_DIALOG_DATA);

    form = new FormGroup({
        threshold: new FormControl<number|null>(null, {validators: Validators.required}),
        color: new FormControl('', {nonNullable: true, validators: Validators.required}),
        direction: new FormControl('', {nonNullable: true, validators: Validators.required}),
    });
    submitButtonText = 'Add';

    constructor() {
        const config = this.config;

        if(config != null) {
            this.form.controls.threshold.patchValue(config.threshold);
            this.form.controls.color.patchValue(config.color);
            this.form.controls.direction.patchValue(config.direction);
            this.submitButtonText = 'Update';
        }
    }

    cancel() {
        this.dialogRef.close();
    }

    add() {
        this.dialogRef.close(this.form.value);
    }
}
