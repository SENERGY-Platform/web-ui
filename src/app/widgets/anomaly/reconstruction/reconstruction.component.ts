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
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { reconstructionPoints } from './reconstruction-chart';
import { reconstructionChart } from './reconstruction-chartjs';
import { FramedChartConfig } from '../../../core/charts/google-columns';
import { googlePlugins } from '../../../core/charts/google-chartjs';
import { AnomalyResultModel } from '../shared/anomaly.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../core/directives/close-mtx-select-on-scroll.directive';
import { BaseChartDirective } from 'ng2-charts';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'anomaly-reconstruction',
    templateUrl: './reconstruction.component.html',
    styleUrls: ['./reconstruction.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, BaseChartDirective, MatDialogActions, MatButton]
})
export class AnomalyReconstructionComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<AnomalyReconstructionComponent>>(MatDialogRef);
    data = inject<{
        anomaly: AnomalyResultModel;
    }>(MAT_DIALOG_DATA);

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
  

    constructor() {
        const data = this.data;

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
