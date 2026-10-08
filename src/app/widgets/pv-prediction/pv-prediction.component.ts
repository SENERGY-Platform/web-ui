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

import { Component, Input, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { concatMap, of, Subscription, map } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { PvPredictionService } from './shared/pv-load.service';
import { PVPredictionResult } from './shared/prediction.model';
import { nextPvPredictionText, pvPredictionPoints } from './shared/pv-prediction-chart';
import { pvPredictionChart } from './shared/pv-prediction-chartjs';
import { FramedChartConfig } from '../../core/charts/google-columns';
import { googlePlugins } from '../../core/charts/google-chartjs';
import { SingleValueModel } from '../single-value/shared/single-value.model';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../components/widget-spinner/widget-spinner.component';
import { ValueComponent } from '../single-value/value/value.component';
import { BaseChartDirective } from 'ng2-charts';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';

@Component({
    selector: 'senergy-pv-prediction',
    templateUrl: './pv-prediction.component.html',
    styleUrls: ['./pv-prediction.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, WidgetSpinnerComponent, ValueComponent, BaseChartDirective, WidgetFooterComponent]
})
export class PvPredictionComponent implements OnInit, OnDestroy {
    ready = false;
    refreshing = false;
    destroy = new Subscription();
    error?: string;
    chart?: FramedChartConfig<'line'>;
    readonly plugins = googlePlugins;
    nextPrediction?: SingleValueModel;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    configured = false;

    constructor(
        private dashboardService: DashboardService,
        private pvService: PvPredictionService
    ) { }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    ngOnInit(): void {
        this.update();
        this.configured = this.widget.properties.pvPrediction !== undefined;
    }

    private update() {
        this.destroy = this.dashboardService.initWidgetObservable.pipe(
            concatMap((event: string) => {
                if (event === 'reloadAll' || event === this.widget.id) {
                    this.configured = this.widget.properties.pvPrediction !== undefined;
                    if (!this.configured) {
                        return of();
                    }
                    this.refreshing = true;
                    const exportID = this.widget.properties.pvPrediction!.exportID;
                    return this.pvService.getPVPrediction(exportID);
                }
                return of();
            }),
            map((data: PVPredictionResult) => {
                const nextValueConfig = this.widget.properties.pvPrediction?.nextValueConfig;
                if (this.widget.properties.pvPrediction?.displayTimeline) {
                    this.setupChartData(data);
                } else if (this.widget.properties.pvPrediction?.displayNextValue && nextValueConfig) {
                    this.calcNextPVPrediction(data, nextValueConfig.level, nextValueConfig.time);
                }
                return data;
            })).subscribe({
                next: (_) => {
                    this.ready = true;
                    this.refreshing = false;
                },
                error: (err) => {
                    console.error(err);
                    this.error = err;
                    this.ready = true;
                    this.refreshing = false;
                }
            });
    }

    setupChartData(data: PVPredictionResult) {
        this.chart = pvPredictionChart(pvPredictionPoints(data));
    }

    calcNextPVPrediction(data: PVPredictionResult, level: string, time: number) {
        this.nextPrediction = {
            value: nextPvPredictionText(data, level, time, new Date()),
            type: 'String',
            date: new Date()
        };
    }

    edit() {
        this.pvService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }
}
