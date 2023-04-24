import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { PipelineModel } from '../../../../data/pipeline-registry/shared/pipeline.model';
import { SelectionModel } from '@angular/cdk/collections';
import { MatLegacyCheckboxChange as MatCheckboxChange } from '@angular/material/legacy-checkbox';
import { Router } from '@angular/router';

@Component({
    selector: 'senergy-device-groups-pipeline-helper-dialog',
    templateUrl: './device-groups-pipeline-helper-dialog.component.html',
    styleUrls: ['./device-groups-pipeline-helper-dialog.component.css'],
})
export class DeviceGroupsPipelineHelperDialogComponent implements OnInit {
    pipelineSelection = new SelectionModel<PipelineModel>(true, []);

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: PipelineModel[],
        private dialogRef: MatDialogRef<DeviceGroupsPipelineHelperDialogComponent>,
        private router: Router,
    ) {}

    ngOnInit(): void {
        this.pipelineSelection = new SelectionModel<PipelineModel>(true, this.data);
    }

    save() {
        const next = this.pipelineSelection.selected.map((p) => p.id);
        this.router
            .navigateByUrl('/data/pipelines/edit/' + next[0] + '?next=' + next.splice(1).join(','))
            .then((_) => this.dialogRef.close());
    }

    close() {
        this.dialogRef.close();
    }

    checkboxed(value: PipelineModel, $event: MatCheckboxChange) {
        if ($event.checked) {
            this.pipelineSelection.select(value);
        } else {
            this.pipelineSelection.deselect(value);
        }
    }

    masterCheckboxed($event: MatCheckboxChange) {
        if ($event.checked) {
            this.pipelineSelection.select(...this.data);
        } else {
            this.pipelineSelection.deselect(...this.data);
        }
    }
}
