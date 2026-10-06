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
import { ConsumptionProfileProperties, ConsumptionProfileResponse } from './shared/consumption-profile.model';
import { ConsumptionProfileService } from './shared/consumption-profile.service';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { consumptionSeries } from '../shared/consumption-series';
import { consumptionChartConfig, ConsumptionChartConfig } from '../shared/consumption-chartjs';
import { crosshairPlugin } from 'src/app/core/charts/chart-look';

@Component({
    selector: 'senergy-consumption-profile-widget',
    templateUrl: './consumption-profile.component.html',
    styleUrls: ['./consumption-profile.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ConsumptionProfileComponent implements OnInit, OnDestroy {
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @ViewChild('content', { static: false }) contentBox!: ElementRef;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    configured = false;
    error = false;
    widgetProperties!: ConsumptionProfileProperties;
    refreshing = false;
    ready = false;
    timeWindow = '';
    message = '';
    chart?: ConsumptionChartConfig;
    readonly chartPlugins = [crosshairPlugin];
    operatorIsInitPhase = false;
    initialPhaseMsg = '';
    destroy: Subscription | undefined;

    constructor(
        private consumptionService: ConsumptionProfileService,
        private dashboardService: DashboardService,
    ) {

    }

    private checkForInit(data: ConsumptionProfileResponse) {
        if (data.initial_phase !== '' && data.initial_phase !== null) {
            this.operatorIsInitPhase = true;
            this.initialPhaseMsg = data.initial_phase;
            return true;
        }
        return false;
    }

    ngOnInit(): void {
        if (!this.widget.properties.consumptionProfile) {
            this.configured = false;
            return;
        } else {
            this.configured = true;
            this.widgetProperties = this.widget.properties.consumptionProfile || {};
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

    refresh() {
        this.refreshing = true;
        this.consumptionService.getLatestConsumptionProfileOutput(this.widgetProperties.exportID).pipe(
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
                this.ready = true;
                this.error = true;
                this.refreshing = false;

            }
        });
    }

    setupChartData(data: ConsumptionProfileResponse) {
        this.checkForInit(data);
        this.timeWindow = data.time_window;

        this.message = 'Normaler Verbrauch im Zeitfenster';
        if (data.value === true) {
            const anomalyType = data.type === 'low' ? 'niedriger' : 'hoher';
            this.message = 'Ungewöhnlicher ' + anomalyType + ' Verbrauch im Zeitfenster';
        }

        this.chart = consumptionChartConfig(consumptionSeries(data.last_consumptions), 'dd.MM');
    }

    edit() {
        this.consumptionService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }
}
