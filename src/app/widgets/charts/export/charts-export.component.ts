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

import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ChangeDetectionStrategy, NgZone, inject } from '@angular/core';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ElementSizeService } from '../../../core/services/element-size.service';
import { ChartsExportChart } from './shared/charts-export-table';
import { ChartsExportService } from './shared/charts-export.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { Subscription } from 'rxjs';
import { ErrorModel } from '../../../core/model/error.model';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { removeWidgetStorage } from '../shared/widget-storage';
import { googleFrame, googlePlugins } from '../../../core/charts/google-chartjs';
import { googlePiePlugin } from '../../../core/charts/google-pie';
import { FramedChartConfig } from '../../../core/charts/google-columns';
import { GoogleSeries } from '../../../core/charts/google-lines';
import { chartsExportLineConfig, chartsExportPieConfig, chartsExportSeries } from './charts-export-line-chartjs';
import { ChartsExportDeviceGroupMergingStrategy, ChartsExportVAxesModel } from './shared/charts-export-properties.model';
import { BubbleDataPoint, Chart, ChartConfiguration, ChartData, ChartTypeRegistry, Point, TooltipModel, Plugin, LegendElement, LegendItem, ChartEvent } from 'chart.js';
import { DatePipe, NgStyle } from '@angular/common';
import { AnnotationOptions } from 'chartjs-plugin-annotation';
import {
    columnDatasets,
    columnDateFormat,
    DetailLevel,
    detailLevel,
    gapAnnotations,
    groupTimeFromDetailLevel,
    chartDateLabel,
    chartDateLocale,
    periodAnnotations,
    withOpacityPercent,
    xAxisFormat,
    zoomOutRange,
    zoomStartTime,
} from './charts-export-chartjs';
import { AnyObject } from 'node_modules/chart.js/dist/types/basic';
import { findLabel, getLabelHitBoxes } from './chartjs-axis-click';
import { bucketTimes } from './chartjs-bucket-gaps';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WidgetHeaderComponent } from '../../components/widget-header/widget-header.component';
import { TimelineComponent } from '../shared/chart-types/timeline/timeline.component';
import { WidgetSpinnerComponent } from '../../components/widget-spinner/widget-spinner.component';
import { BaseChartDirective } from 'ng2-charts';
import { AnnotationChartComponent } from './annotation-chart/annotation-chart.component';
import { WidgetNoDataComponent } from '../../../core/components/widget-no-data/widget-no-data.component';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { WidgetFooterComponent } from '../../components/widget-footer/widget-footer.component';

