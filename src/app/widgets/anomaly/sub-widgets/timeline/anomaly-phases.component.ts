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

import { Component, Input, OnChanges, OnInit, SimpleChanges, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ChartsExportVAxesModel } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';
import { AnomaliesPerDevice } from '../../shared/anomaly.model';
import { AnomalyReconstructionComponent } from '../../reconstruction/reconstruction.component';
import { AnomalyService } from '../../shared/anomaly.service';
import { subtractDuration } from '../../../../core/time/iso-duration';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { anomalyOfBar, curveAnomaliesPerDevice, phaseTimelineData, phaseVAxes } from '../../shared/anomaly-phases';
import { TimelineSelection } from 'src/app/widgets/charts/shared/chart-types/timeline/timeline-chartjs';
import { TimelineComponent } from '../../../charts/shared/chart-types/timeline/timeline.component';

@Component({
    selector: 'anomaly-phases',
    templateUrl: './anomaly-phases.component.html',
    styleUrls: ['./anomaly-phases.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [TimelineComponent]
})
export class AnomalyPhasesComponent implements OnInit, OnChanges {
    private dialog = inject(MatDialog);
    private anomalyService = inject(AnomalyService);

    @Input() anomalies: AnomaliesPerDevice = {};
    @Input() hAxisLabel = '';
    @Input() vAxisLabel = '';
    @Input() deviceIDs: string[] = [];
    @Input() widget?: WidgetModel;
    @Input() widgetHeight = 0;
    @Input() widgetWidth = 0;
    curveAnomaliesPerDevice: AnomaliesPerDevice = {};

    // Timeline
    anomaliePhases: any = [];
    timelineWidth = 0;
    timelineHeight = 0;
    vAxes: ChartsExportVAxesModel[] = [];
    chartDataReady = false;

    self = this;

    ngOnChanges(changes: SimpleChanges): void {
        const widgetWidth = changes['widgetWidth'];
        const widgetHeight = changes['widgetHeight'];
        if(widgetWidth != null) {
            this.timelineWidth = widgetWidth.currentValue;
        }

        if(widgetHeight != null) {
            this.timelineHeight = widgetHeight.currentValue;
        }
    }


    filterCurveAnomalies() {
        this.curveAnomaliesPerDevice = curveAnomaliesPerDevice(this.anomalies, this.deviceIDs);
    }

    ngOnInit(): void {
        // console.log(this.curveAnomaliesPerDevice)
        this.filterCurveAnomalies();

        // data must be sorted by descending time for timeline chart
        const timeRangeConfig = this.widget?.properties.anomalyDetection?.timeRangeConfig?.timeRange;
        if(timeRangeConfig == null) {
            throw new Error('Time Range not configured');
        }
        const time = timeRangeConfig.time || '1';
        const level = timeRangeConfig.level || 'd';
        const earliestStartTime = subtractDuration(new Date(), time, level);
        this.anomaliePhases = phaseTimelineData(this.anomalyService.createPhaseWindows(this.curveAnomaliesPerDevice, earliestStartTime));
        this.createVAxes();
        this.chartDataReady = true;
    }

    createVAxes() {
        this.vAxes.push(...phaseVAxes(this.deviceIDs));
    }

    // an arrow function, so that `this` is accessible when the timeline calls it
    onClick = (bar: TimelineSelection) => {
        const anomaly = anomalyOfBar(this.curveAnomaliesPerDevice[bar.row] || [], bar);
        if (anomaly === undefined) {
            return;
        }
        const dialogConfig = new MatDialogConfig();
        dialogConfig.minWidth = '1000px';
        dialogConfig.minHeight = '500px';
        dialogConfig.data = { anomaly };
        this.dialog.open(AnomalyReconstructionComponent, dialogConfig);
    };
}
