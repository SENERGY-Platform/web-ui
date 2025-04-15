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
import { AirQualityService } from './shared/air-quality.service';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { Observable, of, Subscription } from 'rxjs';
import { UBAService } from './shared/uba.service';
import { DWDPollenService } from './shared/dwd-pollen.service';
import { map } from 'rxjs/operators';

@Component({
    selector: 'senergy-air-quality',
    templateUrl: './air-quality.component.html',
    styleUrls: ['./air-quality.component.css'],
})
export class AirQualityComponent implements OnInit, OnDestroy {
    ready = false;
    refreshing = false;
    destroy = new Subscription();
    pollenWarnings = 0;
    pollenCriticals = 0;
    inDetailView = false;
    pros: string[] = [];
    cons: string[] = [];

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    constructor(
        private iconRegistry: MatIconRegistry,
        private sanitizer: DomSanitizer,
        private airRecommendationService: AirQualityService,
        private ubaService: UBAService,
        private dwdPollenService: DWDPollenService,
        private dashboardService: DashboardService,
    ) {}

    ngOnInit() {
        this.update();
        this.registerIcons();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    registerIcons() {
        this.iconRegistry.addSvgIcon('yr', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/yr.svg'));
        this.iconRegistry.addSvgIcon('uba', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/uba.svg'));
        this.iconRegistry.addSvgIcon('dwd', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/dwd.svg'));
        this.iconRegistry.addSvgIcon('geonames', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/geonames.svg'));
    }

    edit() {
        this.airRecommendationService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    private update() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe(async (event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                this.updateMeasurements().subscribe((_) => {
                    this.createAdvice();
                    this.ready = true;
                    this.refreshing = false;
                });
            }
        });
    }

    clicked() {
        this.inDetailView = !this.inDetailView;
    }

    isWidgetConfigured(): boolean {
        return Object.keys(this.widget.properties).length > 0;
    }

    private createAdvice() {
        this.pros = [];
        this.cons = [];

        if (this.widget.properties.measurements) {
            for (const measurement of this.widget.properties.measurements) {
                if (measurement.is_enabled && measurement.data) {
                    if (measurement.is_warning) {
                        this.pros.push(
                            measurement.name_html + ' is warning inside: ' + measurement.data.value + '&nbsp;' + measurement.unit_html,
                        );
                    }
                    if (measurement.is_critical) {
                        this.pros.push(
                            measurement.name_html + ' is critical inside: ' + measurement.data.value + '&nbsp;' + measurement.unit_html,
                        );
                    }
                }
                if (!isNaN(measurement.outsideData.value) && measurement.outsideData.value !== null && measurement.short_name !== 'Hum.') {
                    const outsideValue = measurement.outsideData.value;
                    if (outsideValue > measurement.boundaries.critical.upper || outsideValue < measurement.boundaries.critical.lower) {
                        this.cons.push(measurement.name_html + ' is critical outside: ' + outsideValue + measurement.unit_html);
                    } else if (outsideValue < measurement.boundaries.warn.lower || outsideValue > measurement.boundaries.warn.upper) {
                        this.cons.push(measurement.name_html + ' is warning outside: ' + outsideValue + measurement.unit_html);
                    }
                    if (measurement.is_warning || measurement.is_critical) {
                        if (measurement.data && measurement.data.value && measurement.data.value > measurement.boundaries.warn.upper) {
                            // too high inside
                            if (outsideValue < measurement.data.value) {
                                this.pros.push(measurement.name_html + ' is better outside: ' + outsideValue + measurement.unit_html);
                            } else if (outsideValue > measurement.data.value) {
                                this.cons.push(measurement.name_html + ' is worse outside: ' + outsideValue + measurement.unit_html);
                                this.pros = this.pros.filter((c) => !c.startsWith(measurement.name_html));
                            }
                        } else if (
                            measurement.data &&
                            measurement.data.value &&
                            measurement.data.value < measurement.boundaries.warn.lower
                        ) {
                            // too low inside
                            if (outsideValue < measurement.data.value) {
                                this.cons.push(measurement.name_html + ' is worse outside: ' + outsideValue + measurement.unit_html);
                                this.pros = this.pros.filter((c) => !c.startsWith(measurement.name_html));
                            } else if (outsideValue > measurement.data.value) {
                                this.pros.push(measurement.name_html + ' is better outside: ' + outsideValue + measurement.unit_html);
                            }
                        }
                    }
                }
            }

            const humIndex = this.widget.properties.measurements.findIndex((m) => m.short_name === 'Hum.');
            const tempIndex = this.widget.properties.measurements.findIndex((m) => m.short_name === 'Temp.');
            if (humIndex !== -1 && tempIndex !== -1) {
                const temp = this.widget.properties.measurements[tempIndex];
                const hum = this.widget.properties.measurements[humIndex];
                if (hum.is_enabled && (hum.has_outside || hum.can_web) && temp.is_enabled && (temp.has_outside || temp.can_web)) {
                    const absOutsideNow = AirQualityService.getAbsoluteHumidity(temp.outsideData.value, hum.outsideData.value);
                    const relAfter = AirQualityService.getRelativeHumidity(temp.data.value, absOutsideNow);
                    if (relAfter > hum.boundaries.critical.upper || relAfter < hum.boundaries.critical.lower) {
                        this.cons.push(hum.name_html + ' could reach critical level');
                    } else if (relAfter > hum.boundaries.warn.upper || relAfter < hum.boundaries.warn.lower) {
                        this.cons.push(hum.name_html + ' could reach warning level');
                    }
                    if (hum.is_critical || hum.is_warning) {
                        if (hum.data.value > hum.boundaries.warn.upper && relAfter < hum.data.value) {
                            // too high inside
                            this.pros.push(hum.name_html + ' would decrease');
                        } else if (hum.data.value < hum.boundaries.warn.lower && relAfter > hum.data.value) {
                            // too low inside
                            this.pros.push(hum.name_html + ' would increase');
                        }
                    }
                }
            }
        }
        if (this.widget.properties.pollen) {
            for (const pollen of this.widget.properties.pollen) {
                if (pollen.is_enabled && pollen.data) {
                    if (pollen.is_critical) {
                        this.cons.push(
                            pollen.name_html + ' is critical outside: ' + this.dwdPollenService.getNameForValue(pollen.outsideData.value),
                        );
                    } else if (pollen.is_warning) {
                        this.cons.push(
                            pollen.name_html + ' has warning outside: ' + this.dwdPollenService.getNameForValue(pollen.outsideData.value),
                        );
                    }
                }
            }
        }
    }

    private updateMeasurements(): Observable<any> {
        if (this.widget.properties.measurements === undefined) {
            return of(null);
        }
        return this.airRecommendationService.readAllData(this.widget).pipe(
            map((widget) => {
                this.widget = widget;
                widget.properties.measurements?.forEach((m, index) => {
                    if (this.widget.properties.measurements) {
                        this.widget.properties.measurements[index].is_critical = false;
                        this.widget.properties.measurements[index].is_warning = false;
                        const value = m.data.value;
                        if (
                            value < this.widget.properties.measurements[index].boundaries.critical.lower ||
                            value > this.widget.properties.measurements[index].boundaries.critical.upper
                        ) {
                            this.widget.properties.measurements[index].is_critical = true;
                        } else if (
                            value < this.widget.properties.measurements[index].boundaries.warn.lower ||
                            value > this.widget.properties.measurements[index].boundaries.warn.upper
                        ) {
                            this.widget.properties.measurements[index].is_warning = true;
                        }
                    }
                });
                if (this.widget.properties.dwdPollenInfo?.exportId !== undefined) {
                    this.pollenWarnings = 0;
                    this.pollenCriticals = 0;
                    widget.properties.pollen?.forEach((m, index) => {
                        if (this.widget.properties.pollen) {
                            this.widget.properties.pollen[index].is_critical = false;
                            this.widget.properties.pollen[index].is_warning = false;
                            const value = m.data.value;
                            if (
                                value < this.widget.properties.pollen[index].boundaries.critical.lower ||
                                value > this.widget.properties.pollen[index].boundaries.critical.upper
                            ) {
                                this.widget.properties.pollen[index].is_critical = true;
                                this.pollenCriticals++;
                            } else if (
                                value < this.widget.properties.pollen[index].boundaries.warn.lower ||
                                value > this.widget.properties.pollen[index].boundaries.warn.upper
                            ) {
                                this.widget.properties.pollen[index].is_warning = true;
                                this.pollenWarnings++;
                            }
                        }
                    });
                }
            }),
        );
    }
}
