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

import { AfterViewInit, ChangeDetectorRef, Component, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { GoogleChartComponent, } from 'ng2-google-charts';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ElementSizeService } from '../../../core/services/element-size.service';
import { ChartsModel } from '../shared/charts.model';
import { ChartsExportService } from './shared/charts-export.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { Subscription } from 'rxjs';
import { ErrorModel } from '../../../core/model/error.model';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ChartsService } from '../shared/charts.service';
import { ChartsExportDeviceGroupMergingStrategy, ChartsExportVAxesModel } from './shared/charts-export-properties.model';
import { BubbleDataPoint, Chart, ChartConfiguration, ChartData, ChartDataset, ChartTypeRegistry, Point, TooltipModel, Plugin } from 'chart.js';
import { DatePipe } from '@angular/common';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin, { AnnotationOptions } from 'chartjs-plugin-annotation';
import 'chartjs-adapter-moment';
import moment from 'moment';
import { AnyObject } from 'node_modules/chart.js/dist/types/basic';
import { findLabel, getLabelHitBoxes } from './chartjs-axis-click';

enum DetailLevel {
    ms = 6,
    s = 5,
    m = 4,
    h = 3,
    d = 2,
    months = 1,
    y = 0,
    unknown = -1,
}

@Component({
    selector: 'senergy-charts-export',
    templateUrl: './charts-export.component.html',
    styleUrls: ['./charts-export.component.css'],
})
export class ChartsExportComponent implements OnInit, OnDestroy, AfterViewInit {
    chartExportData = {} as ChartsModel;
    timelineChartData: any;
    timelineWidth = 0;
    timelineHeight = 0;
    ready = false;
    refreshing = false;
    destroy = new Subscription();
    configureWidget = false;
    errorHasOccured = false;
    errorMessage = '';
    sizeLimit = 10000;
    size = 0;
    chartjs: {
        options: ChartConfiguration['options'];
        data: ChartData<keyof ChartTypeRegistry, (number | [number, number] | Point | BubbleDataPoint | null)[], unknown> | undefined;
        tooltipContext: { chart: Chart; tooltip: TooltipModel<any> } | undefined;
        tooltipDisplay: string;
        tooltipAllowed: boolean;
        tooltipDatasets: { datasetIndex: number, label: string, formattedValue: string, drawToLeft: boolean }[];
        minDateMs?: number;
        maxDateMs?: number;
        nextDateMs?: number;
        annotations?: AnnotationOptions[];
        plugins: Plugin<keyof ChartTypeRegistry, AnyObject>[];
        cursorLocked: boolean;
    } = {
            options: {},
            data: undefined,
            tooltipContext: undefined,
            tooltipAllowed: false,
            tooltipDisplay: 'none',
            tooltipDatasets: [],
            plugins: [{
                id: 'chartClickXLabel',
                events: ['click'],
                afterEvent: (chart, event) => {
                    const evt = event.event;
                    const [found, labelInfo] = findLabel(getLabelHitBoxes(chart.scales.x), evt);
                    const currentDetailLevel = this.detailLevel(this.groupTime);
                    switch (evt.type) {
                        case 'click':
                            if (found && currentDetailLevel < DetailLevel.ms) {
                                const newDetailLevel = currentDetailLevel + 1;
                                this.groupTime = this.groupTimeFromDetailLevel(newDetailLevel);
                                this.hAxisFormat = this.xAxisFormat(newDetailLevel);
                                this.from = new Date(this.chartjsChart?.scales['x'].ticks[labelInfo.index].value as number);
                                if (this.chartjsChart?.scales['x'].ticks !== undefined && this.chartjsChart?.scales['x'].ticks.length > labelInfo.index + 1) {
                                    this.to = new Date(this.chartjsChart?.scales['x'].ticks[labelInfo.index + 1].value as number);
                                } else {
                                    this.to = new Date(this.chartjs.nextDateMs || 0);
                                }
                                this.ready = false;
                                this.cd.detectChanges();
                                this.refresh();
                            }
                            return;
                        case 'mousemove':
                            if (this.chartJsCanvas?.nativeElement === undefined) {
                                return;
                            }
                            if (found) {
                                this.chartJsCanvas.nativeElement.style.cursor = 'zoom-in';
                            } else if (this.chartjs.cursorLocked !== true) {
                                this.chartJsCanvas.nativeElement.style.cursor = 'default';
                            }
                            return;
                    }
                },
            }],
            cursorLocked: false,
        };

