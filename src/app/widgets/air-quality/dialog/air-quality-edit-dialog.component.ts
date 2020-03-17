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

import {Component, Inject, NgZone, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {ChartsExportMeasurementModel} from '../../charts/export/shared/charts-export-properties.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ExportModel, ExportValueModel} from '../../../modules/data/export/shared/export.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ExportService} from '../../../modules/data/export/shared/export.service';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {Location, MeasurementModel, SensorDataModel} from '../shared/air-quality.model';
import {UBAService} from '../shared/uba.service';
import {DWDPollenService} from '../shared/dwd-pollen.service';
import {UBAStation} from '../shared/uba.model';
import {YrWeatherService} from '../shared/yr-weather.service';
import {GeonamesService} from '../shared/geonames.service';
import {Geoname} from '../shared/geonames.model';
import {FormControl} from '@angular/forms';
import {map, startWith} from 'rxjs/operators';
import {from, Observable} from 'rxjs';
import {NameValuePair} from '../shared/dwd-pollen.model';

@Component({
    templateUrl: './air-quality-edit-dialog.component.html',
    styleUrls: ['./air-quality-edit-dialog.component.css'],
})
export class AirQualityEditDialogComponent implements OnInit {
    exports: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    disableSave = false;
    changeLocation = false;
    name = ' ';
    emptyExportValueModel: ExportValueModel = {InstanceID: '', Name: '', Path: '', Type: ''};
    emptyDataModel: SensorDataModel = {column: this.emptyExportValueModel, value: NaN};
    measurements: MeasurementModel[] = [
        {
            name_html: 'PM10',
            short_name: 'PM10',
            description_html: 'Particulate matter up to 10μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 40}, critical: {lower: 0, upper: 50}}
        },
        {
            name_html: 'PM2.5',
            short_name: 'PM2.5',
            description_html: 'Particulate matter up to 2.5μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 25}, critical: {lower: 0, upper: 30}}
        },
        {
            name_html: 'PM1',
            short_name: 'PM1',
            description_html: 'Particulate matter up to 1μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 0}, critical: {lower: 0, upper: 0}}
        },
        {
            name_html: 'CO<sub>2</sub>',
            short_name: 'CO2',
            description_html: 'Carbon Dioxide',
            unit_html: 'ppm',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 1000}, critical: {lower: 0, upper: 5000}}
        },
        {
            name_html: 'O<sub>2</sub>',
            short_name: 'O2',
            description_html: 'Oxygen',
            unit_html: '%',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 19, upper: 21}, critical: {lower: 18, upper: 25}}
        },
        {
            name_html: 'SO<sub>2</sub>',
            short_name: 'SO2',
            description_html: 'Sulfur Dioxide',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 0}, critical: {lower: 1, upper: 0}}
        },
        {
            name_html: 'CH<sub>4</sub>',
            short_name: 'CH4',
            description_html: 'Methane',
            unit_html: '%', data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 0}, critical: {lower: 1, upper: 0}}
        },
        {
            name_html: 'NO<sub>2</sub>',
            short_name: 'NO2',
            description_html: 'Nitrogen Dioxide',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 40}, critical: {lower: 0, upper: 200}}
        },
        {
            name_html: 'CO',
            short_name: 'CO',
            description_html: 'Carbon Monoxide',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 8}, critical: {lower: 0, upper: 35}}
        },
        {
            name_html: 'O<sub>3</sub>',
            short_name: 'O3',
            description_html: 'Ozone',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 0}, critical: {lower: 0, upper: 180}}
        },
        {
            name_html: 'Rn',
            short_name: 'Rn',
            description_html: 'Radon',
            unit_html: 'Bq/m<sup>3</sup>',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 250}, critical: {lower: 0, upper: 1000}}
        },
        {
            name_html: 'Hum.',
            short_name: 'Hum.',
            description_html: 'relative Humidity',
            unit_html: '%',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 40, upper: 50}, critical: {lower: 30, upper: 70}}
        },
        {
            name_html: 'Temp.',
            short_name: 'Temp.',
            description_html: 'Temperature',
            unit_html: '°C',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            can_web: true,
            boundaries: {warn: {lower: 20, upper: 22}, critical: {lower: 18, upper: 26}}
        },
        {
            name_html: 'Noise',
            short_name: 'Noise',
            unit_html: 'dB',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 40}, critical: {lower: 0, upper: 65}}
        },
        {
            name_html: 'VOC',
            short_name: 'VOC',
            description_html: 'Volatile Organic Compounds',
            unit_html: 'mg/m<sup>3</sup>',
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
            has_outside: false,
            boundaries: {warn: {lower: 0, upper: 1}, critical: {lower: 0, upper: 10}}
        },
    ];
    measurementSelected: string[] = [];
    location: Location =  {
        latitude: 0,
        longitude: 0
    };
    formatted_address = ' ';
    ubaStations: UBAStation[] = [];
    invalidUbaStation: UBAStation = {station_id: -1, station_longitude: -1000, station_latitude: -1000, station_name: ''};
    ubaStationSelected = this.invalidUbaStation;
    maxUBADistance = 10;
    pollenAreaResponse: any = undefined;
    dwd_partregion_name = ' ';
    autoLocationFailed = false;
    pollen: MeasurementModel[] = [
        {
            name_html: 'Ambrosia',
            short_name: 'Ambrosia',
            unit_html: 'Level',
            boundaries: {warn: {lower: 0, upper: 1}, critical: {lower: 0, upper: 3}},
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
        },
        {
            name_html: 'Birke',
            short_name: 'Birke',
            unit_html: 'Level',
            boundaries: {warn: {lower: 0, upper: 1}, critical: {lower: 0, upper: 3}},
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
        },
        {
            name_html: 'Erle',
            short_name: 'Erle',
            unit_html: 'Level',
            boundaries: {warn: {lower: 0, upper: 1}, critical: {lower: 0, upper: 3}},
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
        },
        {
            name_html: 'Hasel',
            short_name: 'Hasel',
            unit_html: 'Level',
            boundaries: {warn: {lower: 0, upper: 1}, critical: {lower: 0, upper: 3}},
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
        },
        {
            name_html: 'Beifuss',
            short_name: 'Beifuss',
            unit_html: 'Level',
            boundaries: {warn: {lower: 0, upper: 1}, critical: {lower: 0, upper: 3}},
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
        },
        {
            name_html: 'Esche',
            short_name: 'Esche',
            unit_html: 'Level',
            boundaries: {warn: {lower: 0, upper: 1}, critical: {lower: 0, upper: 3}},
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
        },
        {
            name_html: 'Roggen',
            short_name: 'Roggen',
            unit_html: 'Level',
            boundaries: {warn: {lower: 0, upper: 1}, critical: {lower: 0, upper: 3}},
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
        },
        {
            name_html: 'Graeser',
            short_name: 'Graeser',
            unit_html: 'Level',
            boundaries: {warn: {lower: 0, upper: 1}, critical: {lower: 0, upper: 3}},
            data: this.emptyDataModel,
            outsideData: this.emptyDataModel,
        },
    ];
    pollenLevel: NameValuePair[];
    pollenSelected: string[] = [];
    yrPath = '';
    geonamesSearchResults: Observable<Geoname[]>;
    searchFormControl = new FormControl();

    constructor(private dialogRef: MatDialogRef<AirQualityEditDialogComponent>,
                private deploymentsService: DeploymentsService,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                private ngZone: NgZone,
                private ubaService: UBAService,
                private dwdPollenService: DWDPollenService,
                private yrWeatherService: YrWeatherService,
                private geonamesService: GeonamesService,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.geonamesSearchResults = from([]);
        this.pollenLevel = dwdPollenService.getNameValuePairs();
    }

    ngOnInit() {
        this.getWidgetData();
        this.initDeployments();

        this.searchFormControl.valueChanges.pipe(
                startWith(''),
                map(value => this.geonamesService.searchPlaces(value)))
        .subscribe(obs => this.geonamesSearchResults = obs);
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.measurements = widget.properties.measurements ? widget.properties.measurements : this.measurements;
            this.pollen = widget.properties.pollen ? widget.properties.pollen : this.pollen;
            this.location = widget.properties.location ? widget.properties.location : this.location;
            if (widget.properties.formatted_address === undefined) {
                this.autoLocation();
            } else {
                this.formatted_address = widget.properties.formatted_address;
            }
            this.name = widget.name;
            this.measurements.forEach(measurement => {
                if (measurement.is_enabled) {
                    this.measurementSelected.push(measurement.name_html);
                }
            });
            this.pollen.forEach(polle => {
                if (polle.is_enabled) {
                    this.pollenSelected.push(polle.name_html);
                }
            });
            this.ubaStationSelected = widget.properties.ubaStation ? widget.properties.ubaStation : this.ubaStationSelected;
            this.dwd_partregion_name = widget.properties.dwd_partregion_name ? widget.properties.dwd_partregion_name : ' ';
            this.yrPath = widget.properties.yrPath ? widget.properties.yrPath : this.yrPath;
        });
    }

    initDeployments() {
        this.exportService.getExports('name', 'asc').subscribe((exports: (ExportModel[] | null)) => {
            if (exports !== null) {
                exports.forEach((exportModel: ExportModel) => {
                    if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                        this.exports.push({id: exportModel.ID, name: exportModel.Name, values: exportModel.Values});
                    }
                });
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.widget.properties.measurements = this.measurements;
        this.widget.properties.location = this.location;
        this.widget.properties.formatted_address = this.formatted_address;
        this.widget.name = this.name;
        if (this.ubaStationSelected.station_id !== -1) {
            this.widget.properties.ubaStation = this.ubaStationSelected;
        } else {
            this.widget.properties.ubaStation = undefined;
        }
        this.widget.properties.dwd_partregion_name = this.dwd_partregion_name === ' ' ? undefined : this.dwd_partregion_name;
        this.widget.properties.pollen = this.pollen;
        this.widget.properties.yrPath = this.yrPath === '' ? undefined : this.yrPath;

        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }

    displayFn(input?: ChartsExportMeasurementModel): string | undefined {
        return input ? input.name : undefined;
    }

    compareExports(a: ChartsExportMeasurementModel, b: ChartsExportMeasurementModel): boolean {
        if (a === undefined && b === undefined) {
            return true;
        }
        if (a === undefined || b === undefined) {
            return false;
        }
        return a.id === b.id && a.name === b.name;
    }

    compareExportValueModels (a: ExportValueModel, b: ExportValueModel): boolean {
        if (a === undefined && b === undefined) {
            return true;
        }
        if (a === undefined || b === undefined) {
            return false;
        }
        return a.InstanceID === b.InstanceID && a.Name === b.Name && a.Path === b.Path && a.Type === b.Type;
    }


    onLocationSelected(geoname: Geoname) {
        this.changeLocation = false;
        this.location = {latitude: Number(geoname.lat), longitude: Number(geoname.lng)};
        this.selectUBAStation();
        if (this.pollenAreaResponse === undefined) {
            this.dwdPollenService.getPollenAreaResponse().subscribe(resp => {
                this.pollenAreaResponse = resp;
                this.dwd_partregion_name = this.dwdPollenService.extractPollenArea(this.location.latitude, this.location.longitude, resp);
                if (!this.hasValidPollenArea()) {
                    this.erasePollenData();
                }
            });
        } else {
            this.dwd_partregion_name =
                this.dwdPollenService.extractPollenArea(this.location.latitude, this.location.longitude, this.pollenAreaResponse);
            if (!this.hasValidPollenArea()) {
                this.erasePollenData();
            }
        }
        this.yrPath = this.yrWeatherService.getYrPath(geoname);
        this.formatted_address = geoname.name + ', ' + geoname.adminCodes1.ISO3166_2 + ', ' + geoname.countryCode;
    }

    measurementsSelected(measurements: MeasurementModel[], measurementSelected: string[]) {
        measurements.forEach(measurement => {
            measurement.is_enabled = false;
            measurementSelected.forEach(value => {
                if (value === measurement.name_html) {
                    measurement.is_enabled = true;
                }
            });
        });
    }

    private selectUBAStation() {
        if (this.ubaStations.length === 0) {
            // only load if not done yet
            this.ubaService.getUBAStations().subscribe(resp => {
                this.ubaStations = resp;
                this.sortUBAStations();
                this.selectClosestUBAStation();
                this.mergeUBAStationCapabilities();
            });
        } else {
            this.sortUBAStations();
            this.selectClosestUBAStation();
        }

    }

    private selectClosestUBAStation() {
        const closest = this.ubaStations[0];
        if (closest.distance === undefined) {
            this.ubaStationSelected = this.invalidUbaStation;
            return;
        }
        if (closest.distance < this.maxUBADistance) {
            this.ubaStationSelected = closest;
        } else {
            this.ubaStationSelected = this.invalidUbaStation;
        }
    }

    private mergeUBAStationCapabilities() {
        this.ubaService.getUBAStationCapabilities(this.ubaStationSelected.station_id).subscribe(short_names => {
            this.measurements.forEach(m => {
                if (m.short_name !== 'Temp.') {
                    const idx = short_names.findIndex(short_name => m.short_name === short_name);
                    if (idx === -1) {
                        m.can_web = false;
                    } else {
                        m.can_web = true;
                    }
                } else {
                    m.can_web = true;
                }
            });
        });
    }

    hasValidUBAStation(): boolean {
        return this.ubaStationSelected.station_id !== -1;
    }

    private sortUBAStations() {
        this.ubaStations.forEach(station =>
            station.distance = this.latLongDistance(station.station_latitude, station.station_longitude,
                this.location.latitude, this.location.longitude));
        this.ubaStations = this.ubaStations.sort((a, b) => {
            if (!a.distance || !b.distance) {
                return 0;
            }
            return a.distance < b.distance ? -1 : 1;
        });
    }

    private latLongDistance(latA: number, longA: number, latB: number, longB: number): number {
        const er = 6366.707;

        // convert degree to radial
        const latFrom = latA * (Math.PI / 180);
        const latTo = latB * (Math.PI / 180);
        const lngFrom = longA * (Math.PI / 180);
        const lngTo = longB * (Math.PI / 180);

        const x1 = er * Math.cos(lngFrom) * Math.sin(latFrom);
        const y1 = er * Math.sin(lngFrom) * Math.sin(latFrom);
        const z1 = er * Math.cos(latFrom);

        const x2 = er * Math.cos(lngTo) * Math.sin(latTo);
        const y2 = er * Math.sin(lngTo) * Math.sin(latTo);
        const z2 = er * Math.cos(latTo);

        const d = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2) + (z1 - z2) * (z1 - z2));

        return d;
    }

    hasValidPollenArea(): boolean {
        return this.dwd_partregion_name !== ' ';
    }

    private erasePollenData() {
        this.pollenSelected = [];
        this.measurementsSelected(this.pollen, this.pollenSelected);
    }

    autoLocation() {
        this.autoLocationFailed = false;
        this.searchFormControl.setValue('');
        navigator.geolocation.getCurrentPosition(pos => {
            this.geonamesService.getClosestGeoname(pos.coords.latitude, pos.coords.longitude)
                .subscribe(geoname => this.onLocationSelected(geoname));
        }, posError => {
           switch (posError.code) {
               case posError.PERMISSION_DENIED:
                    console.log('Position request denied');
                   break;
               case posError.POSITION_UNAVAILABLE:
                    console.log('Position unavailable');
                   break;
               case posError.TIMEOUT:
                    console.log('Position request timed out');
                   break;
           }
           this.changeLocation = true;
           this.autoLocationFailed = true;
        });
    }
}