@Component({
    selector: 'senergy-charts-export',
    templateUrl: './charts-export.component.html',
    styleUrls: ['./charts-export.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, TimelineComponent, WidgetSpinnerComponent, BaseChartDirective, AnnotationChartComponent, WidgetNoDataComponent, NgStyle, MatIconButton, MatIcon, MatTooltip, WidgetFooterComponent]
})
export class ChartsExportComponent implements OnInit, OnDestroy, AfterViewInit {
    private chartsExportService = inject(ChartsExportService);
    private elementSizeService = inject(ElementSizeService);
    private dashboardService = inject(DashboardService);
    private errorHandlerService = inject(ErrorHandlerService);
    private datePipe = inject(DatePipe);
    private cd = inject(ChangeDetectorRef);
    private el = inject(ElementRef);
    private zone = inject(NgZone);

    chartExportData = {} as ChartsExportChart;
    /** Line, Scatter and Pie in the widget */
    framedChart?: { kind: 'line'; config: FramedChartConfig<'line'> } | { kind: 'pie'; config: FramedChartConfig<'pie'> };
    /** the zoomed line chart */
    annotation?: { series: GoogleSeries[]; width: number; height: number; zoomStart?: number };
    readonly linePlugins = googlePlugins;
    readonly piePlugins = [...googlePlugins, googlePiePlugin];
    private annotationZoomStart?: number;
    timelineChartData: any;
    timelineWidth = 0;
    timelineHeight = 0;
    ready = false;
    refreshing = false;
    disableBreaking = false;
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
        datasetColors: string[];
    } = {
            options: {},
            data: undefined,
            tooltipContext: undefined,
            tooltipAllowed: false,
            tooltipDisplay: 'none',
            tooltipDatasets: [],
            datasetColors: [],
            plugins: [{
                id: 'chartClickXLabel',
                events: ['click'],
                afterEvent: (chart, event) => {
                    const evt = event.event;
                    const [found, labelInfo] = findLabel(getLabelHitBoxes(chart.scales.x), evt);
                    const currentDetailLevel = this.detailLevel(this.groupTime);
                    switch (evt.type) {
                        case 'click': // zoom in
                            if (labelInfo !== null && currentDetailLevel < DetailLevel.ms) {
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
                            const style = (chart.canvas?.parentNode as any)?.style;
                            if (style === null) {
                                return;
                            }
                            if (found) {
                                if (style !== null) {
                                    style.cursor = 'zoom-in';
                                }
                            } else if (this.chartjs.cursorLocked !== true) {
                                if (style !== null) {
                                    style.cursor = 'default';
                                }
                            }
                            return;
                    }
                },
            }],
            cursorLocked: false,
        };

    private resizeTimeout: any;
    private resizeObserver?: ResizeObserver;
    private timeRgx = /(\d+)(ms|s|months|m|h|d|w|y)/;
    private hoveredDatasetIndex: number | null = null;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    @Input() initialWidgetData: any;

    ngOnDestroy() {
        this.destroy.unsubscribe();
        this.resizeObserver?.disconnect();
        clearTimeout(this.resizeTimeout);
    }

    ngOnInit(): void {
        this.scheduleRefresh();
    }

    ngAfterViewInit(): void {
        // use this hook, to get the resize sizes from the correct widget
        this.setupInitialChartData();
        this.resizeObserver = new ResizeObserver((_ => {
            // debouncing redraws due to many resize calls
            clearTimeout(this.resizeTimeout);
            // zone.js does not patch ResizeObserver, so the redraw re-enters the zone to be change detected
            this.resizeTimeout = setTimeout(() => this.zone.run(() => this.resizeChart()), 30);
        }));
        this.resizeObserver.observe(this.el.nativeElement);
    }

    setupInitialChartData() {
        if (this.initialWidgetData != null) {
            if (this.widget.properties.chartType === 'Timeline') {
                this.timelineChartData = this.initialWidgetData;
                this.resizeTimeline();
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
                return;
            }
        } else {
            this.configureWidget = true;
            return;
        }

        if (this.widget.properties.time === undefined) {
            this.configureWidget = true;
            return;
        }
        this.configureWidget = false;
    }

    doubleClickTimeout: any;
    private onLegendClick() {
        const that = this;
        return (e: ChartEvent, legendItem: LegendItem, legend: LegendElement<any>) => {
            if (that.doubleClickTimeout === undefined) {
                that.doubleClickTimeout = setTimeout(() => {
                    that.doubleClickTimeout = undefined;
                    const defaultOnClick = Chart.defaults.plugins.legend.onClick;
                    if (defaultOnClick !== undefined) {
                        defaultOnClick.call(legend, e, legendItem, legend);
                    }
                }, 150) as unknown as number;
            } else {
                clearTimeout(that.doubleClickTimeout);
                that.doubleClickTimeout = undefined;
                that.chartjs.data?.datasets.forEach((_, i) => {
                    legend.chart.getDatasetMeta(i).hidden = legendItem.datasetIndex !== i;
                });
                legend.chart.update();
            }
        };
    }

    private resizeChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 5, 10);
        this.drawFramedChart(element);

        this.timelineHeight = element.height;
        this.timelineWidth = element.width;

        if (this.widget.properties.chartType === 'ColumnChart') {
            const dateFormat = columnDateFormat(this.hAxisFormat, this.groupTime);
            this.chartjs.options = {
                animation: false,
                maintainAspectRatio: false,
                events: ['click', 'mousemove'],
                datasets: {
                    // a bucket measured as 0 has no bar to draw, so give it a stub on the baseline
                    // instead of letting it look like a bucket that has no value at all
                    bar: { minBarLength: 2 },
                },
                onHover: (_, elements, chart) => {
                    const hoveredIndex = elements !== undefined && elements.length > 0 ? elements[0].datasetIndex : null;
                    this.updateDatasetHoverStyle(hoveredIndex, chart);
                    const style = (chart.canvas?.parentNode as any)?.style;
                    if (style === null) {
                        return;
                    }
                    if (elements !== undefined && elements.length === 1 && this.drillable(elements[0].datasetIndex)) {
                        style.cursor = 'pointer';
                        this.chartjs.cursorLocked = true;
                    } else {
                        style.cursor = 'default';
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
                        onClick: this.onLegendClick(),
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
                                context.tooltip.title = [chartDateLabel((context.tooltip.dataPoints[0].raw as { x: number }).x, dateFormat)];
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
                        adapters: { date: { locale: chartDateLocale } },
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

    /** Line, Scatter and Pie as Google drew them, a zoomed line chart as its AnnotationChart; nothing without data. */
    private drawFramedChart(element: { width: number; height: number; widthPercentage: string; heightPercentage: string }) {
        const chart = this.chartExportData;
        const type = chart.chartType;
        const hasData = chart.dataTable !== undefined && chart.dataTable.length > 0 && chart.dataTable[0].length > 0;
        this.framedChart = undefined;
        this.annotation = undefined;
        if (!hasData || (type !== 'LineChart' && type !== 'ScatterChart' && type !== 'PieChart')) {
            return;
        }
        if (this.zoom && type === 'LineChart') {
            this.annotation = { series: chartsExportSeries(chart), width: element.width, height: element.height, zoomStart: this.annotationZoomStart };
            return;
        }
        const frame = googleFrame(element.width, element.height, element.widthPercentage, element.heightPercentage);
        this.framedChart = type === 'PieChart'
            ? { kind: 'pie', config: chartsExportPieConfig(chart, frame) }
            : { kind: 'line', config: chartsExportLineConfig(chart, frame) };
    }

    /** Google's explorer reset the zoom on a right click. */
    resetGoogleZoom(event: MouseEvent, canvas: HTMLCanvasElement) {
        event.preventDefault();
        Chart.getChart(canvas)?.resetZoom();
    }

    get chartjsChart(): Chart | undefined {
        return Chart.getChart('chartjs-' + this.widget.id);
    }

    private resizeTimeline() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 5, 10);
        this.timelineWidth = element.width;
        this.timelineHeight = element.height;
    }

    getTimelineData(lastOverride?: string) {
        this.resizeTimeline();

        this.chartsExportService.getData(this.widget.properties, this.from?.toISOString(), this.to?.toISOString(), this.groupTime || undefined, lastOverride).subscribe({
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
                this.getTimelineData(lastOverride);
                return;
            }

            const widget = JSON.parse(JSON.stringify(this.widget)) as WidgetModel;

            if (this.modifiedVaxes !== null) {
                widget.properties.vAxes = this.modifiedVaxes;
            }

            widget.properties.stacked = this.stacked;

            const chooseColors = this.chooseColors || (widget.properties.vAxes?.length === 1 && (widget.properties.vAxes[0].deviceGroupMergingStrategy === ChartsExportDeviceGroupMergingStrategy.Separate || widget.properties.vAxes[0].deviceGroupMergingStrategy === undefined) && (widget.properties.vAxes[0].deviceGroupId !== undefined || widget.properties.vAxes[0].locationId !== undefined));

            this.chartsExportService.getChartData(widget, this.from?.toISOString(), this.to?.toISOString(), this.groupTime || undefined, this.hAxisFormat || undefined, lastOverride, chooseColors, this.disableBreaking).subscribe((resp: ChartsExportChart | ErrorModel) => {
                if (this.errorHandlerService.checkIfErrorExists(resp)) {
                    this.errorHasOccured = true;
                    this.errorMessage = 'No data';
                    this.errorHandlerService.logError('Chart Export', 'getChartData', resp);
                } else {
                    this.errorHasOccured = false;
                    this.chartExportData = resp;
                    if (resp.chartType !== 'PieChart' && resp.dataTable.length > 1) {
                        // rows by time, the header stays first
                        const [header, ...rows] = resp.dataTable;
                        rows.sort((a, b) => (a[0] as Date).valueOf() - (b[0] as Date).valueOf());
                        this.chartExportData.dataTable = [header, ...rows];
                    }

                    this.setupZoomChartSettings(lastOverride);
                    this.resizeChart();
                    this.cd.detectChanges();
                }
                this.size = (this.chartExportData?.dataTable?.length || 0) * ((this.chartExportData?.dataTable?.[0]?.length || 0) - 1);
                if (this.size > this.sizeLimit) {
                    console.warn('Chart Widget ' + this.widget.name + ' uses ' + this.size + ' points which is above the recommended limit of ' + this.sizeLimit);
                }
                if (this.widget.properties.chartType === 'ColumnChart') {
                    if (this.chartExportData?.dataTable.length < 2) {
                        this.chartjs.data = undefined;
                        this.chartjs.datasetColors = [];
                        this.hoveredDatasetIndex = null;
                        this.ready = true;
                        this.refreshing = false;
                        return;
                    }
                    this.hoveredDatasetIndex = null;
                    const columns = columnDatasets(this.chartExportData.dataTable, this.chartExportData.colors.length > 0 ? this.chartExportData.colors : undefined, this.modifiedVaxes || this.widget.properties.vAxes,
                        () => window.getComputedStyle(document.getElementsByClassName('color-lookup-accent')[0], null).getPropertyValue('color'));
                    const datasets = columns.datasets;
                    this.chartjs.datasetColors = columns.datasetColors;
                    if (columns.minDateMs !== undefined) {
                        this.chartjs.minDateMs = columns.minDateMs;
                    }
                    if (columns.maxDateMs !== undefined) {
                        this.chartjs.maxDateMs = columns.maxDateMs;
                    }
                    this.chartjs.data = {
                        datasets,
                    };
                    const periods = periodAnnotations(this.chartjs.minDateMs, this.chartjs.maxDateMs, this.detailLevel(this.groupTime),
                        (date, format) => this.datePipe.transform(date, format));
                    this.chartjs.annotations = periods.annotations;
                    if (periods.nextDateMs !== undefined) {
                        this.chartjs.nextDateMs = periods.nextDateMs;
                    }
                    // pushed last so the markers stay on top of the grid shading
                    gapAnnotations(bucketTimes(this.chartExportData.dataTable), this.groupTime,
                        () => window.getComputedStyle(document.getElementsByClassName('color-lookup-warn')[0], null).getPropertyValue('color'),
                        Chart.defaults.color as string).forEach(a => this.chartjs.annotations?.push(a));
                    this.resizeChart();
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

    /** The zoomed line chart starts showing the last 1/zoomTimeFactor of the range fetched with lastOverride. */
    setupZoomChartSettings(lastOverride?: string) {
        this.annotationZoomStart = undefined;
        if (this.zoom && this.chartExportData.chartType === 'LineChart' && lastOverride !== undefined && !this.ready && this.chartExportData.dataTable?.length > 1) {
            this.annotationZoomStart = zoomStartTime(this.chartExportData.dataTable, this.widget.properties.zoomTimeFactor).getTime();
        }
    }

    zoomOutTime() {
        const from = this.from === null ? this.chartExportData.dataTable[1][0] as Date : this.from;
        const range = zoomOutRange(this.groupTime, from);
        if (range === undefined) {
            return;
        }
        this.ready = false;
        this.hAxisFormat = range.hAxisFormat;
        this.from = range.from;
        this.to = range.to;
        this.groupTime = range.groupTime;
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
        if (axis === undefined) {
            return false;
        }
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
        this.disableBreaking = true;
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
            this.disableBreaking = false;
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
        if (this.drillStackPeek() !== null && ((this.zoom && header) || (!this.zoom && !header))) {
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
                removeWidgetStorage(this.widget);
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
        return detailLevel(groupTime);
    }

    private groupTimeFromDetailLevel(level: DetailLevel): string {
        return groupTimeFromDetailLevel(level);
    }

    private xAxisFormat(level: DetailLevel): string {
        return xAxisFormat(level);
    }

    private updateDatasetHoverStyle(hoveredIndex: number | null, chart: Chart): void {
        if (this.hoveredDatasetIndex === hoveredIndex) {
            return;
        }

        const datasets = this.chartjs.data?.datasets;
        if (datasets === undefined) {
            return;
        }

        this.hoveredDatasetIndex = hoveredIndex;
        datasets.forEach((dataset, i) => {
            if (hoveredIndex === null || hoveredIndex === i) {
                dataset.backgroundColor = this.chartjs.datasetColors[i];
            } else {
                dataset.backgroundColor = withOpacityPercent(this.chartjs.datasetColors[i], 25);
            }
        });
        chart.update();
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
