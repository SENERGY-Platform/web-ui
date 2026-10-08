/*
 * Copyright 2020 InfAI (CC SES)
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
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { HistoricDataConfig } from '../../shared/designer.model';
import { ExportModel } from '../../../../exports/shared/export.model';
import { ExportService } from '../../../../exports/shared/export.service';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatError, MatSuffix } from '@angular/material/form-field';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { MatInput } from '@angular/material/input';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './historic-data-config-dialog.component.html',
    styleUrls: ['./historic-data-config-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, MatFormField, MatLabel, MtxSelect, MtxOption, MatError, MatErrorMessagesDirective, MatInput, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker, MatDialogActions, MatButton]
})
export class HistoricDataConfigDialogComponent {
    private dialogRef = inject<MatDialogRef<HistoricDataConfigDialogComponent>>(MatDialogRef);
    private exportsService = inject(ExportService);
    private dialogParams = inject<{
        initial: HistoricDataConfig;
    }>(MAT_DIALOG_DATA);

    config: HistoricDataConfig;
    availableMeasurements: ExportModel[] = [];
    readonly times = [
        {
            id: 'seconds',
            name: 'Seconds',
        },
        {
            id: 'minutes',
            name: 'Minutes',
        },
        {
            id: 'hours',
            name: 'Hours',
        },
    ];
    readonly availableActions = [
        {
            id: 'sum',
            name: 'Sum',
        },
        {
            id: 'mean',
            name: 'Average',
        },
        {
            id: 'median',
            name: 'Median',
        },
        {
            id: 'min',
            name: 'Minimum',
        },
        {
            id: 'max',
            name: 'Maximum',
        },
        {
            id: 'count',
            name: 'Value Count',
        },
    ];

    constructor() {
        const exportsService = this.exportsService;
        const dialogParams = this.dialogParams;

        this.config = dialogParams.initial || { dateInterval: {}, interval: {}, analysisAction: '' };
        exportsService.getExports(true, '', 9999, 0, 'name', 'asc').subscribe((value) => {
            if (value) {
                this.availableMeasurements = value.instances || [];
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        const result: HistoricDataConfig = {
            analysisAction: this.config.analysisAction,
            interval: this.config.interval,
            dateInterval: this.config.dateInterval,
        };
        this.dialogRef.close(result);
    }
}
