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
import {UBAService} from './shared/uba.service';
import {UBAComponent, UBAData} from './shared/uba.model';
import {DWDPollenForecast} from './shared/dwd-pollen.model';
import {DWDPollenService} from './shared/dwd-pollen.service';
import {YrWeatherService} from './shared/yr-weather.service';
import {SensorDataModel} from './shared/air-quality.model';

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
    pollenWarnings = 0;
    pollenCriticals = 0;
    tooltip: string[] = [];
    inDetailView = false;
    ubaComponents: UBAComponent[] = [];
    dwdPollenForecast: DWDPollenForecast = {forecast: []};
    dwdPollenForecastResponse: any = undefined;
    pros: string[] = [];
    cons: string[] = [];

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {id: '', type: '', name: '', properties: {}};
    @Input() zoom = false;

    constructor(private iconRegistry: MatIconRegistry,
                private sanitizer: DomSanitizer,
                private airRecommendationService: AirQualityService,
                private ubaService: UBAService,
                private dwdPollenService: DWDPollenService,
                private dashboardService: DashboardService,
                private yrWeatherService: YrWeatherService) {
    }

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
        this.airRecommendationService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private update() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe(async (event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.readyNeeded = 0;
                this.numReady = 0;
                this.warnings = 0;
                this.criticals = 0;
                this.tooltip = [];
                this.updateMeasurements();
                this.updateUbaData();
                this.updateDWDData();
                this.updateYrData();
                while (!this.isReady()) {
                    await this.delay(100);
                }
                this.createAdvice();
            }
        });
    }

    isReady() {
        return this.numReady === this.readyNeeded;
    }

    clicked() {
        this.inDetailView = !this.inDetailView;
    }

    private mergeUbaData(ubaData: UBAData[]) {
        ubaData.forEach(uba => {
            if (this.widget.properties.measurements) {
                const index = this.widget.properties.measurements.findIndex(m => m.short_name === uba.short_name);
                if (index !== -1) {
                    this.widget.properties.measurements[index].ubaData = uba;
                }
            }
        });
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
                        this.pros.push(measurement.name_html + ' is warning inside: '
                            + measurement.data.value + '&nbsp;' + measurement.unit_html);
                    }
                    if (measurement.is_critical) {
                        this.pros.push(measurement.name_html + ' is critical inside: '
                            +  measurement.data.value + '&nbsp;' + measurement.unit_html);
                    }
                }
                if (measurement.ubaData) {
                    if (measurement.ubaData.value > measurement.boundaries.critical.upper) {
                        this.cons.push(measurement.name_html + ' is critical outside: '
                            + measurement.ubaData.value + '&nbsp;' + measurement.ubaData.unit);
                    } else if (measurement.ubaData.value > measurement.boundaries.critical.upper) {
                        this.cons.push(measurement.name_html + ' has warning outside: '
                            + measurement.ubaData.value + '&nbsp;' + measurement.ubaData.unit);
                    }
                    if (measurement.is_enabled &&
                        (measurement.is_critical || measurement.is_warning)
                        && measurement.data && measurement.ubaData.value < measurement.data.value) {
                        this.pros.push(measurement.name_html + ' is better outside: '
                            + measurement.ubaData.value + '&nbsp;' + measurement.ubaData.unit);
                    } else if (measurement.is_enabled &&
                        (measurement.is_critical || measurement.is_warning)
                        && measurement.data && measurement.ubaData.value > measurement.data.value) {
                        this.pros.push(measurement.name_html + ' is worse outside: '
                            + measurement.ubaData.value + '&nbsp;' + measurement.ubaData.unit);
                    }
                }
            }
        }
        if (this.widget.properties.pollen) {
            for (const pollen of this.widget.properties.pollen) {
                if (pollen.is_enabled && pollen.data) {
                    if (pollen.is_critical) {
                        this.cons.push(pollen.name_html + ' is critical outside: '
                            + this.dwdPollenService.getNameForValue(pollen.data.value));
                    } else if (pollen.is_warning) {
                        this.cons.push(pollen.name_html + ' has warning outside: '
                            + this.dwdPollenService.getNameForValue(pollen.data.value));
                    }
                }
            }
        }
        if (this.widget.properties.weather && this.widget.properties.measurements) {
            const tempMeasurement = this.widget.properties.measurements[
                this.widget.properties.measurements.findIndex(m => m.short_name === 'Temp.')];

            const now = this.widget.properties.weather.weatherdata.forecast.tabular.time[0];
            const oneh = this.widget.properties.weather.weatherdata.forecast.tabular.time[1];
            if (tempMeasurement.is_enabled) {
                if (tempMeasurement.is_warning || tempMeasurement.is_critical) {
                    if (tempMeasurement.data && tempMeasurement.data.value > tempMeasurement.boundaries.warn.upper) { // too hot inside
                        if (Number(now.temperature._value) < tempMeasurement.data.value) {
                            this.pros.push('Temp. is better outside: ' + now.temperature._value + tempMeasurement.unit_html);
                        } else {
                            this.cons.push('Temp. is worse outside: ' + now.temperature._value + tempMeasurement.unit_html);
                        }
                    } else if (tempMeasurement.data &&
                        tempMeasurement.data.value < tempMeasurement.boundaries.warn.lower) { // too cold inside
                        if (Number(now.temperature._value) < tempMeasurement.data.value) {
                            this.cons.push('Temp. is worse outside: ' + now.temperature._value + tempMeasurement.unit_html);
                        } else {
                            this.pros.push('Temp. is better outside: ' + now.temperature._value + tempMeasurement.unit_html);
                        }
                    }
                }
                if (Number(now.temperature._value) > tempMeasurement.boundaries.critical.upper
                    || Number(now.temperature._value) < tempMeasurement.boundaries.critical.lower) {
                    this.cons.push('Temp. is critical outside: ' + now.temperature._value + tempMeasurement.unit_html);
                } else if (Number(now.temperature._value) < tempMeasurement.boundaries.warn.lower
                    || Number(now.temperature._value) > tempMeasurement.boundaries.warn.upper) {
                    this.cons.push('Temp. is warning outside: ' + now.temperature._value + tempMeasurement.unit_html);
                }
            }
            if (Number(now.precipitation) + Number(oneh.precipitation) > 0) {
                this.cons.push('It might be raining soon');
            }
        }
    }

    private updateMeasurements() {
        if (this.widget.properties.measurements) {
            this.widget.properties.measurements.forEach(measurement => {
                if (measurement.is_enabled) {
                    measurement.is_warning = false;
                    measurement.is_critical = false;
                    measurement.tooltip = '';
                    this.readyNeeded++;
                    this.airRecommendationService.readData(measurement).subscribe(() => {
                        if (measurement.data) {
                            const value = Math.round(measurement.data.value * 100) / 100; // rounds to two decimals
                            if (value < measurement.boundaries.critical.lower) {
                                measurement.is_critical = true;
                                this.criticals++;
                                measurement.tooltip = measurement.name_html + ' is at ' + value
                                    + ' which is below critical value of '
                                    + measurement.boundaries.critical.lower;
                            } else if (value > measurement.boundaries.critical.upper) {
                                this.criticals++;
                                measurement.is_critical = true;
                                measurement.tooltip = measurement.name_html + ' is at ' + value
                                    + ' which is above critical value of '
                                    + measurement.boundaries.critical.upper;
                            } else if (value < measurement.boundaries.warn.lower) {
                                this.warnings++;
                                measurement.is_warning = true;
                                measurement.tooltip = measurement.name_html + ' is at ' + value
                                    + ' which is below warning value of '
                                    + measurement.boundaries.warn.lower;
                            } else if (value > measurement.boundaries.warn.upper) {
                                this.warnings++;
                                measurement.is_warning = true;
                                measurement.tooltip = measurement.name_html + ' is at ' + value
                                    + ' which is above warning value of '
                                    + measurement.boundaries.warn.upper;
                            }
                        }
                        this.numReady++;
                    });
                }
            });
        }
    }

    private updateUbaData() {
        if (this.widget.properties.ubaStation) {
            this.readyNeeded++;
            const station = this.widget.properties.ubaStation;
            if (this.ubaComponents.length === 0) {
                this.ubaService.getUBAComponents().subscribe(components => {
                    this.ubaComponents = components;
                    this.ubaService.getUBAData(station.station_id, this.ubaComponents).subscribe(resp => {
                        this.mergeUbaData(resp);
                        this.numReady++;
                    });
                });
            } else {
                this.ubaService.getUBAData(station.station_id, this.ubaComponents).subscribe(resp => {
                    this.mergeUbaData(resp);
                    this.numReady++;
                });
            }
        }
    }

    private updateDWDData() {
        if (this.widget.properties.dwd_partregion_name && this.widget.properties.pollen) {
            this.readyNeeded++;
            this.pollenWarnings = 0;
            this.pollenCriticals = 0;
            const dwd_partregion_name = this.widget.properties.dwd_partregion_name;
            if (this.dwdPollenForecastResponse === undefined ||
                (this.dwdPollenForecast.next_update !== undefined && new Date() > this.dwdPollenForecast.next_update)) {
                this.dwdPollenService.getPollenForecast().subscribe(resp => {
                    this.dwdPollenForecastResponse = resp;
                    this.dwdPollenForecast = this.dwdPollenService.extractPollenForecast(dwd_partregion_name, resp);
                    this.dwdPollenForecast.forecast.forEach(name => {
                        if (this.widget.properties.pollen) {
                            const index = this.widget.properties.pollen.findIndex(value => value.short_name === name.name);
                            if (index !== -1) {
                                const value = name.today;
                                let data: SensorDataModel;
                                if (value.length > 1) {
                                    const first = Number(value.charAt(0));
                                    const second = Number(value.charAt(2));
                                    data = {value: (first + second) / 2};
                                    this.widget.properties.pollen[index].data = data;
                                } else {
                                    data = {value: Number(value)};
                                    this.widget.properties.pollen[index].data = data;
                                }
                                this.widget.properties.pollen[index].pollenData = name;

                                this.widget.properties.pollen[index].is_critical = false;
                                this.widget.properties.pollen[index].is_warning = false;
                                if (data.value >= this.widget.properties.pollen[index].boundaries.critical.upper) {
                                    this.widget.properties.pollen[index].is_critical = true;
                                    this.pollenCriticals++;
                                } else if (data.value >= this.widget.properties.pollen[index].boundaries.warn.upper) {
                                    this.widget.properties.pollen[index].is_warning = true;
                                    this.pollenWarnings++;
                                }
                            }
                        }
                    });
                    this.numReady++;
                });
            } else {
                this.numReady++;
            }
        }
    }

    private updateYrData() {
        if ((this.widget.properties.location && !this.widget.properties.weather) ||
            (this.widget.properties.location &&  this.widget.properties.weather  &&
                this.widget.properties.weather.cacheUntil &&
                this.widget.properties.weather.cacheUntil < new Date())
        ) {
            this.readyNeeded++;
            if (this.widget.properties.yrPath) {
                this.yrWeatherService.getYrForecast(this.widget.properties.yrPath)
                    .subscribe(model => {
                        this.widget.properties.weather = model;
                        this.numReady++;
                    });
            } else {
                console.error('AirWidget: Does not have Yr Path. Should be set when editing widget.');
                this.numReady++;
            }
        }
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
