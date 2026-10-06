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

import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { map, Subscription } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { LeackageDetectionProperties, LeakageDetectionResponse } from './shared/leakage-detction.model';
import { LeakageDetectionService } from './shared/leakage-detection.service';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { consumptionSeries } from '../shared/consumption-series';
import { consumptionChartConfig, ConsumptionChartConfig } from '../shared/consumption-chartjs';
import { crosshairPlugin } from 'src/app/core/charts/chart-look';

@Component({
    selector: 'senergy-leakage-detection-widget',
    templateUrl: './leakage-detection.component.html',
    styleUrls: ['./leakage-detection.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
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

    chart?: ConsumptionChartConfig;
    readonly chartPlugins = [crosshairPlugin];
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

        this.chart = consumptionChartConfig(consumptionSeries(data.last_consumptions), 'dd.MM HH:mm:ss.SSS');
    }

    edit() {
        this.leakageService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }
}
