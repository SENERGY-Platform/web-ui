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
import { ChartsExportConversion } from '../../shared/charts-export-properties.model';

@Component({
  selector: 'app-add-rule',
  templateUrl: './add-rule.component.html',
  styleUrls: ['./add-rule.component.css']
})
export class AddRuleComponent {
  form = new FormGroup({
    from: new FormControl('', {nonNullable: true, validators: Validators.required}),
    to: new FormControl('', {nonNullable: true, validators: Validators.required}),
    color: new FormControl(''),
    alias: new FormControl(''),
  });

  constructor(
    private dialogRef: MatDialogRef<AddRuleComponent>,
    @Inject(MAT_DIALOG_DATA) public rule?: ChartsExportConversion,
  ) {
    if(rule != null) {
      this.form.controls.from.patchValue(rule.from);
      this.form.controls.to.patchValue(rule.to);
      this.form.controls.color.patchValue(rule.color || '');
      this.form.controls.alias.patchValue(rule.alias || '');
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  add() {
    this.dialogRef.close(this.form.value);
  }
}