    private resizeTimeout = 0;
    private timeRgx = /(\d+)(ms|s|months|m|h|d|w|y)/;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    @Input() initialWidgetData: any;

    @HostListener('window:resize')
    onResize() {
        if (this.resizeTimeout === 0) {
            this.resizeTimeout = window.setTimeout(() => {
                this.resizeChart();
                if (this.chartExportData.dataTable != null && this.chartExportData.dataTable.length > 0 && this.chartExportData.dataTable[0].length > 0 && this.chartExport !== undefined) {
                    this.chartExport.draw();
                }
                this.resizeTimeout = 0;
            }, 500);
        }
    }

    // Use a setter for the chart which will get called when then ngif from ready evaluates to true
    // This is needed so the element is not undefined when called later to draw
    private chartExport?: GoogleChartComponent;
    @ViewChild('chartExport', { static: false }) set content(content: GoogleChartComponent) {
        if (content) { // initially setter gets called with undefined
            this.chartExport = content;
        }
    }

    @ViewChild('chartjswidget') chartJsCanvas: any | undefined;

    constructor(
        private chartsService: ChartsService,
        private chartsExportService: ChartsExportService,
        private elementSizeService: ElementSizeService,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService,
        private datePipe: DatePipe,
        private cd: ChangeDetectorRef,
    ) {
        Chart.register(zoomPlugin, annotationPlugin);
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
        if (this.chartExport !== undefined) {
            this.chartsService.releaseResources(this.chartExport);
        }
    }

    ngOnInit(): void {
        this.scheduleRefresh();
    }

    ngAfterViewInit(): void {
        // use this hook, to get the resize sizes from the correct widget
        this.setupInitialChartData();

    }

    setupInitialChartData() {
        if (this.initialWidgetData != null) {
            if (this.widget.properties.chartType === 'Timeline') {
                this.timelineChartData = this.initialWidgetData;
                this.resizeApex();
            } else if (this.widget.properties.chartType === 'ColumnChart') {
                this.chartjs = this.initialWidgetData;
                this.resizeChart();
            } else {
                this.chartExportData = this.initialWidgetData;
                this.resizeChart();
            }
            this.setupZoomChartSettings();
            setTimeout(() => {
                this.ready = true;
            });
        }
    }

