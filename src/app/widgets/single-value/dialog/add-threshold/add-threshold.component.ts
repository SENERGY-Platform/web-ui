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
