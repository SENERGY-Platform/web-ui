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

import { AfterViewInit, Component, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChartSelectEvent, GoogleChartComponent, } from 'ng2-google-charts';
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
    zoomedAfterRefesh = 0;

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
                if (this.chartExportData.dataTable != null && this.chartExportData.dataTable.length > 0 && this.chartExportData.dataTable[0].length > 0) {
                    this.chartExport.draw();
                }
                this.resizeTimeout = 0;
            }, 500);
        }
    }

    // Use a setter for the chart which will get called when then ngif from ready evaluates to true
    // This is needed so the element is not undefined when called later to draw
    private chartExport!: GoogleChartComponent;
    @ViewChild('chartExport', { static: false }) set content(content: GoogleChartComponent) {
        if (content) { // initially setter gets called with undefined
            this.chartExport = content;
        }
    }

    constructor(
        private chartsService: ChartsService,
        private chartsExportService: ChartsExportService,
        private elementSizeService: ElementSizeService,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService
    ) {
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
        this.chartsService.releaseResources(this.chartExport);
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
                    this.ready = true;
                    this.refreshing = false;
                    this.zoomedAfterRefesh = 0;
                } else {
                    this.errorHasOccured = false;
                    this.chartExportData = resp;
                    this.chartExportData.dataTable.sort((a, b) => (a[0] as Date).valueOf() - (b[0] as Date).valueOf());

                    this.setupZoomChartSettings(lastOverride);
                    this.ready = true;
                    this.refreshing = false;
                    this.zoomedAfterRefesh = 0;
                    this.resizeChart();
                    this.chartExport?.draw();
                }
                this.size = (this.chartExportData?.dataTable?.length || 0) * ((this.chartExportData?.dataTable?.[0]?.length || 0) - 1);
                if (this.size > this.sizeLimit) {
                    console.warn('Chart Widget ' + this.widget.name + ' uses ' + this.size + ' points which is above the recommended limit of ' + this.sizeLimit);
                }
            });
        } else {
            this.ready = true;
            this.refreshing = false;
            this.zoomedAfterRefesh = 0;
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

    onChartReady() {
        const htmlElem = (this.chartExport as any).HTMLel;
        const wrapper = this.chartExport.wrapper;
        if (wrapper.getChart() === undefined && htmlElem === undefined) {
            console.error('unable to setup zoom listener');
            return;
        }
        if (this.widget.properties.group?.type === undefined || this.widget.properties.group?.type === '') {
            return; //no aggregation --> no detail gained or lost after zoom
        }
        const getCoords = (): { min: Date; max: Date } | undefined => {
            const chart = wrapper.getChart();

            let res;
            if (chart && chart.hasOwnProperty('getChartLayoutInterface')) {
                const chartLayout = chart.getChartLayoutInterface();
                const chartBounds = chartLayout.getChartAreaBoundingBox();
                res = {
                    min: chartLayout.getHAxisValue(chartBounds.left),
                    max: chartLayout.getHAxisValue(chartBounds.width + chartBounds.left)
                };
            }
            return res;
        };

        const msInS = 1000;
        const msInM = msInS * 60;
        const msInH = msInM * 60;
        const msInD = msInH * 24;
        const msInY = msInD * 365;
        const observer = new MutationObserver(() => {
            const zoomCurrent = getCoords();
            if (zoomCurrent !== undefined) {
                if (this.chartExportData.dataTable.length === 0) {
                    return;
                }
                if (!this.refreshing && this.zoomedAfterRefesh > 2) {
                    const diff = zoomCurrent.max.valueOf() - zoomCurrent.min.valueOf(); // diff in ms
                    console.log(diff);
                    let timeUnit = '';
                    let hAxisFormat = '';
                    if (diff < msInS) {
                        timeUnit = 'ms';
                        hAxisFormat = 'ss.SSS';
                    } else if (diff < 2 * msInM) {
                        timeUnit = 's';
                        hAxisFormat = 'ss';
                    } else if (diff < 2 * msInH) {
                        timeUnit = 'm';
                        hAxisFormat = 'mm';
                    } else if (diff < 2 * msInD) {
                        timeUnit = 'h';
                        hAxisFormat = 'HH';
                    } else if (diff < 45 * msInD) {
                        timeUnit = 'd';
                        hAxisFormat = 'dd';
                    } else if (diff < msInY) {
                        timeUnit = 'months';
                        hAxisFormat = 'MMM';
                    } else { // use years
                        timeUnit = 'y';
                        hAxisFormat = 'yyyy';
                    }
                    const groupTime = '1' + timeUnit;
                    if (this.detailLevel(groupTime) > this.detailLevel(this.groupTime)) {
                        this.ready = false;
                        this.groupTime = groupTime;
                        this.hAxisFormat = hAxisFormat;
                        this.to = zoomCurrent.max;
                        this.from = zoomCurrent.min;
                        this.refresh();
                    }
                }
                if (!this.refreshing) {
                    this.zoomedAfterRefesh++;
                }
            }
        });
        observer.observe(htmlElem, {
            childList: true,
            subtree: true
        });
    }

    onChartSelect($event: ChartSelectEvent) {
        if ($event.column === null || this.widget.properties.vAxes === undefined) {
            return;
        }
        const axes = this.modifiedVaxes || this.widget.properties.vAxes;
        if (axes.length < $event.column) {
            return;
        }
        const axis = axes[$event.column - 1]; // time column
        if (axis.subAxes !== undefined && axis.subAxes.length > 0) {
            const cpy = JSON.parse(JSON.stringify(axis.subAxes)) as ChartsExportVAxesModel[];
            cpy.forEach(sub => sub.displayOnSecondVAxis = axis.displayOnSecondVAxis);
            this.modifiedVaxes = cpy;
            this.stacked = true;
            this.ready = false;
            this.refresh();
        } else if (axis.deviceGroupMergingStrategy === ChartsExportDeviceGroupMergingStrategy.Sum && (axis.deviceGroupId !== undefined || axis.locationId !== undefined)) {
            // we can split this!
            this.chooseColors = true;
            const cpy = JSON.parse(JSON.stringify(axis)) as ChartsExportVAxesModel;
            cpy.deviceGroupMergingStrategy = ChartsExportDeviceGroupMergingStrategy.Separate;
            this.modifiedVaxes = [cpy];
            this.stacked = true;
            this.ready = false;
            this.refresh();
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
                this.hAxisFormat = 'yyyy';
                this.from = new Date(0);
                this.to = new Date('2999-01-01T00:00:00Z');
                break;
            case 'w':
            case 'd':
                timeUnit = 'months';
                this.hAxisFormat = 'MMM';
                this.from = new Date(this.from.setMonth(0, 0));
                this.from = new Date(this.from.setHours(0, 0, 0, 0));
                this.to = new Date(this.from.setFullYear(this.from.getFullYear() + 1));
                break;
            case 'h':
                timeUnit = 'd';
                this.hAxisFormat = 'dd';
                this.from = new Date(this.from.setDate(0));
                this.from = new Date(this.from.setHours(0, 0, 0, 0));
                this.to = new Date(this.from.setMonth(this.from.getMonth() + 1));
                break;
            case 'm':
                timeUnit = 'h';
                this.hAxisFormat = 'HH';
                this.from = new Date(this.from.setHours(0, 0, 0, 0));
                this.to = new Date(this.from.setDate(this.from.getDate() + 1));
                break;
            case 's':
                timeUnit = 'm';
                this.hAxisFormat = 'mm';
                this.from = new Date(this.from.setMinutes(0, 0, 0));
                this.to = new Date(this.from.setHours(this.from.getHours() + 1));
                break;
            case 'ms':
                timeUnit = 's';
                this.hAxisFormat = 'ss';
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

    private get hAxisFormat(): string | null {
        return localStorage.getItem(this.widget.id + '_hAxisFormat');
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
            res.tooltips.push('zoom out');
        }
        if ((this.zoom && header) || (!this.zoom && !header)) {
            for (let i = 0; i < localStorage.length; i++) {
                if (localStorage.key(i)?.startsWith(this.widget.id)) {
                    res.icons.push('undo');
                    res.disabled.push(!this.ready);
                    res.tooltips.push('reset');
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
        }
    }

    getChartData = () => {
        if (this.timelineChartData != null) {
            return this.timelineChartData;
        } else {
            return this.chartExportData;
        }
    };

    private detailLevel(groupTime: string | null): number {
        const rgxRes = this.timeRgx.exec(groupTime || '');
        if (rgxRes === null || rgxRes.length < 3) {
            return -1;
        }
        switch (rgxRes[2]) {
            case 'ms': return 6;
            case 's': return 5;
            case 'm': return 4;
            case 'h': return 3;
            case 'd': return 2;
            case 'months': return 1;
            case 'y': return 0;
            default: return -1;
        }
    }
}