    edit() {
        this.chartsExportService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    private scheduleRefresh() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refresh();
            }
        });
    }

    private checkConfiguration() {
        if (this.widget.properties.exports) {
            if (this.widget.properties.exports.length < 1) {
                this.configureWidget = true;
            }
        } else {
            this.configureWidget = true;
        }

        if (this.widget.properties.time === undefined) {
            this.configureWidget = true;
        }
    }


    private resizeChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 5, 10);
        if (this.chartExportData.options !== undefined) {
            this.chartExportData.options.height = element.height;
            this.chartExportData.options.width = element.width;
            if (this.chartExportData.options.chartArea) {
                this.chartExportData.options.chartArea.height = element.heightPercentage;
                this.chartExportData.options.chartArea.width = element.widthPercentage;
            }
        }

        this.timelineHeight = element.height;
        this.timelineWidth = element.width;

        if (this.widget.properties.chartType === 'ColumnChart') {
            let dateFormat = this.hAxisFormat;
            switch (dateFormat) {
                case 'EEE':
                case 'EE':
                case 'E':
                    dateFormat = 'ddd';
                    break;
                case 'dd.MM.':
                    dateFormat = 'DD.MM.';
                    break;
            }
            if (dateFormat === 'EEE' || dateFormat === 'EE' || dateFormat === 'E') {
                dateFormat = 'ddd';
                // was using Angular DatePipe before and uses moment-js now.
            }
            this.chartjs.options = {
                animation: false,
                maintainAspectRatio: false,
                events: ['click', 'mousemove'],
                onHover: (_, elements) => {
                    if (elements !== undefined && elements.length === 1 && this.drillable(elements[0].datasetIndex)) {
                        this.chartJsCanvas.nativeElement.style.cursor = 'pointer';
                        this.chartjs.cursorLocked = true;
                    } else {
                        this.chartJsCanvas.nativeElement.style.cursor = 'default';
                        this.chartjs.cursorLocked = false;
                    }
                },
                onClick: (_, elements) => {
                    if (elements !== undefined && elements.length === 1 && this.drillable(elements[0].datasetIndex)) {
                        this.drillDown(elements[0].datasetIndex);
                    }
                },
                plugins: {
                    legend: {
                        display: this.zoom,
                    },
                    tooltip: {
                        enabled: false,
                        callbacks: {
                            afterBody: (tooltipItems) => {
                                this.chartjs.tooltipDatasets = tooltipItems.map(x => {
                                    return {
                                        datasetIndex: x.datasetIndex,
                                        formattedValue: x.formattedValue,
                                        label: x.dataset.label || '',
                                        drawToLeft: x.dataIndex > x.dataset.data.length / 2,
                                    };
                                });
                                return [];
                            }
                        },
                        external: (context) => {
                            if (context.tooltip.dataPoints !== undefined && context.tooltip.dataPoints.length > 0) {
                                context.tooltip.title = [moment((context.tooltip.dataPoints[0].raw as { x: number }).x).format(dateFormat)];
                            }
                            this.chartjs.tooltipContext = context;
                            this.chartjs.tooltipDisplay = 'initial';
                            this.cd.detectChanges();
                        },
                    },
                    zoom: {
                        zoom: {
                            drag: {
                                enabled: true
                            },
                            mode: 'x',
                        },
                    },
                    annotation: {
                        annotations: this.chartjs.annotations,
                    },
                },
                scales: {
                    'y': {
                        stacked: this.stacked,
                        title: {
                            text: this.widget.properties.vAxisLabel,
                            display: (this.widget.properties.vAxisLabel || '').length > 0,
                        },
                    },
                    'y2': {
                        stacked: this.stacked,
                        position: 'right',
                        title: {
                            text: this.widget.properties.secondVAxisLabel,
                            display: (this.widget.properties.secondVAxisLabel || '').length > 0,
                        },
                        display: 'auto',
                    },
                    'x': {
                        stacked: this.stacked,
                        title: {
                            text: this.widget.properties.hAxisLabel,
                            display: (this.widget.properties.hAxisLabel || '').length > 0,
                        },
                        type: 'timeseries',
                        min: this.chartjs.minDateMs,
                        max: this.chartjs.maxDateMs,
                        time: {
                            displayFormats: {
                                'millisecond': dateFormat,
                                'second': dateFormat,
                                'minute': dateFormat,
                                'hour': dateFormat,
                                'day': dateFormat,
                                'week': dateFormat,
                                'month': dateFormat,
                                'quarter': dateFormat,
                                'year': dateFormat,
                            }
                        }
                    },
                }
            };
            this.chartjsChart?.resize(element.width, element.height);
            this.chartjsChart?.draw();
        }
    }

    get chartjsChart(): Chart | undefined {
        return Chart.getChart('chartjs-' + this.widget.id);
    }

    private resizeApex() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 5, 10);
        this.timelineWidth = element.width;
        this.timelineHeight = element.height;
    }

    getTimelineData() {
        this.resizeApex();

        this.chartsExportService.getData(this.widget.properties, this.from?.toISOString(), this.to?.toISOString(), this.groupTime || undefined, this.hAxisFormat || undefined).subscribe({
            next: (data) => {
                this.timelineChartData = data.data;
                this.ready = true;
                this.refreshing = false;
            },
            error: (err) => {
                this.errorHasOccured = true;
                this.errorMessage = 'No data';
                this.errorHandlerService.logError('Chart Export', 'getChartData', err);
                this.ready = true;
                this.refreshing = false;
            }
        });
    }

    changesTimeframeOnZoom(): boolean {
        const rgxRes = this.timeRgx.exec(this.widget.properties.time?.last || '');
        return this.widget.properties.chartType === 'LineChart' && this.from === null && this.to === null && rgxRes?.length === 3;
    }

    private refresh() {
        this.refreshing = true;
        this.checkConfiguration();
        if (this.configureWidget === false) {
            let lastOverride: string | undefined;
            if (this.zoom && this.changesTimeframeOnZoom()) {
                const rgxRes = this.timeRgx.exec(this.widget.properties.time?.last || '');
                if (rgxRes?.length !== 3) {
                    return;
                }
                lastOverride = Number(rgxRes[1]) * (this.widget.properties.zoomTimeFactor || 2) + rgxRes[2];
            }

            if (this.widget.properties.chartType === 'Timeline') {
                this.getTimelineData();
                return;
            }

            const widget = JSON.parse(JSON.stringify(this.widget)) as WidgetModel;

            if (this.modifiedVaxes !== null) {
                widget.properties.vAxes = this.modifiedVaxes;
            }

            widget.properties.stacked = this.stacked;

            this.chartsExportService.getChartData(widget, this.from?.toISOString(), this.to?.toISOString(), this.groupTime || undefined, this.hAxisFormat || undefined, lastOverride, this.chooseColors).subscribe((resp: ChartsModel | ErrorModel) => {
                if (this.errorHandlerService.checkIfErrorExists(resp)) {
                    this.errorHasOccured = true;
                    this.errorMessage = 'No data';
                    this.errorHandlerService.logError('Chart Export', 'getChartData', resp);
                } else {
                    this.errorHasOccured = false;
                    this.chartExportData = resp;
                    this.chartExportData.dataTable.sort((a, b) => (a[0] as Date).valueOf() - (b[0] as Date).valueOf());

                    this.setupZoomChartSettings(lastOverride);
                    this.resizeChart();
                    this.chartExport?.draw();
                }
                this.size = (this.chartExportData?.dataTable?.length || 0) * ((this.chartExportData?.dataTable?.[0]?.length || 0) - 1);
                if (this.size > this.sizeLimit) {
                    console.warn('Chart Widget ' + this.widget.name + ' uses ' + this.size + ' points which is above the recommended limit of ' + this.sizeLimit);
                }
                if (this.widget.properties.chartType === 'ColumnChart') {
                    if (this.chartExportData?.dataTable.length < 2) {
                        this.chartjs.data = undefined;
                        this.ready = true;
                        this.refreshing = false;
                        return;
                    }
                    const datasets: ChartDataset[] = new Array(this.chartExportData?.dataTable[0].length - 1).fill({});
                    const axes = this.modifiedVaxes || this.widget.properties.vAxes;
                    this.chartExportData?.dataTable[0].slice(1).forEach((label, i) => {
                        const axis = axes === undefined ? undefined : axes[i];
                        datasets[i] = { data: [], label: '' + label, yAxisID: axis === undefined ? 'y' : (axis.displayOnSecondVAxis ? 'y2' : 'y') };
                        if (this.chartExportData.options?.colors !== undefined && this.chartExportData.options.colors.length > i) {
                            datasets[i].backgroundColor = this.chartExportData.options.colors[i];
                        } else {
                            datasets[i].backgroundColor = window.getComputedStyle(document.getElementsByClassName('color-lookup-accent')[0], null).getPropertyValue('color');
                        }
                    });
                    let dateFormat = this.hAxisFormat || undefined;
                    if (dateFormat !== undefined && dateFormat !== null && dateFormat.length === 0) {
                        dateFormat = undefined;
                    }
                    if (this.chartExportData?.dataTable !== undefined && this.chartExportData.dataTable.length > 1) {
                        this.chartjs.minDateMs = (this.chartExportData.dataTable[1][0] as Date).valueOf();
                    }
                    this.chartExportData?.dataTable.slice(1).forEach(row => row.forEach((data, i) => {
                        if (i === 0) {
                            this.chartjs.maxDateMs = (data as Date).valueOf();
                        } else {
                            if (data !== null && data !== 0) {
                                datasets[i - 1].data.push({ y: data as number, x: (row[0] as Date).valueOf() });
                            }
                        }
                    }));
                    this.chartjs.data = {
                        datasets,
                    };
                    this.chartjs.annotations = [];
                    const breakPoints: number[] = [];
                    const detailLevel = this.detailLevel(this.groupTime);
                    let d = new Date(this.chartjs.minDateMs || 0);
                    switch (detailLevel) {
                        case DetailLevel.ms:
                            d.setMilliseconds(0);
                            while (d.valueOf() < (this.chartjs.maxDateMs || 0)) {
                                d.setSeconds(d.getSeconds() + 1);
                                breakPoints.push(d.valueOf());
                            }
                            break;
                        case DetailLevel.s:
                            d.setSeconds(0, 0);
                            while (d.valueOf() < (this.chartjs.maxDateMs || 0)) {
                                d.setMinutes(d.getMinutes() + 1);
                                breakPoints.push(d.valueOf());
                            }
                            break;
                        case DetailLevel.m:
                            d.setMinutes(0, 0, 0);
                            while (d.valueOf() < (this.chartjs.maxDateMs || 0)) {
                                d.setHours(d.getHours() + 1);
                                breakPoints.push(d.valueOf());
                            }
                            break;
                        case DetailLevel.h:
                            d.setHours(0, 0, 0, 0);
                            while (d.valueOf() < (this.chartjs.maxDateMs || 0)) {
                                d.setDate(d.getDate() + 1);
                                breakPoints.push(d.valueOf());
                            }
                            break;
                        case DetailLevel.d:
                            d.setHours(0, 0, 0, 0);
                            d.setDate(1);
                            while (d.valueOf() < (this.chartjs.maxDateMs || 0)) {
                                d.setMonth(d.getMonth() + 1);
                                breakPoints.push(d.valueOf());
                            }
                            break;
                        case DetailLevel.months:
                            d.setHours(0, 0, 0, 0);
                            d.setDate(1);
                            d.setMonth(0);
                            while (d.valueOf() < (this.chartjs.maxDateMs || 0)) {
                                d.setFullYear(d.getFullYear() + 1);
                                breakPoints.push(d.valueOf());
                            }
                            break;
                    }
                    if (detailLevel === DetailLevel.y) {
                        d = new Date(this.chartjs.maxDateMs || 0);
                        d.setHours(0, 0, 0, 0);
                        d.setDate(1);
                        d.setMonth(0);
                        d.setFullYear(d.getFullYear() + 1);
                        this.chartjs.nextDateMs = d.valueOf();
                    } else if (breakPoints.length > 0) {
                        this.chartjs.nextDateMs = breakPoints[breakPoints.length - 1];
                    }
                    if (breakPoints.length > 1) {
                        breakPoints.forEach((v, i) => {
                            const xMin = i > 0 ? breakPoints[i - 1] : this.chartjs.minDateMs || 0;
                            this.chartjs.annotations?.push({
                                type: 'box',
                                xMax: v,
                                xMin,
                                backgroundColor: i % 2 == 0 ? 'rgba(0,0,0,0.0)' : 'rgba(0,0,0,0.05)',
                                borderWidth: 0,
                                label: {
                                    content: this.datePipe.transform(new Date(i > 0 ? breakPoints[i - 1] : (this.chartjs.minDateMs || 0)), this.xAxisFormat(detailLevel - 1)),
                                    display: true,
                                    position: {
                                        x: v < (this.chartjs.maxDateMs || 0) ? 'center' : `${((this.chartjs.maxDateMs || 0) - xMin) / (v - xMin) * 50}%`,
                                        // displays last label (almost) centered on remaining x axis space
                                        y: 'start'
                                    }
                                },
                            });
                            this.chartjs.annotations?.push(
                                {
                                    type: 'line',
                                    borderColor: 'rgba(0,0,0,0.5)',
                                    borderWidth: 1,
                                    scaleID: 'x',
                                    value: v,
                                }
                            );
                        });
                    }
                    this.resizeChart();
                    this.onResize();
                    this.cd.detectChanges();
                }
                this.ready = true;
                this.refreshing = false;
                this.cd.detectChanges();
            });
        } else {
            this.ready = true;
            this.refreshing = false;
        }

    }

    setupZoomChartSettings(lastOverride?: string) {
        if (this.zoom && this.chartExportData.chartType === 'LineChart' && this.chartExportData.options !== undefined) {
            this.chartExportData.chartType = 'AnnotationChart';
            this.chartExportData.options.dateFormat = 'dd.MM.yyyy HH:mm:ss';
            this.chartExportData.options.displayExactValues = true;
            this.chartExportData.options.thickness = 2;
            this.chartExportData.options.displayZoomButtons = false;
            this.chartExportData.options.displayAnnotations = false;
            this.chartExportData.options.displayLegendValues = true;
            if (lastOverride !== undefined && !this.ready) {
                const start = (this.chartExportData.dataTable[1][0] as Date).valueOf();
                const end = (this.chartExportData.dataTable[this.chartExportData.dataTable.length - 1][0] as Date).valueOf();
                const range = end - start;
                this.chartExportData.options.zoomStartTime = new Date(end - (range / (this.widget.properties.zoomTimeFactor || 2)));
            }
        }
    }

    zoomOutTime() {
        const rgxRes = this.timeRgx.exec(this.groupTime || '');
        if (rgxRes === null) {
            return;
        }
        this.ready = false;
        if (this.from === null) {
            this.from = this.chartExportData.dataTable[1][0] as Date;
        }
        let timeUnit = rgxRes[2];
        switch (timeUnit) {
            case 'y':
                return;
            case 'months':
                timeUnit = 'y';
                this.hAxisFormat = this.xAxisFormat(DetailLevel.y);
                this.from = new Date(0);
                this.to = new Date('2999-01-01T00:00:00Z');
                break;
            case 'w':
            case 'd':
                timeUnit = 'months';
                this.hAxisFormat = this.xAxisFormat(DetailLevel.months);
                this.from = new Date(this.from.setMonth(0, 0));
                this.from = new Date(this.from.setHours(0, 0, 0, 0));
                this.to = new Date(this.from.setFullYear(this.from.getFullYear() + 1));
                break;
            case 'h':
                timeUnit = 'd';
                this.hAxisFormat = this.xAxisFormat(DetailLevel.d);
                this.from = new Date(this.from.setDate(0));
                this.from = new Date(this.from.setHours(0, 0, 0, 0));
                this.to = new Date(this.from.setMonth(this.from.getMonth() + 1));
                break;
            case 'm':
                timeUnit = 'h';
                this.hAxisFormat = this.xAxisFormat(DetailLevel.h);
                this.from = new Date(this.from.setHours(0, 0, 0, 0));
                this.to = new Date(this.from.setDate(this.from.getDate() + 1));
                break;
            case 's':
                timeUnit = 'm';
                this.hAxisFormat = this.xAxisFormat(DetailLevel.m);
                this.from = new Date(this.from.setMinutes(0, 0, 0));
                this.to = new Date(this.from.setHours(this.from.getHours() + 1));
                break;
            case 'ms':
                timeUnit = 's';
                this.hAxisFormat = this.xAxisFormat(DetailLevel.ms);
                this.from = new Date(this.from.setSeconds(0, 0));
                this.to = new Date(this.from.setMinutes(this.from.getMinutes() + 1));
        }

        this.groupTime = '1' + timeUnit;

        this.refresh();
    }

    zoomOutEnabled(): boolean {
        const timeRgx = /(\d+)(ms|s|months|m|h|d|w|y)/;
        const rgxRes = timeRgx.exec(this.groupTime || '');

        return this.widget.properties.chartType === 'ColumnChart' && this.widget.properties.group?.type !== undefined
            && this.widget.properties.group?.type !== '' && rgxRes?.length === 3 && Number(rgxRes[1]) === 1 && rgxRes[2] !== 'y' && this.widget.properties.time?.last !== null && this.widget.properties.time?.last !== '';
    }

    drillable(axisIndex: number): boolean {
        const axes = this.modifiedVaxes || this.widget.properties.vAxes;
        if (axes === undefined || axes.length < axisIndex) {
            return false;
        }

        const axis = axes[axisIndex];
        if (axis.subAxes !== undefined && axis.subAxes.length > 0) {
            return true;
        } else if (axis.deviceGroupMergingStrategy === ChartsExportDeviceGroupMergingStrategy.Sum && (axis.deviceGroupId !== undefined || axis.locationId !== undefined)) {
            return true;
        }
        return false;
    }

    drillDown(axisIndex: number) {
        const axes = this.modifiedVaxes || this.widget.properties.vAxes;
        if (axes === undefined || axes.length < axisIndex) {
            return;
        }
        const axis = axes[axisIndex];
        let newAxes: ChartsExportVAxesModel[] = [];
        if (axis.subAxes !== undefined && axis.subAxes.length > 0) {
            const cpy = JSON.parse(JSON.stringify(axis.subAxes)) as ChartsExportVAxesModel[];
            cpy.forEach(sub => sub.displayOnSecondVAxis = axis.displayOnSecondVAxis);
            newAxes = cpy;

        } else if (axis.deviceGroupMergingStrategy === ChartsExportDeviceGroupMergingStrategy.Sum && (axis.deviceGroupId !== undefined || axis.locationId !== undefined)) {
            // we can split this!
            this.chooseColors = true;
            const cpy = JSON.parse(JSON.stringify(axis)) as ChartsExportVAxesModel;
            cpy.deviceGroupMergingStrategy = ChartsExportDeviceGroupMergingStrategy.Separate;
            cpy.valueAlias = '';
            cpy.valueName = '';
            newAxes = [cpy];
        } else {
            return;
        }
        this.modifiedVaxes = newAxes;
        this.drillStackPush(axes, this.stacked);
        this.stacked = true;
        this.ready = false;
        this.chartjs.tooltipDisplay = 'none';
        this.cd.detectChanges();
        this.refresh();
    }

    drillUp() {
        const newAxes = this.drillStackPop();
        if (this.drillStackPeek() !== null) {
            this.modifiedVaxes = newAxes?.axes || null;
        } else {
            this.chooseColors = null;
            this.modifiedVaxes = null;
        }
        this.ready = false;
        this.chartjs.tooltipDisplay = 'none';
        this.stacked = newAxes?.stacked || null;
        this.cd.detectChanges();
        this.refresh();
    }

    closeChartjsTooltip() {
        this.chartjs.tooltipDisplay = 'none';
        this.cd.detectChanges();
    }

    forbidChartjsTooltip() {
        this.chartjs.tooltipAllowed = false;
        this.closeChartjsTooltip();
    }
    allowChartjsTooltip() {
        this.chartjs.tooltipAllowed = true;
    }

    resetChartjsZoom($event: MouseEvent) {
        const chart = this.chartjsChart;
        if (chart !== undefined) {
            $event.stopPropagation();
            chart.resetZoom();
        }
    }

    get chartjsTooltipStyle(): any {
        const o: any = {
            'top.px': (this.chartjs.tooltipContext?.chart.canvas?.offsetTop || 0) + (this.chartjs.tooltipContext?.tooltip.caretY || 0),
            'display': this.chartjs.tooltipDisplay,
        };
        if (this.chartjs.tooltipDatasets.find(x => x.drawToLeft) !== undefined) {
            o['right.px'] = (this.chartjs.tooltipContext?.chart.width || 0) - ((this.chartjs.tooltipContext?.chart.canvas?.offsetLeft || 0) + (this.chartjs.tooltipContext?.tooltip.caretX || 0));
        } else {
            o['left.px'] = (this.chartjs.tooltipContext?.chart.canvas?.offsetLeft || 0) + (this.chartjs.tooltipContext?.tooltip.caretX || 0);
        }
        return o;
    }

    private get groupTime(): string | null {
        return localStorage.getItem(this.widget.id + '_groupTime') || this.widget.properties.group?.time || null;
    }

    private set groupTime(groupTime: string | null) {
        if (groupTime === null) {
            localStorage.removeItem(this.widget.id + '_groupTime');
        } else {
            localStorage.setItem(this.widget.id + '_groupTime', groupTime);
        }
    }

    private get hAxisFormat(): string | undefined {
        return localStorage.getItem(this.widget.id + '_hAxisFormat') || this.widget.properties.hAxisFormat;
    }

    private set hAxisFormat(hAxisFormat: string | null) {
        if (hAxisFormat === null) {
            localStorage.removeItem(this.widget.id + '_hAxisFormat');
        } else {
            localStorage.setItem(this.widget.id + '_hAxisFormat', hAxisFormat);
        }
    }

    private get from(): Date | null {
        const str = localStorage.getItem(this.widget.id + '_from');
        if (str === null) {
            return null;
        }
        return new Date(str);
    }

    private set from(from: Date | null) {
        if (from === null) {
            localStorage.removeItem(this.widget.id + '_from');
        } else {
            localStorage.setItem(this.widget.id + '_from', from.toISOString());
        }
    }

    private get to(): Date | null {
        const str = localStorage.getItem(this.widget.id + '_to');
        if (str === null) {
            return null;
        }
        return new Date(str);
    }

    private set to(to: Date | null) {
        if (to === null) {
            localStorage.removeItem(this.widget.id + '_to');
        } else {
            localStorage.setItem(this.widget.id + '_to', to.toISOString());
        }
    }

    private get modifiedVaxes(): ChartsExportVAxesModel[] | null {
        const str = localStorage.getItem(this.widget.id + '_modifiedvAxes');
        if (str === null) {
            return null;
        }
        return JSON.parse(str);
    }

    private set modifiedVaxes(axes: ChartsExportVAxesModel[] | null) {
        if (axes === null) {
            localStorage.removeItem(this.widget.id + '_modifiedvAxes');
        } else {
            localStorage.setItem(this.widget.id + '_modifiedvAxes', JSON.stringify(axes));
        }
    }

    private get stacked(): boolean {
        const str = localStorage.getItem(this.widget.id + '_stacked');
        if (str === null) {
            return this.widget.properties.stacked || false;
        }
        return JSON.parse(str);
    }

    private set stacked(stacked: boolean | null) {
        if (stacked === null) {
            localStorage.removeItem(this.widget.id + '_stacked');
        } else {
            localStorage.setItem(this.widget.id + '_stacked', '' + stacked);
        }
    }

    private get chooseColors(): boolean {
        const str = localStorage.getItem(this.widget.id + '_chooseColors');
        if (str === null) {
            return false;
        }
        return JSON.parse(str);
    }

    private set chooseColors(chooseColors: boolean | null) {
        if (chooseColors === null) {
            localStorage.removeItem(this.widget.id + '_chooseColors');
        } else {
            localStorage.setItem(this.widget.id + '_chooseColors', '' + chooseColors);
        }
    }

    getCustomIcons(header: boolean): { icons: string[]; disabled: boolean[]; tooltips: string[] } {
        const res = { icons: [] as string[], disabled: [] as boolean[], tooltips: [] as string[] };

        if (this.zoomOutEnabled() && ((this.zoom && header) || (!this.zoom && !header))) {
            res.icons.push('zoom_out');
            res.disabled.push(!this.ready);
            res.tooltips.push('Zoom Out');
        }
        if (this.drillStackPeek() !== null && !header) {
            res.icons.push('arrow_upward');
            res.disabled.push(!this.ready);
            res.tooltips.push('Drill Up');
        }
        if ((this.zoom && header) || (!this.zoom && !header)) {
            for (let i = 0; i < localStorage.length; i++) {
                if (localStorage.key(i)?.startsWith(this.widget.id)) {
                    res.icons.push('undo');
                    res.disabled.push(!this.ready);
                    res.tooltips.push('Reset');
                    break;
                }
            }
        }
        return res;
    }

    customEvent($event: { index: number; icon: string }) {
        switch ($event.icon) {
            case 'zoom_out':
                this.zoomOutTime();
                return;
            case 'undo':
                this.ready = false;
                this.chartsService.cleanup(this.widget);
                setTimeout(() => this.refresh(), 1000);
                return;
            case 'arrow_upward':
                this.drillUp();
                return;
        }
    }

    getChartData = () => {
        if (this.widget.properties.chartType === 'ColumnChart') {
            return this.chartjs;
        }
        if (this.timelineChartData != null) {
            return this.timelineChartData;
        } else {
            return this.chartExportData;
        }
    };

    private detailLevel(groupTime: string | null): DetailLevel {
        const rgxRes = this.timeRgx.exec(groupTime || '');
        if (rgxRes === null || rgxRes.length < 3) {
            return DetailLevel.unknown;
        }
        switch (rgxRes[2]) {
            case 'ms': return DetailLevel.ms;
            case 's': return DetailLevel.s;
            case 'm': return DetailLevel.m;
            case 'h': return DetailLevel.h;
            case 'd': return DetailLevel.d;
            case 'months': return DetailLevel.months;
            case 'y': return DetailLevel.y;
            default: return DetailLevel.unknown;
        }
    }

    private groupTimeFromDetailLevel(detailLevel: DetailLevel): string {
        switch (detailLevel) {
            case DetailLevel.ms: return '1ms';
            case DetailLevel.s: return '1s';
            case DetailLevel.m: return '1m';
            case DetailLevel.h: return '1h';
            case DetailLevel.d: return '1d';
            case DetailLevel.months: return '1months';
            case DetailLevel.y: return '1y';
            default: return '';
        }
    }

    private xAxisFormat(detailLevel: DetailLevel): string {
        switch (detailLevel) {
            case DetailLevel.ms:
                return 'ss';
            case DetailLevel.s:
                return 'ss';
            case DetailLevel.m:
                return 'mm';
            case DetailLevel.h:
                return 'HH';
            case DetailLevel.d:
                return 'dd.MM.';
            case DetailLevel.months:
                return 'MMM';
            case DetailLevel.y:
                return 'yyyy';
            default:
                return '';
        }
    }

    private drillStackPush(axes: ChartsExportVAxesModel[], stacked: boolean): void {
        const stack = JSON.parse(localStorage.getItem(this.widget.id + '_drillStack') || '[]') as { axes: ChartsExportVAxesModel[], stacked: boolean }[];
        stack.push({ axes, stacked });
        localStorage.setItem(this.widget.id + '_drillStack', JSON.stringify(stack));
    }

    private drillStackPop(): ({ axes: ChartsExportVAxesModel[], stacked: boolean } | null) {
        const stack = JSON.parse(localStorage.getItem(this.widget.id + '_drillStack') || '[]') as { axes: ChartsExportVAxesModel[], stacked: boolean }[];
        if (stack.length === 0) {
            return null;
        }
        const res = stack.pop();
        if (stack.length === 0) {
            localStorage.removeItem(this.widget.id + '_drillStack');
        } else {
            localStorage.setItem(this.widget.id + '_drillStack', JSON.stringify(stack));
        }
        return res || null;
    }

    private drillStackPeek(): ({ axes: ChartsExportVAxesModel[], stacked: boolean } | null) {
        const stack = JSON.parse(localStorage.getItem(this.widget.id + '_drillStack') || '[]') as { axes: ChartsExportVAxesModel[], stacked: boolean }[];
        if (stack.length === 0) {
            return null;
        }
        return stack[stack.length - 1];
    }
}
