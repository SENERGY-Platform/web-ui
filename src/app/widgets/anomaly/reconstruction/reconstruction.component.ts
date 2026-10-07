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

import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { reconstructionPoints } from './reconstruction-chart';
import { reconstructionChart } from './reconstruction-chartjs';
import { FramedChartConfig } from '../../../core/charts/google-columns';
import { googlePlugins } from '../../../core/charts/google-chartjs';
import { AnomalyResultModel } from '../shared/anomaly.model';

@Component({
    selector: 'anomaly-reconstruction',
    templateUrl: './reconstruction.component.html',
    styleUrls: ['./reconstruction.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class AnomalyReconstructionComponent implements OnInit {
    chart?: FramedChartConfig<'line'>;
    readonly plugins = googlePlugins;
    ready = false;
    values = [
      [
        '2024-04-29T12:01:54.288249Z',
        1,
        2
      ],
      [
        '2024-04-29T13:01:54.288249Z',
        2,
        2
      ],
      [
        '2024-04-29T14:01:54.288249Z',
        2,
        3
      ],
    ];
  

    constructor(
        private dialogRef: MatDialogRef<AnomalyReconstructionComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {anomaly: AnomalyResultModel}
    ) {
        this.values = data.anomaly.original_reconstructed_curves;
    }

    ngOnInit(): void {
        this.setupChartData();
    }

    setupChartData() {
        this.chart = reconstructionChart(reconstructionPoints(this.values));
        this.ready = true;
    }

    close(): void {
        this.dialogRef.close();
    }
}
