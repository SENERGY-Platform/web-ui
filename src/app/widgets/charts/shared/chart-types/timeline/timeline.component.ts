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

import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, ViewChild, inject } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { ChartsExportVAxesModel } from '../../../export/shared/charts-export-properties.model';
import { timelineSeries, TimelineSeries, timelineXRange } from './timeline-chart-data';
import { timelineChartConfig, TimelineChartConfig, timelineSelection, TimelineSelection } from './timeline-chartjs';

@Component({
    selector: 'timeline-chart',
    templateUrl: './timeline.component.html',
    styleUrls: ['./timeline.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [BaseChartDirective]
})
export class TimelineComponent implements OnChanges {
    private errorHandlerService = inject(ErrorHandlerService);

    /*
    Data is expected to be in shape
    [NUMBER_TIMELINE_ROWS, NUMBER_COLUMNS, NUMBER_TIMESTAMPS, 2]
    where NUMBER_TIMELINE_ROWS comes mostly from the number of exports, the index has to match with the vAxes list to find the corresponding alias
    The last dimension is expected to be [timestamp string, value] and has to be sorted descending by timestamp
    */
    @Input() data: any[] = [];
    @Input() hAxisLabel = '';
    @Input() vAxisLabel = '';
    @Input() vAxes: ChartsExportVAxesModel[] = [];
    @Input() height = 0;
    @Input() width = 0;
    @Input() OnClickFnc = (_: TimelineSelection) => { };
    @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
    config?: TimelineChartConfig;
    private series: TimelineSeries[] = [];
    private isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent.toLowerCase());

    ngOnChanges(changes: SimpleChanges) {
        if (changes['data'] || changes['vAxes'] || changes['hAxisLabel'] || changes['vAxisLabel']) {
            this.series = this.prepareTimelineChartData();
            this.config = timelineChartConfig(this.series, timelineXRange(this.data || []), this.hAxisLabel, this.vAxisLabel,
                this.isSafari ? 'center' : 'end');
        }
        if ((changes['height'] || changes['width']) && !(this.height && this.width)) {
            console.error('Chart dimensions are not properly set.');
        }
    }

    prepareTimelineChartData(): TimelineSeries[] {
        if (this.data == null) {
            // no data
            return [];
        }

        if (this.errorHandlerService.checkIfErrorExists(this.data)) {
            throw (new Error((this.data as any).error));
        }

        return timelineSeries(this.data, this.vAxes);
    }

    onChartClick(active: object[] | undefined) {
        const element = (active || [])[0] as { datasetIndex: number; index: number } | undefined;
        const selection = element === undefined ? undefined : timelineSelection(this.series, element.datasetIndex, element.index);
        if (selection !== undefined) {
            this.OnClickFnc(selection);
        }
    }

    resetZoom() {
        this.chart?.chart?.resetZoom();
    }
}
