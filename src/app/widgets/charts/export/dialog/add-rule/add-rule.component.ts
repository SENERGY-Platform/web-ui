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
