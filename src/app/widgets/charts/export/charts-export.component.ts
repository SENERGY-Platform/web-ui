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

import {Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ChartSelectEvent, GoogleChartComponent,} from 'ng2-google-charts';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {ElementSizeService} from '../../../core/services/element-size.service';
import {ChartsModel} from '../shared/charts.model';
import {ChartsExportService} from './shared/charts-export.service';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';
import {ErrorModel} from '../../../core/model/error.model';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {ChartsService} from '../shared/charts.service';

@Component({
    selector: 'senergy-charts-export',
    templateUrl: './charts-export.component.html',
    styleUrls: ['./charts-export.component.css'],
})
export class ChartsExportComponent implements OnInit, OnDestroy {
    chartExportData = {} as ChartsModel;
    ready = false;
    refreshing = true;
    destroy = new Subscription();
    configureWidget = false;
    errorHasOccured = false;
    errorMessage = '';
    sizeLimit = 10000;
    size = 0;

    private resizeTimeout = 0;
    private timeRgx = /(\d+)(ms|s|months|m|h|d|w|y)/;

    @ViewChild('chartExport', {static: false}) chartExport!: GoogleChartComponent;
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdateAuthorization = false;

    @HostListener('window:resize')
    onResize() {
        if (this.resizeTimeout === 0) {
            this.resizeTimeout = window.setTimeout(() => {
                this.resizeProcessInstancesStatusChart();
                this.resizeTimeout = 0;
            }, 500);
        }
    }

    constructor(
        private chartsService: ChartsService,
        private chartsExportService: ChartsExportService,
        private elementSizeService: ElementSizeService,
        private dashboardService: DashboardService,
        private errorHandlerService: ErrorHandlerService,
    ) {
    }

    ngOnInit() {
        this.scheduleRefresh();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
        this.chartsService.releaseResources(this.chartExport);
    }

    edit() {
        this.chartsExportService.openEditDialog(this.dashboardId, this.widget.id);
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

    private resizeProcessInstancesStatusChart() {
        const element = this.elementSizeService.getHeightAndWidthByElementId(this.widget.id, 5);
        if (this.chartExportData.options !== undefined) {
            this.chartExportData.options.height = element.height;
            this.chartExportData.options.width = element.width;
            if (this.chartExportData.options.chartArea) {
                this.chartExportData.options.chartArea.height = element.heightPercentage;
                this.chartExportData.options.chartArea.width = element.widthPercentage;
            }
            if (this.chartExportData.dataTable[0].length > 0) {
                this.chartExport.draw();
            }
        }
    }

    private refresh() {
        this.refreshing = true;
        this.checkConfiguration();
        if (this.configureWidget === false) {
            let lastOverride: string | undefined;
            const rgxRes = this.timeRgx.exec(this.widget.properties.time?.last || '');
            if (this.zoom && this.widget.properties.chartType === 'LineChart' && this.from === null && this.to === null && rgxRes?.length === 3) {
                lastOverride = Number(rgxRes[1]) * (this.widget.properties.zoomTimeFactor || 2) + rgxRes[2];
            }

            this.chartsExportService.getChartData(this.widget, this.from?.toISOString(), this.to?.toISOString(), this.groupTime || undefined, this.hAxisFormat || undefined, lastOverride).subscribe((resp: ChartsModel | ErrorModel) => {
                if (this.errorHandlerService.checkIfErrorExists(resp)) {
                    this.errorHasOccured = true;
                    this.errorMessage = 'No data';
                    this.errorHandlerService.logError('Chart Export', 'getChartData', resp);
                    this.ready = true;
                    this.refreshing = false;
                } else {
                    this.errorHasOccured = false;
                    this.chartExportData = resp;
                    this.chartExportData.dataTable.sort((a, b) => (a[0] as Date).valueOf() - (b[0] as Date).valueOf());

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
                            const end = (this.chartExportData.dataTable[this.chartExportData.dataTable.length-1][0] as Date).valueOf();
                            const range = end - start;
                            this.chartExportData.options.zoomStartTime = new Date(end - (range / (this.widget.properties.zoomTimeFactor || 2)));
                        }
                    }
                    setTimeout(() => this.chartExport?.draw(), 0);
                    this.ready = true;
                    this.refreshing = false;
                }
                this.size = (this.chartExportData?.dataTable?.length || 0) * ((this.chartExportData?.dataTable?.[0]?.length || 0) - 1);
                if (this.size > this.sizeLimit) {
                    console.warn('Chart Widget ' + this.widget.name + ' uses ' + this.size + ' points which is above the recommended limit of ' + this.sizeLimit);
                }
            });
        } else {
            this.ready = true;
            this.refreshing = false;
        }
    }

    onChartSelect($event: ChartSelectEvent) {
        const rgxRes = this.timeRgx.exec(this.groupTime || '');

        if (this.widget.properties.chartType === 'ColumnChart' && this.widget.properties.group?.type !== undefined
            && this.widget.properties.group?.type !== '' && rgxRes?.length === 3 && Number(rgxRes[1]) === 1 && this.widget.properties.time?.last !== null && this.widget.properties.time?.last !== '') {
            this.ready = false;
            this.from = ($event.selectedRowValues[0] as Date);
            this.to = new Date(this.from.valueOf());

            let timeUnit = rgxRes[2];
            switch (timeUnit) {
            case 'y':
                timeUnit = 'months';
                this.hAxisFormat = 'MMM';
                this.to = new Date(this.to.setFullYear(this.to.getFullYear() + 1));
                break;
            case 'months':
                timeUnit = 'd';
                this.hAxisFormat = 'dd';
                this.to = new Date(this.to.setMonth(this.to.getMonth() + 1));
                break;
            case 'w':
                timeUnit = 'd';
                this.hAxisFormat = 'dd';
                this.to = new Date(this.to.valueOf() + 1000 * 60 * 60 * 24 * 7);
                break;
            case 'd':
                timeUnit = 'h';
                this.hAxisFormat = 'HH';
                this.to = new Date(this.to.setDate(this.to.getDate() + 1));
                break;
            case 'h':
                timeUnit = 'm';
                this.hAxisFormat = 'mm';
                this.to = new Date(this.to.setHours(this.to.getHours() + 1));
                break;
            case 'm':
                timeUnit = 's';
                this.hAxisFormat = 'ss';
                this.to = new Date(this.to.setMinutes(this.to.getMinutes() + 1));
                break;
            case 's':
                timeUnit = 'ms';
                this.hAxisFormat = 'ss.SSS';
                this.to = new Date(this.to.setSeconds(this.to.getSeconds() + 1));
                break;
            case 'ms':
                return; // cant go smaller
            }

            this.groupTime = '1' + timeUnit;

            this.refresh();
        }
    }

    drillUp() {
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

    getCustomIcons(header: boolean): { icons: string[]; disabled: boolean[]; tooltips: string[] } {
        const res = {icons: [] as string[], disabled: [] as boolean[], tooltips: [] as string[]};

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
                    res.tooltips.push('reset zoom');
                    break;
                }
            }
        }

        return res;
    }

    customEvent($event: { index: number; icon: string }) {
        if ($event.icon === 'zoom_out') {
            this.drillUp();
        } else if ($event.icon === 'undo') {
            this.ready = false;
            this.chartsService.cleanup(this.widget);
            this.refresh();
        }
    }
}
