import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add-rule',
  templateUrl: './add-rule.component.html',
  styleUrls: ['./add-rule.component.css']
})
export class AddRuleComponent {
  constructor(
    private dialogRef: MatDialogRef<AddRuleComponent>
  ) {}

  form = new FormGroup({
    from: new FormControl('', {nonNullable: true, validators: Validators.required}),
    to: new FormControl('', {nonNullable: true, validators: Validators.required}),
    color: new FormControl(''),
    alias: new FormControl(''),
  });

  cancel() {
    this.dialogRef.close();
  }

  add() {
    this.dialogRef.close(this.form.value);
  }
}
