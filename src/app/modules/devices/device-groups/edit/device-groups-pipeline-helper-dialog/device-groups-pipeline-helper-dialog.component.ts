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

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PipelineModel } from '../../../../data/pipeline-registry/shared/pipeline.model';
import { SelectionModel } from '@angular/cdk/collections';
import { MatCheckboxChange } from '@angular/material/checkbox';
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
