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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {HistoricDataConfig} from '../../shared/designer.model';
import {ExportModel} from '../../../../data/export/shared/export.model';
import {ExportService} from '../../../../data/export/shared/export.service';


@Component({
  templateUrl: './historic-data-config-dialog.component.html',
  styleUrls: ['./historic-data-config-dialog.component.css']
})
export class HistoricDataConfigDialogComponent implements OnInit {
    config: HistoricDataConfig;
    availableMeasurements: ExportModel[] = [];
    readonly times =  [
        {
            'id': 'seconds',
            'name': 'Seconds'
        },
        {
            'id': 'minutes',
            'name': 'Minutes'
        },
        {
            'id': 'hours',
            'name': 'Hours'
        }
    ];
    readonly availableActions = [
        {
            'id': 'sum',
            'name': 'Sum'
        },
        {
            'id': 'mean',
            'name': 'Average'
        },
        {
            'id': 'median',
            'name': 'Median'
        },
        {
            'id': 'min',
            'name': 'Minimum'
        },
        {
            'id': 'max',
            'name': 'Maximum'
        },
        {
            'id': 'count',
            'name': 'Value Count'
        },
    ];

    constructor(
        private dialogRef: MatDialogRef<HistoricDataConfigDialogComponent>,
        private exportsService: ExportService,
        @Inject(MAT_DIALOG_DATA) private dialogParams: {initial: HistoricDataConfig}
    ) {
        this.config = dialogParams.initial || {dateInterval: {}, interval: {}, analysisAction: ''};
        exportsService.getExports('', 9999, 0, 'name', 'asc').subscribe(value => {
            if (value) {
                this.availableMeasurements = value;
            }
        });
    }


    ngOnInit() {}

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        const result: HistoricDataConfig = {
            analysisAction: this.config.analysisAction,
            interval: this.config.interval,
            dateInterval: this.config.dateInterval
        };
        this.dialogRef.close(result);
    }
}
