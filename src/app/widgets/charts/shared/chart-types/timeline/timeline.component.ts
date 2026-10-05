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

import {
    ChangeDetectorRef,
    Component, Input,
    OnChanges,
    OnInit, SimpleChanges,
    ChangeDetectionStrategy
} from '@angular/core';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { ApexChartOptions, ChartsExportVAxesModel } from '../../../export/shared/charts-export-properties.model';
import ApexCharts from 'apexcharts';
import { timelineSeries, timelineXRange } from './timeline-chart-data';

@Component({
    selector: 'timeline-chart',
    templateUrl: './timeline.component.html',
    styleUrls: ['./timeline.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TimelineComponent implements OnInit, OnChanges {
    /*
    Data is expected to be in shape
    [NUMBER_TIMELINE_ROWS, NUMBER_COLUMNS, NUMBER_TIMESTAMPS, 2]
    where NUMBER_TIMELINE_ROWS comes mostly from the number of exports, the index has to match with the vAxes list to find the corresponding alias
    The last dimension is expected to be [timestamp string, value] and has to be sorted descending by timestamp
    */
    @Input() data: any[] = [];
    @Input() chartId = '';
    @Input() hAxisLabel = '';
    @Input() vAxisLabel = '';
    @Input() enableToolbar = false;
    @Input() vAxes: ChartsExportVAxesModel[] = [];
    @Input() height = 0;
    @Input() width = 0;
    @Input() OnClickFnc = (_: any, _2: any, _3: any) => { };
    render = false;
    private chartInstance: ApexCharts | null = null;
    private series: any[] = [];
    private colors: string[] = [];
    isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent.toLowerCase());

    apexChartOptions: Partial<ApexChartOptions> = {
        series: this.series,
        chart: {
            redrawOnParentResize: true,
            redrawOnWindowResize: true,
            width: 0.95 * this.width,
            height: '100%',
            animations: {
                enabled: false
            },
            type: 'rangeBar',
            toolbar: {
                show: false
            },
            events: {},
            zoom: {
                allowMouseWheelZoom: false,
            }
        },
        plotOptions: {
            bar: {
                barHeight: '90%',
                horizontal: true,
                rangeBarGroupRows: true
            }
        },
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeUTC: false,
            },
            title: {
                text: ''
            },
        },
        yaxis: {
            title: {
                text: ''
            },
        },
        colors: this.colors,
        legend: {
            position: 'top',
            show: true,
            horizontalAlign: this.isSafari ? 'center' : 'right',
            offsetY: 15,
            showForSingleSeries: true,
        },
        tooltip: {
            x: {
                format: 'dd.MM HH:mm:ss',
            }
        }
    };

    constructor(
        private errorHandlerService: ErrorHandlerService,
        private cdr: ChangeDetectorRef,
    ) { }

    ngOnInit() {
        // id must clearly identify apx-chart in case multiple widgets of the same type are used
        this.chartId = this.chartId + `_chart_${Math.random().toString(35).substring(2, 7)}`;
        if (this.apexChartOptions.chart !== undefined) {
            this.apexChartOptions.chart.id = this.chartId;
        }
        this.renderTimelineChart();
        if (this.apexChartOptions.chart != null && this.apexChartOptions.chart.events != null) {
            this.apexChartOptions.chart.events['dataPointSelection'] = this.OnClickFnc;
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        let shouldRebuild = false;
        let shouldReloadData = false;

        if (changes['data']) {
            shouldRebuild = true;
            shouldReloadData = true;
        }
        if (changes['height'] || changes['width']) {
            shouldRebuild = true;
        }
        if (shouldRebuild) {
            this.rebuildChart(shouldReloadData);
        }
    }

    rebuildChart(reloadData = true) {
        this.chartInstance = null;
        this.renderTimelineChart(reloadData);
        this.cdr.markForCheck(); // Ensure Angular detects and applies the changes
    }

    destroyChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy(); // Destroy the ApexCharts instance
            this.chartInstance = null; // Reset the chart instance
        }
    }
    /*
    resize(height: number, width: number) {
        if(this.apexChartOptions.chart !== undefined) {
            this.apexChartOptions.chart.width = width;
            this.apexChartOptions.chart.height = height;
            this.apexChartOptions.series = this.apexChartOptions.series;
        }
    }*/

    private getXRange() {
        return timelineXRange(this.data);
    }

    private renderTimelineChart(reloadData = true) {
        if (reloadData || this.series.length === 0) {
            const chartData = this.prepareTimelineChartData();
            this.series = chartData.data;
            this.colors = chartData.colors;
            this.apexChartOptions.series = chartData.data;
            this.apexChartOptions.colors = chartData.colors;

            const xRange = this.getXRange();
            const chartOpt: Partial<ApexChartOptions> = {
                xaxis: {
                    type: 'datetime',
                    labels: {
                        datetimeUTC: false,
                    },
                    title: {
                        text: ''
                    },
                    min: xRange[0],
                    max: xRange[1],
                }
            };
            this.apexChartOptions.xaxis = chartOpt.xaxis;
        }
        if (this.enableToolbar && this.apexChartOptions.chart?.toolbar !== undefined) {
            this.apexChartOptions.chart.toolbar.show = true;
        }
        if (this.apexChartOptions.xaxis?.title !== undefined) {
            this.apexChartOptions.xaxis.title.text = this.hAxisLabel;
        }
        if (this.apexChartOptions.yaxis?.title !== undefined) {
            this.apexChartOptions.yaxis.title.text = this.vAxisLabel;
        }
        // Ensure valid chart dimensions
        if (this.height && this.width) {
            this.apexChartOptions.chart!.height = `${0.9 * this.height}px`;
            this.apexChartOptions.chart!.width = `${0.9 * this.width}px`;
        } else {
            console.error('Chart dimensions are not properly set.');
        }

        this.render = true;
        this.chartInstance = ApexCharts.getChartByID(this.chartId) || null;
        if (this.chartInstance !== null) {
            this.chartInstance.render();
        }
    }

    prepareTimelineChartData() {
        if (this.data == null) {
            // no data
            return { data: [], colors: [] };
        }

        if (this.errorHandlerService.checkIfErrorExists(this.data)) {
            throw (new Error((this.data as any).error));
        }

        return timelineSeries(this.data, this.vAxes);
    }

    resetZoom() {
        if (!this.chartInstance) {
            this.chartInstance = ApexCharts.getChartByID(this.chartId) || null;
        }
        if (this.chartInstance && this.apexChartOptions.xaxis?.min && this.apexChartOptions.xaxis?.max) {
            this.chartInstance.zoomX(this.apexChartOptions.xaxis.min, this.apexChartOptions.xaxis.max);
        }
    }
}
