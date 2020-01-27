/*
 * Copyright 2018 InfAI (CC SES)
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

import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {WidgetModel} from '../../modules/dashboard/shared/dashboard-widget.model';
import {MatIconRegistry} from '@angular/material';
import {DomSanitizer} from '@angular/platform-browser';
import {EnergyPredictionService} from './shared/energy-prediction.service';
import {EnergyPredictionModel} from './shared/energy-prediction.model';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';

@Component({
    selector: 'senergy-energy-prediction',
    templateUrl: './energy-prediction.component.html',
    styleUrls: ['./energy-prediction.component.css'],
})
export class EnergyPredictionComponent implements OnInit, OnDestroy {

    predictionModel: EnergyPredictionModel = {prediction: 0, predictionTotal: 0, timestamp: ''};
    ready = false;
    configured = false;
    dataReady = false;
    destroy = new Subscription();
    thresholdActive = false;
    price = 0;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {id: '', type: '', name: '', properties: {}};
    @Input() zoom = false;

    constructor(private iconRegistry: MatIconRegistry,
                private sanitizer: DomSanitizer,
                private predictionService: EnergyPredictionService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.update();
        this.registerIcons();
        this.setConfigured();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    registerIcons() {

    }

    edit() {
        this.predictionService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private update() {
        this.setConfigured();
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.dataReady = false;
                const prediction = this.predictionService.getPrediction(this.widget);
                prediction.subscribe((devicesStatus: EnergyPredictionModel) => {
                    this.predictionModel = devicesStatus;
                    if (this.widget.properties.math !== '') {
                        if (typeof this.predictionModel.prediction === 'number') {
                            this.predictionModel.prediction =
                                eval(this.predictionModel.prediction + (this.widget.properties.math || '+ 0'));
                        }
                        if (typeof this.predictionModel.predictionTotal === 'number') {
                            this.predictionModel.predictionTotal =
                                eval(this.predictionModel.predictionTotal + (this.widget.properties.math || '+ 0'));
                        }
                    }
                    this.price = this.predictionModel.prediction * (this.widget.properties.price || 0);
                    switch (this.widget.properties.thresholdOption) {
                        case 'Consumption':
                            this.thresholdActive = this.predictionModel.prediction > (this.widget.properties.threshold || -Infinity);
                            break;
                        case 'Price':
                            this.thresholdActive = this.price > (this.widget.properties.threshold || -Infinity);
                            break;
                    }
                    this.dataReady = true;
                    this.ready = true;
                }, () => {
                    this.ready = true;
                });
            }
        });
    }

    private setConfigured() {
        this.configured = !(
            this.widget.properties === undefined
            || this.widget.properties.thresholdOption === ''
            || this.widget.properties.selectedOption === ''
            || this.widget.properties.measurement === undefined
        );
    }
}
