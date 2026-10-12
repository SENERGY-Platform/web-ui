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

import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ChangeDetectionStrategy, inject, DestroyRef, computed, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ElementSizeService } from '../../../core/services/element-size.service';
import { ChartsExportChart } from './shared/charts-export-table';
import { ChartsExportService } from './shared/charts-export.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ErrorModel } from '../../../core/model/error.model';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { buildColumnChartOptions } from './charts-export-column-options';
import { ChartsExportDrillEntry, ChartsExportViewState } from './charts-export-view-state';
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
    finerDetailLevel,
    gapAnnotations,
    groupTimeFromDetailLevel,
    periodAnnotations,
    withOpacityPercent,
    xAxisFormat,
    zoomOutRange,
    zoomStartTime,
} from './charts-export-chartjs';
import { AnyObject } from 'node_modules/chart.js/dist/types/basic';
import { findLabel, getLabelHitBoxes } from './chartjs-axis-click';
import { bucketTimes, clickedBucket } from './chartjs-bucket-gaps';
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

/** The chart.js state of the column chart; the fields the template reads are signals behind these accessors. */
interface ChartsExportChartjsState {
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
    /** vAxis index per dataset; a dataset index is not an axis index once axes yield zero or several columns. */
    datasetAxes: number[];
}

@Component({
    selector: 'senergy-charts-export',
    templateUrl: './charts-export.component.html',
    styleUrls: ['./charts-export.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, TimelineComponent, WidgetSpinnerComponent, BaseChartDirective, AnnotationChartComponent, WidgetNoDataComponent, NgStyle, MatIconButton, MatIcon, MatTooltip, WidgetFooterComponent]
})
export class ChartsExportComponent implements OnInit, OnDestroy, AfterViewInit {
    private chartsExportService = inject(ChartsExportService);
    private elementSizeService = inject(ElementSizeService);
    private dashboardService = inject(DashboardService);
    private errorHandlerService = inject(ErrorHandlerService);
    private datePipe = inject(DatePipe);
    private el = inject(ElementRef);
    private destroyRef = inject(DestroyRef);
    private viewState = new ChartsExportViewState(() => this.widget());
    /** The stored view state is not reactive: every write bumps this and every read tracks it. */
    private readonly viewRevision = signal(0);

    readonly chartExportData = signal<ChartsExportChart>({} as ChartsExportChart);
    /** Line, Scatter and Pie in the widget */
    readonly framedChart = signal<{ kind: 'line'; config: FramedChartConfig<'line'> } | { kind: 'pie'; config: FramedChartConfig<'pie'> } | undefined>(undefined);
    /** the zoomed line chart */
    readonly annotation = signal<{ series: GoogleSeries[]; width: number; height: number; zoomStart?: number } | undefined>(undefined);
    readonly linePlugins = googlePlugins;
    readonly piePlugins = [...googlePlugins, googlePiePlugin];
    private annotationZoomStart?: number;
    readonly timelineChartData = signal<any>(undefined);
    readonly timelineWidth = signal(0);
    readonly timelineHeight = signal(0);
    readonly ready = signal(false);
    readonly refreshing = signal(false);
    readonly configureWidget = signal(false);
    readonly errorHasOccured = signal(false);
    readonly errorMessage = signal('');
    sizeLimit = 10000;
    size = 0;

    private readonly chartData = signal<ChartsExportChartjsState['data']>(undefined);
    private readonly chartOptions = signal<ChartsExportChartjsState['options']>({});
    // chart.js reuses and mutates the tooltip model, so every event counts as a change
    private readonly tooltipContext = signal<ChartsExportChartjsState['tooltipContext']>(undefined, { equal: () => false });
    private readonly tooltipDisplay = signal('none');
    private readonly tooltipAllowed = signal(false);
    private readonly tooltipDatasets = signal<ChartsExportChartjsState['tooltipDatasets']>([]);
    readonly chartjs: ChartsExportChartjsState = this.createChartjsState();

    /** The icons only change with the ready flag, the widget, the zoom flag or the stored view state. */
    readonly headerIcons = computed(() => this.getCustomIcons(true));
    readonly footerIcons = computed(() => this.getCustomIcons(false));

    private resizeTimeout: any;
    private resizeObserver?: ResizeObserver;
    private timeRgx = /(\d+)(ms|s|months|m|h|d|w|y)/;
    private hoveredDatasetIndex: number | null = null;

    readonly dashboardId = input('');
    readonly widget = input<WidgetModel>({} as WidgetModel);
    readonly zoom = input(false);
    readonly userHasDeleteAuthorization = input(false);
    readonly userHasUpdatePropertiesAuthorization = input(false);
    readonly userHasUpdateNameAuthorization = input(false);
    readonly initialWidgetData = input<any>();

    private createChartjsState(): ChartsExportChartjsState {
        const component = this;
        return {
            get options() {
                return component.chartOptions();
            },
            set options(options) {
                component.chartOptions.set(options);
            },
            get data() {
                return component.chartData();
            },
            set data(data) {
                component.chartData.set(data);
            },
            get tooltipContext() {
                return component.tooltipContext();
            },
            set tooltipContext(context) {
                component.tooltipContext.set(context);
            },
            get tooltipDisplay() {
                return component.tooltipDisplay();
            },
            set tooltipDisplay(display) {
                component.tooltipDisplay.set(display);
            },
            get tooltipAllowed() {
                return component.tooltipAllowed();
            },
            set tooltipAllowed(allowed) {
                component.tooltipAllowed.set(allowed);
            },
            get tooltipDatasets() {
                return component.tooltipDatasets();
            },
            set tooltipDatasets(datasets) {
                component.tooltipDatasets.set(datasets);
            },
            datasetColors: [],
            datasetAxes: [],
            plugins: [{
                id: 'chartClickXLabel',
                events: ['click'],
                afterEvent: (chart, event) => {
                    const evt = event.event;
                    const [found, labelInfo] = findLabel(getLabelHitBoxes(chart.scales.x), evt);
                    const currentDetailLevel = component.detailLevel(component.groupTime);
                    switch (evt.type) {
                        case 'click': // zoom in
                            if (labelInfo !== null && currentDetailLevel < DetailLevel.ms) {
                                const ticks = chart.scales['x']?.ticks || [];
                                const tick = ticks[labelInfo.index];
                                if (tick === undefined) {
                                    return;
                                }
                                // the bucket under the label, not the span to the next tick: ticks skip gaps and pad single buckets by 1 ms
                                const grouped = (component.widget().properties.group?.type || '') !== '';
                                const bucket = grouped ? clickedBucket(tick.value, component.chartjsDataTimes(chart), component.groupTime) : null;
                                const newDetailLevel = finerDetailLevel(currentDetailLevel);
                                component.groupTime = component.groupTimeFromDetailLevel(newDetailLevel);
                                component.hAxisFormat = component.xAxisFormat(newDetailLevel);
                                if (bucket !== null) {
                                    component.from = new Date(bucket.from);
                                    component.to = new Date(bucket.to);
                                } else {
                                    // without a grouping interval there is no bucket, so the zoom keeps spanning to the next tick
                                    component.from = new Date(tick.value);
                                    component.to = new Date(ticks[labelInfo.index + 1]?.value ?? (component.chartjs.nextDateMs || 0));
                                }
                                component.ready.set(false);
                                component.refresh();
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
                            } else if (component.chartjs.cursorLocked !== true) {
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
    }

    ngOnDestroy() {
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
            this.resizeTimeout = setTimeout(() => this.resizeChart(), 30);
        }));
        this.resizeObserver.observe(this.el.nativeElement);
    }

    setupInitialChartData() {
        if (this.initialWidgetData() != null) {
            if (this.widget().properties.chartType === 'Timeline') {
                this.timelineChartData.set(this.initialWidgetData());
                this.resizeTimeline();
            } else if (this.widget().properties.chartType === 'ColumnChart') {
                // a copy with this instance's own plugin: the handed-over one belongs to the destroyed grid instance
                Object.assign(this.chartjs, this.initialWidgetData(), { plugins: this.chartjs.plugins });
                this.resizeChart();
            } else {
                this.chartExportData.set(this.initialWidgetData());
                this.resizeChart();
            }
            this.setupZoomChartSettings();
            setTimeout(() => {
                this.ready.set(true);
            });
        }
    }

    edit() {
        this.chartsExportService.openEditDialog(this.dashboardId(), this.widget().id, this.userHasUpdateNameAuthorization(), this.userHasUpdatePropertiesAuthorization());
    }

    private scheduleRefresh() {
        this.dashboardService.initWidgetObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget().id) {
                this.refresh();
            }
        });
    }

    private checkConfiguration() {
        const exports = this.widget().properties.exports;
        if (exports) {
            if (exports.length < 1) {
                this.configureWidget.set(true);
                return;
            }
        } else {
            this.configureWidget.set(true);
            return;
        }

        if (this.widget().properties.time === undefined) {
            this.configureWidget.set(true);
            return;
        }
        this.configureWidget.set(false);
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
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget().id, 5, 10);
        this.drawFramedChart(element);

        this.timelineHeight.set(element.height);
        this.timelineWidth.set(element.width);

        if (this.widget().properties.chartType === 'ColumnChart') {
            const dateFormat = columnDateFormat(this.hAxisFormat, this.groupTime);
            this.chartjs.options = buildColumnChartOptions({
                zoom: this.zoom(),
                stacked: this.stacked,
                dateFormat,
                properties: this.widget().properties,
                chartjs: this.chartjs,
                updateDatasetHoverStyle: (hoveredIndex, chart) => this.updateDatasetHoverStyle(hoveredIndex, chart),
                drillable: datasetIndex => this.drillable(datasetIndex),
                drillDown: datasetIndex => this.drillDown(datasetIndex),
                onLegendClick: () => this.onLegendClick(),
            });
            this.chartjsChart?.resize(element.width, element.height);
            this.chartjsChart?.draw();
        }
    }

    /** Line, Scatter and Pie as Google drew them, a zoomed line chart as its AnnotationChart; nothing without data. */
    private drawFramedChart(element: { width: number; height: number; widthPercentage: string; heightPercentage: string }) {
        const chart = this.chartExportData();
        const type = chart.chartType;
        const hasData = chart.dataTable !== undefined && chart.dataTable.length > 0 && chart.dataTable[0].length > 0;
        this.framedChart.set(undefined);
        this.annotation.set(undefined);
        if (!hasData || (type !== 'LineChart' && type !== 'ScatterChart' && type !== 'PieChart')) {
            return;
        }
        if (this.zoom() && type === 'LineChart') {
            this.annotation.set({ series: chartsExportSeries(chart), width: element.width, height: element.height, zoomStart: this.annotationZoomStart });
            return;
        }
        const frame = googleFrame(element.width, element.height, element.widthPercentage, element.heightPercentage);
        this.framedChart.set(type === 'PieChart'
            ? { kind: 'pie', config: chartsExportPieConfig(chart, frame) }
            : { kind: 'line', config: chartsExportLineConfig(chart, frame) });
    }

    /** Google's explorer reset the zoom on a right click. */
    resetGoogleZoom(event: MouseEvent, canvas: HTMLCanvasElement) {
        event.preventDefault();
        Chart.getChart(canvas)?.resetZoom();
    }

    private chartjsDataTimes(chart: Chart): number[] {
        return chart.data.datasets.flatMap(ds => ds.data.map(p => (p as { x?: number } | null)?.x)).filter((x): x is number => typeof x === 'number');
    }

    get chartjsChart(): Chart | undefined {
        return Chart.getChart('chartjs-' + this.widget().id);
    }

    private resizeTimeline() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget().id, 5, 10);
        this.timelineWidth.set(element.width);
        this.timelineHeight.set(element.height);
    }

    getTimelineData(lastOverride?: string) {
        this.resizeTimeline();

        this.chartsExportService.getData(this.widget().properties, this.from?.toISOString(), this.to?.toISOString(), this.groupTime || undefined, lastOverride).subscribe({
            next: (data) => {
                this.timelineChartData.set(data.data);
                this.ready.set(true);
                this.refreshing.set(false);
            },
            error: (err) => {
                this.errorHasOccured.set(true);
                this.errorMessage.set('No data');
                this.errorHandlerService.logError('Chart Export', 'getChartData', err);
                this.ready.set(true);
                this.refreshing.set(false);
            }
        });
    }

    changesTimeframeOnZoom(): boolean {
        const rgxRes = this.timeRgx.exec(this.widget().properties.time?.last || '');
        return this.widget().properties.chartType === 'LineChart' && this.from === null && this.to === null && rgxRes?.length === 3;
    }

    private refresh() {
        this.refreshing.set(true);
        this.checkConfiguration();
        if (this.configureWidget() === false) {
            let lastOverride: string | undefined;
            if (this.zoom() && this.changesTimeframeOnZoom()) {
                const rgxRes = this.timeRgx.exec(this.widget().properties.time?.last || '');
                if (rgxRes?.length !== 3) {
                    return;
                }
                lastOverride = Number(rgxRes[1]) * (this.widget().properties.zoomTimeFactor || 2) + rgxRes[2];
            }

            if (this.widget().properties.chartType === 'Timeline') {
                this.getTimelineData(lastOverride);
                return;
            }

            const widget = JSON.parse(JSON.stringify(this.widget())) as WidgetModel;

            if (this.modifiedVaxes !== null) {
                widget.properties.vAxes = this.modifiedVaxes;
            }

            widget.properties.stacked = this.stacked;

            const chooseColors = this.chooseColors || (widget.properties.vAxes?.length === 1 && (widget.properties.vAxes[0].deviceGroupMergingStrategy === ChartsExportDeviceGroupMergingStrategy.Separate || widget.properties.vAxes[0].deviceGroupMergingStrategy === undefined) && (widget.properties.vAxes[0].deviceGroupId !== undefined || widget.properties.vAxes[0].locationId !== undefined));

            this.chartsExportService.getChartData(widget, this.from?.toISOString(), this.to?.toISOString(), this.groupTime || undefined, this.hAxisFormat || undefined, lastOverride, chooseColors, this.disableBreaking).subscribe((resp: ChartsExportChart | ErrorModel) => {
                if (this.errorHandlerService.checkIfErrorExists(resp)) {
                    this.errorHasOccured.set(true);
                    this.errorMessage.set('No data');
                    this.errorHandlerService.logError('Chart Export', 'getChartData', resp);
                } else {
                    this.errorHasOccured.set(false);
                    if (resp.chartType !== 'PieChart' && resp.dataTable.length > 1) {
                        // rows by time, the header stays first
                        const [header, ...rows] = resp.dataTable;
                        rows.sort((a, b) => (a[0] as Date).valueOf() - (b[0] as Date).valueOf());
                        resp.dataTable = [header, ...rows];
                    }
                    this.chartExportData.set(resp);

                    this.setupZoomChartSettings(lastOverride);
                    this.resizeChart();
                }
                this.size = (this.chartExportData()?.dataTable?.length || 0) * ((this.chartExportData()?.dataTable?.[0]?.length || 0) - 1);
                if (this.size > this.sizeLimit) {
                    console.warn('Chart Widget ' + this.widget().name + ' uses ' + this.size + ' points which is above the recommended limit of ' + this.sizeLimit);
                }
                if (this.widget().properties.chartType === 'ColumnChart') {
                    if (this.chartExportData()?.dataTable.length < 2) {
                        this.chartjs.data = undefined;
                        this.chartjs.datasetColors = [];
                        this.chartjs.datasetAxes = [];
                        this.hoveredDatasetIndex = null;
                        this.ready.set(true);
                        this.refreshing.set(false);
                        return;
                    }
                    this.hoveredDatasetIndex = null;
                    this.chartjs.datasetAxes = this.chartExportData().columnAxes || [];
                    const columns = columnDatasets(this.chartExportData().dataTable, this.chartExportData().colors.length > 0 ? this.chartExportData().colors : undefined, this.modifiedVaxes || this.widget().properties.vAxes, this.chartjs.datasetAxes,
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
                    gapAnnotations(bucketTimes(this.chartExportData().dataTable), this.groupTime,
                        () => window.getComputedStyle(document.getElementsByClassName('color-lookup-warn')[0], null).getPropertyValue('color'),
                        Chart.defaults.color as string).forEach(a => this.chartjs.annotations?.push(a));
                    this.resizeChart();
                }
                this.ready.set(true);
                this.refreshing.set(false);
            });
        } else {
            this.ready.set(true);
            this.refreshing.set(false);
        }

    }

    /** The zoomed line chart starts showing the last 1/zoomTimeFactor of the range fetched with lastOverride. */
    setupZoomChartSettings(lastOverride?: string) {
        this.annotationZoomStart = undefined;
        if (this.zoom() && this.chartExportData().chartType === 'LineChart' && lastOverride !== undefined && !this.ready() && this.chartExportData().dataTable?.length > 1) {
            this.annotationZoomStart = zoomStartTime(this.chartExportData().dataTable, this.widget().properties.zoomTimeFactor).getTime();
        }
    }

    zoomOutTime() {
        const from = this.from === null ? this.chartExportData().dataTable[1][0] as Date : this.from;
        const range = zoomOutRange(this.groupTime, from);
        if (range === undefined) {
            return;
        }
        this.ready.set(false);
        this.hAxisFormat = range.hAxisFormat;
        this.from = range.from;
        this.to = range.to;
        this.groupTime = range.groupTime;
        this.refresh();
    }

    zoomOutEnabled(): boolean {
        const timeRgx = /(\d+)(ms|s|months|m|h|d|w|y)/;
        const rgxRes = timeRgx.exec(this.groupTime || '');

        return this.widget().properties.chartType === 'ColumnChart' && this.widget().properties.group?.type !== undefined
            && this.widget().properties.group?.type !== '' && rgxRes?.length === 3 && Number(rgxRes[1]) === 1 && rgxRes[2] !== 'y' && this.widget().properties.time?.last !== null && this.widget().properties.time?.last !== '';
    }

    private axisOfDataset(datasetIndex: number): ChartsExportVAxesModel | undefined {
        const axes = this.modifiedVaxes || this.widget().properties.vAxes;
        const axisIndex = this.chartjs.datasetAxes[datasetIndex];
        return axes === undefined || axisIndex === undefined ? undefined : axes[axisIndex];
    }

    drillable(datasetIndex: number): boolean {
        const axis = this.axisOfDataset(datasetIndex);
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

    drillDown(datasetIndex: number) {
        const axes = this.modifiedVaxes || this.widget().properties.vAxes;
        const axis = this.axisOfDataset(datasetIndex);
        if (axes === undefined || axis === undefined) {
            return;
        }
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
        this.ready.set(false);
        this.chartjs.tooltipDisplay = 'none';
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
        this.ready.set(false);
        this.chartjs.tooltipDisplay = 'none';
        this.stacked = newAxes?.stacked || null;
        this.refresh();
    }

    closeChartjsTooltip() {
        this.chartjs.tooltipDisplay = 'none';
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

    /** A difference grouping also answers nothing for an interval whose predecessor has no value, which plain "No data" hides. */
    get noDataMessage(): string {
        return this.widget().properties.group?.type?.startsWith('difference') ? 'No data. A difference also needs a value in the interval before.' : 'No data';
    }

    /** Derived from the stored drill stack, so it survives a reload and ends with a reset. */
    get disableBreaking(): boolean {
        return this.drillStackPeek() !== null;
    }

    private get groupTime(): string | null {
        this.viewRevision();
        return this.viewState.groupTime;
    }

    private set groupTime(groupTime: string | null) {
        this.viewState.groupTime = groupTime;
        this.viewStateChanged();
    }

    private get hAxisFormat(): string | undefined {
        this.viewRevision();
        return this.viewState.hAxisFormat;
    }

    private set hAxisFormat(hAxisFormat: string | null) {
        this.viewState.hAxisFormat = hAxisFormat;
        this.viewStateChanged();
    }

    private get from(): Date | null {
        this.viewRevision();
        return this.viewState.from;
    }

    private set from(from: Date | null) {
        this.viewState.from = from;
        this.viewStateChanged();
    }

    private get to(): Date | null {
        this.viewRevision();
        return this.viewState.to;
    }

    private set to(to: Date | null) {
        this.viewState.to = to;
        this.viewStateChanged();
    }

    private get modifiedVaxes(): ChartsExportVAxesModel[] | null {
        this.viewRevision();
        return this.viewState.modifiedVaxes;
    }

    private set modifiedVaxes(axes: ChartsExportVAxesModel[] | null) {
        this.viewState.modifiedVaxes = axes;
        this.viewStateChanged();
    }

    private get stacked(): boolean {
        this.viewRevision();
        return this.viewState.stacked;
    }

    private set stacked(stacked: boolean | null) {
        this.viewState.stacked = stacked;
        this.viewStateChanged();
    }

    private get chooseColors(): boolean {
        this.viewRevision();
        return this.viewState.chooseColors;
    }

    private set chooseColors(chooseColors: boolean | null) {
        this.viewState.chooseColors = chooseColors;
        this.viewStateChanged();
    }

    private viewStateChanged(): void {
        this.viewRevision.update(revision => revision + 1);
    }

    getCustomIcons(header: boolean): { icons: string[]; disabled: boolean[]; tooltips: string[] } {
        this.viewRevision();
        const res = { icons: [] as string[], disabled: [] as boolean[], tooltips: [] as string[] };

        if (this.zoomOutEnabled() && ((this.zoom() && header) || (!this.zoom() && !header))) {
            res.icons.push('zoom_out');
            res.disabled.push(!this.ready());
            res.tooltips.push('Zoom Out');
        }
        if (this.drillStackPeek() !== null && ((this.zoom() && header) || (!this.zoom() && !header))) {
            res.icons.push('arrow_upward');
            res.disabled.push(!this.ready());
            res.tooltips.push('Drill Up');
        }
        if ((this.zoom() && header) || (!this.zoom() && !header)) {
            if (this.viewState.hasStoredState()) {
                res.icons.push('undo');
                res.disabled.push(!this.ready());
                res.tooltips.push('Reset');
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
                this.ready.set(false);
                removeWidgetStorage(this.widget());
                this.viewStateChanged();
                setTimeout(() => this.refresh(), 1000);
                return;
            case 'arrow_upward':
                this.drillUp();
                return;
        }
    }

    getChartData = () => {
        if (this.widget().properties.chartType === 'ColumnChart') {
            return this.chartjs;
        }
        if (this.timelineChartData() != null) {
            return this.timelineChartData();
        } else {
            return this.chartExportData();
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
        this.viewState.drillStackPush(axes, stacked);
        this.viewStateChanged();
    }

    private drillStackPop(): ChartsExportDrillEntry | null {
        const entry = this.viewState.drillStackPop();
        this.viewStateChanged();
        return entry;
    }

    private drillStackPeek(): ChartsExportDrillEntry | null {
        this.viewRevision();
        return this.viewState.drillStackPeek();
    }
}
