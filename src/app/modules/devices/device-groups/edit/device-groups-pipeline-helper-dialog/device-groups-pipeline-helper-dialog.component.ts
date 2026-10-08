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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { PipelineModel } from '../../../../data/pipeline-registry/shared/pipeline.model';
import { SelectionModel } from '@angular/cdk/collections';
import { MatCheckboxChange, MatCheckbox } from '@angular/material/checkbox';
import { Router } from '@angular/router';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'senergy-device-groups-pipeline-helper-dialog',
    templateUrl: './device-groups-pipeline-helper-dialog.component.html',
    styleUrls: ['./device-groups-pipeline-helper-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatDialogActions, MatButton, MatTooltip, DatePipe]
})
export class DeviceGroupsPipelineHelperDialogComponent implements OnInit {
    data = inject(MAT_DIALOG_DATA);
    private dialogRef = inject<MatDialogRef<DeviceGroupsPipelineHelperDialogComponent>>(MatDialogRef);
    private router = inject(Router);

    pipelineSelection = new SelectionModel<PipelineModel>(true, []);

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
