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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { EnergyPredictionService } from './shared/energy-prediction.service';
import { EnergyPredictionModel } from './shared/energy-prediction.model';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'senergy-energy-prediction',
    templateUrl: './energy-prediction.component.html',
    styleUrls: ['./energy-prediction.component.css'],
})
export class EnergyPredictionComponent implements OnInit, OnDestroy {
    predictionModel: EnergyPredictionModel = { prediction: 0, predictionTotal: 0, timestamp: '' };
    ready = false;
    configured = false;
    error = false;
    refreshing = false;
    destroy = new Subscription();
    thresholdActive = false;
    price = 0;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdateAuthorization = false;

    constructor(
        private iconRegistry: MatIconRegistry,
        private sanitizer: DomSanitizer,
        private predictionService: EnergyPredictionService,
        private dashboardService: DashboardService,
    ) {}

    ngOnInit() {
        this.update();
        this.setConfigured();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.predictionService.openEditDialog(this.dashboardId, this.widget.id);
    }

    getConsumptionTooltip() {
        return 'Estimated consumption within one ' + this.widget.properties.selectedOption?.toLowerCase();
    }

    getMeterReadingTooltip() {
        return 'Estimated meter reading at the date below';
    }

    getPriceTooltip() {
        return 'Consumption associated cost within one ' + this.widget.properties.selectedOption?.toLowerCase();
    }

    private update() {
        this.setConfigured();
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                const prediction = this.predictionService.getPrediction(this.widget);
                prediction.subscribe(
                    (devicesStatus: EnergyPredictionModel) => {
                        this.predictionModel = devicesStatus;
                        this.price = this.predictionModel.prediction * (this.widget.properties.price || 0);
                        switch (this.widget.properties.thresholdOption) {
                        case 'Consumption':
                            this.thresholdActive = this.predictionModel.prediction > (this.widget.properties.threshold || -Infinity);
                            break;
                        case 'Price':
                            this.thresholdActive = this.price > (this.widget.properties.threshold || -Infinity);
                            break;
                        }
                        this.error = false;
                        this.refreshing = false;
                        this.ready = true;
                    },
                    () => {
                        this.ready = true;
                        this.error = true;
                        this.refreshing = false;
                    },
                );
            }
        });
    }

    private setConfigured() {
        this.configured = !(
            this.widget.properties === undefined ||
            this.widget.properties.thresholdOption === '' ||
            this.widget.properties.selectedOption === '' ||
            this.widget.properties.measurement === undefined
        );
    }
}
