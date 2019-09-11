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
import {AirQualityService} from './shared/air-quality.service';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';

@Component({
    selector: 'senergy-air-quality',
    templateUrl: './air-quality.component.html',
    styleUrls: ['./air-quality.component.css'],
})
export class AirQualityComponent implements OnInit, OnDestroy {
    numReady = 0;
    readyNeeded = 0;
    destroy = new Subscription();
    warnings = 0;
    criticals = 0;
    tooltip: string[] = [];
    inDetailView = false;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {id: '', type: '', name: '', properties: {}};
    @Input() zoom = false;

    constructor(private iconRegistry: MatIconRegistry,
                private sanitizer: DomSanitizer,
                private airRecommendationService: AirQualityService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.update();
        this.registerIcons();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    registerIcons() {
        // this.iconRegistry.addSvgIcon('thermometer', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/.svg'));
    }

    edit() {
        this.airRecommendationService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private update() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.readyNeeded = 0;
                this.numReady = 0;
                this.warnings = 0;
                this.criticals = 0;
                this.tooltip = [];
                if (this.widget.properties.measurements) {
                    this.widget.properties.measurements.forEach(measurement => {
                        if (measurement.is_enabled) {
                            measurement.is_warning = false;
                            measurement.is_critical = false;
                            measurement.tooltip = '';
                            this.readyNeeded += 1;
                            this.airRecommendationService.readData(measurement).subscribe(() => {
                                const value = Math.round(measurement.data.value * 100) / 100; // rounds to two decimals
                                if (value < measurement.boundaries.critical.lower) {
                                    measurement.is_critical = true;
                                    this.criticals += 1;
                                    measurement.tooltip = measurement.name_html + ' is at ' + value
                                        + ' which is below critical value of '
                                        + measurement.boundaries.critical.lower;
                                } else if (value > measurement.boundaries.critical.upper) {
                                    this.criticals += 1;
                                    measurement.is_critical = true;
                                    measurement.tooltip = measurement.name_html + ' is at ' + value
                                        + ' which is above critical value of '
                                        + measurement.boundaries.critical.lower;
                                } else if (value < measurement.boundaries.warn.lower) {
                                    this.warnings += 1;
                                    measurement.is_warning = true;
                                    measurement.tooltip = measurement.name_html + ' is at ' + value
                                        + ' which is below warning value of '
                                        + measurement.boundaries.warn.lower;
                                } else if (value > measurement.boundaries.warn.upper) {
                                    this.warnings += 1;
                                    measurement.is_warning = true;
                                    measurement.tooltip = measurement.name_html + ' is at ' + value
                                        + ' which is above warning value of '
                                        + measurement.boundaries.warn.upper;
                                }
                                this.numReady += 1;
                            });
                        }
                    });
                }
            }
        });
    }

    isReady() {
        return this.numReady === this.readyNeeded;
    }

    clicked() {
        this.inDetailView = !this.inDetailView;
    }
}
