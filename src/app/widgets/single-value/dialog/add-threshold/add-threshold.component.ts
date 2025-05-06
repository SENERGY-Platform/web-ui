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

import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ValueHighlightConfig } from '../../shared/single-value.model';

@Component({
    selector: 'single-value-add-threshold',
    templateUrl: './add-threshold.component.html',
    styleUrls: ['./add-threshold.component.css']
})
export class AddThresholdComponent {
    form = new FormGroup({
        threshold: new FormControl<number|null>(null, {validators: Validators.required}),
        color: new FormControl('', {nonNullable: true, validators: Validators.required}),
        direction: new FormControl('', {nonNullable: true, validators: Validators.required}),
    });
    submitButtonText = 'Add';

    constructor(
      private dialogRef: MatDialogRef<AddThresholdComponent>,
      @Inject(MAT_DIALOG_DATA) public config?: ValueHighlightConfig,
    ) {
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
