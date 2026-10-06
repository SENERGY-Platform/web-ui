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

import { Component, Input, OnInit, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { subMinutes } from 'date-fns';
import { concatMap, filter, map, Subscription, throwError } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { BadVentilationService } from './shared/bad-ventilation.service';
import { VentilationResult } from './shared/model';
import { humidityPoints, VentilationRange, ventilationRanges } from './shared/bad-ventilation-chart';
import { badVentilationChartConfig, BadVentilationChartConfig, refreshBadVentilationChart } from './shared/bad-ventilation-chartjs';
import { BaseChartDirective } from 'ng2-charts';
import { Chart } from 'chart.js';
import { crosshairPlugin } from 'src/app/core/charts/chart-look';

@Component({
    selector: 'senergy-bad-ventilation',
    templateUrl: './bad-ventilation.component.html',
    styleUrls: ['./bad-ventilation.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class BadVentilationComponent implements OnInit {
    ready = false;
    refreshing = false;
    destroy = new Subscription();
    error = false;
    operatorIsInitPhase = false;
    initialPhaseMsg = '';
    showDebug = false;
    widgetHeight = 0;
    widgetWidth = 0;
    configured = false;
    ventilationResults: VentilationResult[] = [];

    humidity: { x: number; y: number }[] = [];
    ranges: VentilationRange[] = [];
    chart?: BadVentilationChartConfig;
    readonly chartPlugins = [crosshairPlugin];
    @ViewChild('humidityChart') humidityChart?: BaseChartDirective;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;


    constructor(
      private ventilationService: BadVentilationService,
      private dashboardService: DashboardService,
    ) {

    }
    ngOnInit(): void {
        this.configured = this.widget.properties.badVentilation !== undefined;
        this.update();
    }

    private update() {
        this.destroy = this.dashboardService.initWidgetObservable.pipe(
            // other widgets' reloads used to refetch and redraw the curve of this one, too
            filter((event: string) => event === 'reloadAll' || event === this.widget.id),
            concatMap(() => {
                this.configured = this.widget.properties.badVentilation !== undefined;
                this.refreshing = true;
                const exportConfig = this.widget.properties.badVentilation?.exportConfig;
                if(exportConfig == null || exportConfig.exports.length === 0) {
                    return throwError(() => new Error('Export Config missing'));
                }
                return this.loadVentilationResult(exportConfig?.exports[0].id);
            }),
            concatMap(_ => this.addDeviceCurve()),
            map(_ => this.addRangeAnnotations())
        ).subscribe({
            next: (_) => {
                this.ready = true;
                this.refreshing = false;
            },
            error: (err) => {
                console.log(err);
                this.error = true;
                this.ready = true;
                this.refreshing = false;
            }
        });
    }

    edit() {
        this.ventilationService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    createMockResult() {
        const highHumidity = subMinutes(new Date(), 8).toISOString();
        const closed = subMinutes(new Date(), 10).toISOString();
        const opened = subMinutes(new Date(), 11).toISOString();

        return [{
            timestamp: highHumidity,
            humidity_too_fast_too_high: highHumidity,
            window_open: false,
        }, {
            timestamp: closed,
            humidity_too_fast_too_high: '',
            window_open: false
        }, {
            timestamp: opened,
            humidity_too_fast_too_high: '',
            window_open: true
        }];
    }

    loadVentilationResult(exportID: string) {
        let timeRange = '';
        try {
            timeRange = this.getTimeRange();
        } catch {
            return throwError(() => new Error('Time range Config missing'));
        }
        return this.ventilationService.getVentilationOutput(exportID, timeRange).pipe(
            map(result => {
                this.ventilationResults = result;
                // this.ventilationResults = this.createMockResult();
            })
        );
    }

    /** Replaces the ranges and redraws, so that a reload does not stack them onto the previous ones. */
    addRangeAnnotations() {
        this.ranges = ventilationRanges(this.ventilationResults);
        if (this.chart === undefined) {
            this.chart = badVentilationChartConfig(this.humidity, this.ranges);
        } else {
            refreshBadVentilationChart(this.chart, this.humidityChart?.chart as Chart | undefined, this.humidity, this.ranges);
        }
    }

    getTimeRange() {
        const timeConfig = this.widget.properties.badVentilation?.timeRangeConfig.timeRange?.time;
        if(timeConfig == null) {
            throw new Error('Time range Config missing');
        }
        const timeLevelConfig = this.widget.properties.badVentilation?.timeRangeConfig.timeRange?.level;
        if(timeLevelConfig == null) {
            throw new Error('Time range Config missing');
        }
        const timeRange = timeConfig + timeLevelConfig;
        return timeRange;
    }

    addDeviceCurve() {
        const deviceConfig = this.widget.properties.badVentilation?.deviceConfig;
        if(deviceConfig == null) {
            return throwError(() => new Error('Device Config missing'));
        }
        const deviceId = deviceConfig.exports[0].id;
        const serviceId = deviceConfig.fields[0].serviceId || '';
        const pathToColumn = deviceConfig.fields[0].valuePath || '';

        let timeRange = '';
        try {
            timeRange = this.getTimeRange();
        } catch {
            return throwError(() => new Error('Time range Config missing'));
        }

        return this.ventilationService.getDeviceCurve(deviceId, serviceId, pathToColumn, timeRange, '1m').pipe(
            map(data => {
                this.humidity = humidityPoints(data);
            })
        );
    }
}
