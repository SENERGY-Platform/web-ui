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

import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { map, Subscription } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { ApexChartOptions } from '../charts/export/shared/charts-export-properties.model';
import { LeackageDetectionProperties, LeakageDetectionResponse } from './shared/leakage-detction.model';
import { LeakageDetectionService } from './shared/leakage-detection.service';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';

@Component({
    selector: 'senergy-leakage-detection-widget',
    templateUrl: './leakage-detection.component.html',
    styleUrls: ['./leakage-detection.component.css']
})
export class LeakageDetectionComponent implements OnInit, OnDestroy {
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @ViewChild('content', { static: false }) contentBox!: ElementRef;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    refreshing = false;
    error = false;
    ready = false;
    chartExportData: any;
    configured = false;
    widgetProperties!: LeackageDetectionProperties;
    message = '';
    timeWindow = '';
    destroy: Subscription | undefined;

    chartData: ApexChartOptions = {
        series: [],
        chart: {
            redrawOnParentResize: true,
            redrawOnWindowResize: true,
            width: '100%',
            height: 'auto',
            animations: {
                enabled: false
            },
            type: 'scatter',
            toolbar: {
                show: false
            },
            events: {}
        },
        markers: {
            size: 4
        },
        title: {},
        plotOptions: {},
        xaxis: {
            type: 'datetime' as 'datetime' | 'category',
            labels: {
                datetimeUTC: false,
            },
            title: {
                text: ''
            }
        },
        yaxis: {
            title: {
                text: ''
            },
            decimalsInFloat: 3
        },
        colors: [],
        legend: {
            show: true
        },
        annotations: {
            points: [],
            xaxis: []
        },
        tooltip: {
            enabled: true,
            x: {
                format: 'dd.MM HH:mm:ss.fff',
            }
        },
    };
    operatorIsInitPhase = false;
    initialPhaseMsg = '';

    constructor(
        private leakageService: LeakageDetectionService,
        private dashboardService: DashboardService,
    ) {

    }

    ngOnInit(): void {
        if (!this.widget.properties.leakageDetection) {
            this.configured = false;
            return;
        } else {
            this.configured = true;
            this.widgetProperties = this.widget.properties.leakageDetection || {};
        }

        this.refresh();
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refresh();
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy?.unsubscribe();
    }

    private checkForInit(data: LeakageDetectionResponse) {
        if (data.initial_phase !== '' && data.initial_phase !== null) {
            this.operatorIsInitPhase = true;
            this.initialPhaseMsg = data.initial_phase;
            return true;
        }
        return false;
    }

    refresh() {
        this.refreshing = true;
        this.leakageService.getLatestLeakageDetectionOutput(this.widgetProperties.exportID).pipe(
            map((data) => {
                this.setupChartData(data);
            })
        ).subscribe({
            next: () => {
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

    setupChartData(data: LeakageDetectionResponse) {
        this.checkForInit(data);
        this.message = 'Normaler Wasserverbrauch im Zeitfenster';
        if (data.value === 1) {
            this.message = 'In den letzten 5 Minuten wurde übermäßig viel Wasser verbraucht';
        }
        this.timeWindow = data.time_window;

        if (this.chartData !== undefined) {
            this.chartData.series = [];
            this.chartData.colors = [];
        }

        const points: any[] = [];
        const anomalyPoints: any[] = [];
        data.last_consumptions.forEach(row => {
            const ts = new Date(row[0]).getTime();
            const value = row[1];
            const pointIsAnomaly = row[2];

            if (pointIsAnomaly === 1) {
                anomalyPoints.push({
                    x: ts,
                    y: value
                });
            } else {
                points.push({
                    x: ts,
                    y: value
                });
            }
        });
        this.chartData?.series.push({ data: points, name: 'Normal Consumption' });
        this.chartData?.series.push({ data: anomalyPoints, name: 'Anomalous Consumption' });
        this.chartData.colors = ['#008FFB', '#FF0000'];
    }

    edit() {
        this.leakageService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }
}
