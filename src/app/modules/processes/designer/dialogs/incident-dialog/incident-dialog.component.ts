import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProcessIncidentsConfig } from '../../../incidents/shared/process-incidents.model';

@Component({
    selector: 'app-incident-dialog',
    templateUrl: './incident-dialog.component.html',
    styleUrls: ['./incident-dialog.component.css']
})
export class IncidentDialogComponent {
    form = new FormGroup({
        message: new FormControl('')
    });
    constructor(
      private dialogRef: MatDialogRef<IncidentDialogComponent>,
      @Inject(MAT_DIALOG_DATA) private dialogParams: { config: ProcessIncidentsConfig},
    ) {
        this.form.controls.message.patchValue(dialogParams.config.message);
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.getConfig());
    }

    getConfig(): ProcessIncidentsConfig {
        const config: ProcessIncidentsConfig = {message: ''};
        Object.assign(config, this.form.value);
        return config;
    }

    formValid() {
        return this.form.valid;
    }
}
