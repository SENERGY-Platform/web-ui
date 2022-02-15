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

import { Component, Inject, NgZone, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportMeasurementModel } from '../../charts/export/shared/charts-export-properties.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ExportModel, ExportResponseModel, ExportValueModel } from '../../../modules/exports/shared/export.model';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { AirQualityExternalProvider, Location, MeasurementModel, SensorDataModel } from '../shared/air-quality.model';
import { UBAService } from '../shared/uba.service';
import { DWDPollenService } from '../shared/dwd-pollen.service';
import { UBAStation } from '../shared/uba.model';
import { GeonamesService } from '../shared/geonames.service';
import { Geoname } from '../shared/geonames.model';
import { FormControl } from '@angular/forms';
import { debounceTime, map } from 'rxjs/operators';
import { forkJoin, from, Observable, of, Subscriber } from 'rxjs';
import { NameValuePair } from '../shared/dwd-pollen.model';
import { ImportInstancesService } from '../../../modules/imports/import-instances/shared/import-instances.service';
import { ImportInstancesModel } from '../../../modules/imports/import-instances/shared/import-instances.model';
import { environment } from '../../../../environments/environment';
import { ImportTypesService } from '../../../modules/imports/import-types/shared/import-types.service';
import { mergeMap } from 'rxjs/internal/operators';
import {DeviceInstancesModel} from "../../../modules/devices/device-instances/shared/device-instances.model";
import {
    DeviceTypeModel,
    DeviceTypeServiceModel
} from "../../../modules/metadata/device-types-overview/shared/device-type.model";
import {DeviceInstancesService} from "../../../modules/devices/device-instances/shared/device-instances.service";
import {DeviceTypeService} from "../../../modules/metadata/device-types-overview/shared/device-type.service";
import {ExportDataService} from "../../shared/export-data.service";

@Component({
    templateUrl: './air-quality-edit-dialog.component.html',
    styleUrls: ['./air-quality-edit-dialog.component.css'],
})
export class AirQualityEditDialogComponent implements OnInit {
    constructor(
        private dialogRef: MatDialogRef<AirQualityEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        private exportService: ExportService,
        private ngZone: NgZone,
        private ubaService: UBAService,
        private dwdPollenService: DWDPollenService,
        private geonamesService: GeonamesService,
        private importInstancesService: ImportInstancesService,
        private importTypesService: ImportTypesService,
        private deviceInstancesService: DeviceInstancesService,
        private deviceTypeService: DeviceTypeService,
        @Inject(MAT_DIALOG_DATA) data: { dashboardId: string; widgetId: string },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.geonamesSearchResults = from([]);
        this.pollenLevel = dwdPollenService.getNameValuePairs();
    }

    exports: ExportModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    disableSave = false;
    changeLocation = false;
    name = ' ';
    measurements: MeasurementModel[] = [];
    allMeasurements: MeasurementModel[] = [
        {
            name_html: 'PM10',
            short_name: 'PM10',
            description_html: 'Particulate matter up to 10μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 40 }, critical: { lower: 0, upper: 50 } },
        },
        {
            name_html: 'PM2.5',
            short_name: 'PM2.5',
            description_html: 'Particulate matter up to 2.5μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 25 }, critical: { lower: 0, upper: 30 } },
        },
        {
            name_html: 'PM1',
            short_name: 'PM1',
            description_html: 'Particulate matter up to 1μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 0 }, critical: { lower: 0, upper: 0 } },
        },
        {
            name_html: 'CO<sub>2</sub>',
            short_name: 'CO2',
            description_html: 'Carbon Dioxide',
            unit_html: 'ppm',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 1000 }, critical: { lower: 0, upper: 5000 } },
        },
        {
            name_html: 'O<sub>2</sub>',
            short_name: 'O2',
            description_html: 'Oxygen',
            unit_html: '%',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 19, upper: 21 }, critical: { lower: 18, upper: 25 } },
        },
        {
            name_html: 'SO<sub>2</sub>',
            short_name: 'SO2',
            description_html: 'Sulfur Dioxide',
            unit_html: 'μg/m<sup>3</sup>',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 0 }, critical: { lower: 1, upper: 0 } },
        },
        {
            name_html: 'CH<sub>4</sub>',
            short_name: 'CH4',
            description_html: 'Methane',
            unit_html: '%',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 0 }, critical: { lower: 1, upper: 0 } },
        },
        {
            name_html: 'NO<sub>2</sub>',
            short_name: 'NO2',
            description_html: 'Nitrogen Dioxide',
            unit_html: 'μg/m<sup>3</sup>',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 40 }, critical: { lower: 0, upper: 200 } },
        },
        {
            name_html: 'CO',
            short_name: 'CO',
            description_html: 'Carbon Monoxide',
            unit_html: 'μg/m<sup>3</sup>',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 8 }, critical: { lower: 0, upper: 35 } },
        },
        {
            name_html: 'O<sub>3</sub>',
            short_name: 'O3',
            description_html: 'Ozone',
            unit_html: 'μg/m<sup>3</sup>',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 0 }, critical: { lower: 0, upper: 180 } },
        },
        {
            name_html: 'Rn',
            short_name: 'Rn',
            description_html: 'Radon',
            unit_html: 'Bq/m<sup>3</sup>',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 250 }, critical: { lower: 0, upper: 1000 } },
        },
        {
            name_html: 'Hum.',
            short_name: 'Hum.',
            description_html: 'relative Humidity',
            unit_html: '%',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            can_web: true,
            provider: AirQualityExternalProvider.Yr,
            boundaries: { warn: { lower: 40, upper: 50 }, critical: { lower: 30, upper: 70 } },
        },
        {
            name_html: 'Temp.',
            short_name: 'Temp.',
            description_html: 'Temperature',
            unit_html: '°C',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            can_web: true,
            provider: AirQualityExternalProvider.Yr,
            boundaries: { warn: { lower: 20, upper: 22 }, critical: { lower: 18, upper: 26 } },
        },
        {
            name_html: 'Noise',
            short_name: 'Noise',
            unit_html: 'dB',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 40 }, critical: { lower: 0, upper: 65 } },
        },
        {
            name_html: 'VOC',
            short_name: 'VOC',
            description_html: 'Volatile Organic Compounds',
            unit_html: 'mg/m<sup>3</sup>',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 10 } },
        },
        {
            name_html: 'Pressure',
            short_name: 'Pressure',
            description_html: 'Barometric Air Pressure',
            unit_html: 'hPa',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            can_web: true,
            provider: AirQualityExternalProvider.Yr,
            boundaries: { warn: { lower: 0, upper: 1100 }, critical: { lower: 0, upper: 1100 } },
        },
        {
            name_html: 'Precipitation (1 h)',
            short_name: 'Precipitation',
            description_html: 'Precipitation within the next hour',
            unit_html: 'mm',
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
            has_outside: false,
            can_web: true,
            provider: AirQualityExternalProvider.Yr,
            boundaries: { warn: { lower: 0, upper: 0 }, critical: { lower: 0, upper: 1 } },
        },
    ];
    measurementSelected: string[] = [];
    location: Location = {
        latitude: 0,
        longitude: 0,
    };
    formatted_address = ' ';
    ubaStations: UBAStation[] = [];
    ubaBlacklist: number[] = [];
    invalidUbaStation: UBAStation = {
        station_id: -1,
        station_longitude: -1000,
        station_latitude: -1000,
        station_name: '',
    };
    ubaStationSelected = this.invalidUbaStation;
    maxUBADistance = 10;
    autoLocationFailed = false;
    pollen: MeasurementModel[] = [
        {
            name_html: 'Ambrosia',
            short_name: 'Ambrosia',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
        },
        {
            name_html: 'Birke',
            short_name: 'Birke',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
        },
        {
            name_html: 'Erle',
            short_name: 'Erle',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
        },
        {
            name_html: 'Hasel',
            short_name: 'Hasel',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
        },
        {
            name_html: 'Beifuss',
            short_name: 'Beifuss',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
        },
        {
            name_html: 'Esche',
            short_name: 'Esche',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
        },
        {
            name_html: 'Roggen',
            short_name: 'Roggen',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
        },
        {
            name_html: 'Graeser',
            short_name: 'Graeser',
            unit_html: 'Level',
            boundaries: { warn: { lower: 0, upper: 1 }, critical: { lower: 0, upper: 3 } },
            data: AirQualityEditDialogComponent.getEmptyDataModel(),
            outsideData: AirQualityEditDialogComponent.getEmptyDataModel(),
        },
    ];
    pollenLevel: NameValuePair[];
    pollenSelected: string[] = [];
    geonamesSearchResults: Observable<Geoname[]>;
    searchFormControl = new FormControl();
    importInstances: ImportInstancesModel[] = [];
    ready = false;
    devices: DeviceInstancesModel[] = [];
    deviceTypes: Map<string, DeviceTypeModel> = new Map();

    private static getEmptyExportValueModel(): ExportValueModel {
        return { InstanceID: '', Name: '', Path: '', Type: '' };
    }

    private static getEmptyDataModel(): SensorDataModel {
        return { column: AirQualityEditDialogComponent.getEmptyExportValueModel(), value: NaN };
    }

    private static latLongDistance(latA: number, longA: number, latB: number, longB: number): number {
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

        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2) + (z1 - z2) * (z1 - z2));
    }

    ngOnInit() {
        const obs: Observable<any>[] = [];
        obs.push(this.getWidgetData());
        this.exportService.getExports('', 9999, 0, 'name', 'asc', undefined, undefined, true).subscribe((exports: ExportResponseModel | null) => {
            if (exports !== null) {
                this.exports = exports.instances || [];
            }
        });
        obs.push(
            this.importInstancesService
                .listImportInstances('', undefined, undefined, 'name.asc')
                .pipe(map((importInstances) => (this.importInstances = importInstances))),
        );

        obs.push(
            this.ubaService.getUBAStations().pipe(
                map((resp) => {
                    this.ubaStations = resp;
                }),
            ),
        );

        obs.push(
            this.deviceInstancesService.getDeviceInstances('', 9999, 0, 'name', 'asc').pipe(
                map((resp) => {
                    this.devices = resp;
                }),
            ),
        );

        forkJoin(obs).subscribe((_) => {
            this.sortUBAStations();
            if (this.widget.properties.ubaInfo?.stationId !== undefined) {
                const station = this.ubaStations.find((s) => '' + s.station_id === this.widget.properties.ubaInfo?.stationId);
                if (station !== undefined) {
                    this.ubaStationSelected = station;
                }
            }
            this.patchNewMeasurements();
            this.ready = true;
        });

        this.searchFormControl.valueChanges
            .pipe(
                debounceTime(300),
                map((value) => this.geonamesService.searchPlaces(value)),
            )
            .subscribe((res) => (this.geonamesSearchResults = res));
    }

    getWidgetData(): Observable<any> {
        return this.dashboardService.getWidget(this.dashboardId, this.widgetId).pipe(
            map((widget: WidgetModel) => {
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
                this.measurements.forEach((measurement) => {
                    if (measurement.is_enabled) {
                        this.measurementSelected.push(measurement.name_html);
                    }
                });
                this.pollen.forEach((polle) => {
                    if (polle.is_enabled) {
                        this.pollenSelected.push(polle.name_html);
                    }
                });
            }),
        );
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.ready = false;
        const observables: Observable<any>[] = [];
        observables.push(this.prepareDWDSave());
        observables.push(this.prepareUbaSave());
        observables.push(this.prepareYrSave());
        forkJoin(observables).subscribe((_) => {
            this.widget.properties.version = 4; // can use devices and queries timescale
            this.widget.properties.measurements = this.measurements;
            this.widget.properties.location = this.location;
            this.widget.properties.formatted_address = this.formatted_address;
            this.widget.name = this.name;
            this.widget.properties.pollen = this.pollen;

            this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
                if (resp.message === 'OK') {
                    this.dialogRef.close(this.widget);
                } else {
                    this.ready = true;
                }
            });
        });
    }

    displayFn(input?: ChartsExportMeasurementModel): string | undefined {
        return input ? input.name : undefined;
    }

    compareExports(a: ExportModel, b: ExportModel): boolean {
        if (a === undefined && b === undefined) {
            return true;
        }
        if (a === null && b === null) {
            return true;
        }
        if (a === undefined || b === undefined) {
            return false;
        }
        if (a === null || b === null) {
            return false;
        }
        return a.ID === b.ID;
    }

    compareExportValueModels(a: ExportValueModel, b: ExportValueModel): boolean {
        if (a === undefined && b === undefined) {
            return true;
        }
        if (a === null && b === null) {
            return true;
        }
        if (a === undefined || b === undefined) {
            return false;
        }
        if (a === null || b === null) {
            return false;
        }
        return a.InstanceID === b.InstanceID && a.Name === b.Name && a.Path === b.Path && a.Type === b.Type;
    }

    onLocationSelected(geoname: Geoname) {
        this.changeLocation = false;
        this.location = { latitude: Number(geoname.lat), longitude: Number(geoname.lng) };
        this.selectUBAStation();
        this.formatted_address = geoname.name + ', ' + geoname.adminCodes1.ISO3166_2 + ', ' + geoname.countryCode;
        this.searchFormControl.patchValue(this.formatted_address);
    }

    measurementsSelected(measurements: MeasurementModel[], measurementSelected: string[]) {
        measurements.forEach((measurement) => {
            measurement.is_enabled = false;
            measurementSelected.forEach((value) => {
                if (value === measurement.name_html) {
                    measurement.is_enabled = true;
                }
            });
        });
    }

    getServices(deviceId?: string): Observable<DeviceTypeServiceModel[]> {
        if (deviceId === null || deviceId === undefined) {
            return of([]);
        }
        const device = this.devices.find(x => x.id === deviceId);
        if (device === undefined) {
            return of([]);
        }
        if (this.deviceTypes.has(device.device_type.id)) {
            return of(this.deviceTypes.get(device.device_type.id)?.services || []);
        }
        this.deviceTypes.set(device.device_type.id, {} as DeviceTypeModel);
        return new Observable<DeviceTypeServiceModel[]>(obs => { // need to subscribe in function
            this.deviceTypeService.getDeviceType(device.device_type.id).subscribe(dt => {
                if (dt === null) {
                    obs.next([]);
                    obs.complete();
                    return;
                }
                this.deviceTypes.set(device.device_type.id, dt);
                obs.next(dt.services);
                obs.complete();
            });
        });
    }

    getServiceValues(deviceId?: string, serviceId?: string): string[] {
        if (deviceId === null || deviceId === undefined) {
            return [];
        }
        const device = this.devices?.find(x => x.id === deviceId);
        if (device === undefined) {
            return [];
        }
        const service = this.deviceTypes.get(device.device_type.id)?.services?.find(x => x.id === serviceId);
        if (service === undefined) {
            return [];
        }
        const res: string[] = [];
        service.outputs.forEach(output => res.push(...this.deviceTypeService.getValuePaths(output.content_variable)));
        return res;
    }

    outsideExportChanged(option: MeasurementModel) {
        if (option.outsideExport === null || option.outsideExport === undefined) {
            return;
        }
        option.outsideDeviceValuePath = undefined;
        option.outsideServiceId = undefined;
        option.outsideDeviceValuePath = undefined;
    }

    insideExportChanged(option: MeasurementModel) {
        if (option.export === null || option.export === undefined) {
            return;
        }
        option.insideDeviceValuePath = undefined;
        option.insideServiceId = undefined;
        option.insideDeviceValuePath = undefined;
    }

    outsideDeviceChanged(option: MeasurementModel) {
        if (option.outsideDeviceId === undefined || option.outsideDeviceId === null) {
            return;
        }
        option.outsideExport = undefined;
    }

    insideDeviceChanged(option: MeasurementModel) {
        if (option.insideDeviceId === undefined || option.insideDeviceId === null) {
            return;
        }
        option.export = undefined;
    }

    private selectUBAStation() {
        this.sortUBAStations();
        this.selectClosestUBAStation();
        this.mergeUBAStationCapabilities();
    }

    private selectClosestUBAStation() {
        const closest = this.ubaStations.find((u) => this.ubaBlacklist.indexOf(u.station_id) === -1) || this.invalidUbaStation;
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
        this.ubaService.getUBAStationCapabilities(this.ubaStationSelected.station_id).subscribe((shortNames) => {
            this.measurements.forEach((m) => {
                if (m.short_name !== 'Temp.' && m.short_name !== 'Pressure' && m.short_name !== 'Precipitation') {
                    const idx = shortNames.findIndex((shortName) => m.short_name === shortName);
                    if (idx === -1) {
                        m.can_web = false;
                        m.provider = undefined;
                    } else {
                        m.can_web = true;
                        m.provider = AirQualityExternalProvider.UBA;
                    }
                }
            });
            if (shortNames.length === 0) {
                this.ubaBlacklist.push(this.ubaStationSelected.station_id);
                console.log('Blacklisting uba station ' + this.ubaStationSelected.station_id + ': No data');
                this.ubaStationSelected = this.invalidUbaStation;
                this.selectUBAStation();
            }
        });
    }

    hasValidUBAStation(): boolean {
        return this.ubaStationSelected.station_id !== -1;
    }

    private sortUBAStations() {
        this.ubaStations.forEach(
            (station) =>
                (station.distance = AirQualityEditDialogComponent.latLongDistance(
                    station.station_latitude,
                    station.station_longitude,
                    this.location.latitude,
                    this.location.longitude,
                )),
        );
        this.ubaStations.sort((a, b) => {
            if (!a.distance || !b.distance) {
                return 0;
            }
            return a.distance < b.distance ? -1 : 1;
        });
    }

    autoLocation() {
        this.autoLocationFailed = false;
        this.searchFormControl.setValue('');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.geonamesService
                    .getClosestGeoname(pos.coords.latitude, pos.coords.longitude)
                    .subscribe((geoname) => this.onLocationSelected(geoname));
            },
            (posError) => {
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
            },
        );
    }

    private getImportInstancesOfType(typeId: string): ImportInstancesModel[] {
        return this.importInstances.filter((i) => i.import_type_id === typeId);
    }

    private filterImportInstancesByConfigValue(
        importInstances: ImportInstancesModel[],
        configName: string,
        configValue: any,
        moreAllowed = true,
    ) {
        return importInstances.filter(
            (i) =>
                i.configs.findIndex((c) => {
                    if (c.name !== configName) {
                        return false;
                    }
                    if (moreAllowed && Array.isArray(c.value)) {
                        return c.value.findIndex((v) => v === configValue) !== -1;
                    }
                    return configValue === c.value;
                }) !== -1,
        );
    }

    private getExportsOfImports(importInstances: ImportInstancesModel[]): ExportModel[] {
        const ids = importInstances.map((i) => i.id);
        return this.exports.filter((e) => e.FilterType === 'import_id' && ids.indexOf(e.Filter) !== -1);
    }

    private generateUbaImportInstance(stationId: string): Observable<ImportInstancesModel> {
        return this.importInstancesService.saveImportInstance({
            name: 'AirQuality Widget: ' + this.name + ' (station ' + stationId + ')',
            configs: [
                {
                    name: 'FilterStationIds',
                    value: ['' + +this.ubaStationSelected.station_id],
                },
            ],
            import_type_id: environment.importTypeIdUbaStation,
            generated: true,
        } as ImportInstancesModel);
    }

    private prepareUbaSave(): Observable<null> {
        if (!this.hasValidUBAStation()) {
            // no station -> nothing to do
            return of(null);
        }
        return new Observable<null>((obs) => {
            if (this.widget.properties.ubaInfo === undefined) {
                this.widget.properties.ubaInfo = {};
            }
            this.widget.properties.ubaInfo.stationId = '' + this.ubaStationSelected.station_id;
            let ubaInstances = this.getImportInstancesOfType(environment.importTypeIdUbaStation);
            ubaInstances = this.filterImportInstancesByConfigValue(
                ubaInstances,
                'FilterStationIds',
                '' + this.ubaStationSelected.station_id,
            );
            if (ubaInstances.length === 0) {
                // no matching import instance, generate import and export
                if (
                    this.widget.properties.ubaInfo.importGenerated === true &&
                    this.widget.properties.ubaInfo.importInstanceId !== undefined
                ) {
                    this.importInstancesService.deleteImportInstance(this.widget.properties.ubaInfo.importInstanceId).subscribe();
                }
                this.generateUbaImportInstance(this.widget.properties.ubaInfo.stationId).subscribe((instance) => {
                    if (this.widget.properties.ubaInfo === undefined) {
                        this.widget.properties.ubaInfo = {};
                    }
                    this.widget.properties.ubaInfo.importInstanceId = instance.id;
                    this.widget.properties.ubaInfo.importGenerated = true;
                    this.helperGenerateUbaExport(instance, obs);
                });
            } else {
                // matching import instance found, might need to generate export
                const oldInstance = ubaInstances.find((i) => i.id === this.widget.properties.ubaInfo?.importInstanceId);
                let instance: ImportInstancesModel;
                if (oldInstance !== undefined) {
                    instance = oldInstance;
                } else {
                    if (
                        this.widget.properties.ubaInfo.importGenerated === true &&
                        this.widget.properties.ubaInfo.importInstanceId !== undefined
                    ) {
                        this.importInstancesService.deleteImportInstance(this.widget.properties.ubaInfo.importInstanceId).subscribe();
                    }
                    instance = ubaInstances[0];
                }
                if (this.widget.properties.ubaInfo === undefined) {
                    this.widget.properties.ubaInfo = {};
                }
                this.widget.properties.ubaInfo.importInstanceId = instance.id;
                const matchingExports = this.getExportsOfImports(ubaInstances);
                matchingExports.filter(
                    (e) => e.Values.filter((v) => v.Path === 'value.meta.station_id' && v.Name === 'station_id').length === 1,
                );
                if (matchingExports.length === 0) {
                    this.helperGenerateUbaExport(instance, obs);
                } else {
                    // matching export found, no need to generate anything
                    const oldExport = matchingExports.find((e) => e.ID === this.widget.properties.ubaInfo?.exportId);
                    let exp: ExportModel;
                    if (oldExport !== undefined) {
                        exp = oldExport;
                    } else {
                        if (
                            this.widget.properties.ubaInfo?.exportGenerated === true &&
                            this.widget.properties.ubaInfo?.exportId !== undefined
                        ) {
                            this.cleanMeasurementsExportInfo(this.widget.properties.ubaInfo?.exportId);
                            this.exportService.stopPipelineById(this.widget.properties.ubaInfo.exportId).subscribe();
                        }
                        exp = matchingExports[0];
                    }
                    this.widget.properties.ubaInfo.exportId = exp.ID;
                    this.fillMeasurementsUbaInfo(exp);
                    obs.next();
                    obs.complete();
                }
            }
        });
    }

    /**
     * Cleans measurements from old uba export (if needed), creates a new export and fills measurements
     *
     * @param instance
     * @param obs
     * @private
     */
    private helperGenerateUbaExport(instance: ImportInstancesModel, obs: Subscriber<null>) {
        // clean old export if needed
        if (this.widget.properties.ubaInfo?.exportGenerated === true && this.widget.properties.ubaInfo?.exportId !== undefined) {
            this.cleanMeasurementsExportInfo(this.widget.properties.ubaInfo?.exportId);
            this.exportService.stopPipelineById(this.widget.properties.ubaInfo.exportId).subscribe();
        }
        this.generateExportOfImport(instance, environment.importTypeIdUbaStation).subscribe((exp) => {
            if (this.widget.properties.ubaInfo === undefined) {
                this.widget.properties.ubaInfo = {};
            }
            this.widget.properties.ubaInfo.exportId = exp.ID;
            this.widget.properties.ubaInfo.exportGenerated = true;
            this.fillMeasurementsUbaInfo(exp);
            obs.next();
            obs.complete();
        });
    }

    private fillMeasurementsUbaInfo(exp: ExportModel) {
        this.measurements.forEach((m) => {
            if (m.provider === AirQualityExternalProvider.UBA && !m.has_outside) {
                m.outsideExport = exp;
                m.outsideData.column = exp.Values.find(
                    (v) => v.Path === 'value.measurements.' + m.short_name + '.' + m.short_name + '_value',
                );
            }
        });
    }

    private cleanMeasurementsExportInfo(exportId: string) {
        this.measurements.forEach((m) => {
            if (m.outsideExport?.ID === exportId) {
                m.outsideExport = undefined;
                m.outsideData.column = undefined;
            }
        });
    }

    private prepareDWDSave(): Observable<any> {
        const selectedPollen = this.pollen.filter((p) => p.is_enabled);
        if (selectedPollen.length === 0) {
            if (this.widget.properties.dwdPollenInfo !== undefined) {
                if (
                    this.widget.properties.dwdPollenInfo.importGenerated === true &&
                    this.widget.properties.dwdPollenInfo.importInstanceId !== undefined
                ) {
                    this.importInstancesService.deleteImportInstance(this.widget.properties.dwdPollenInfo.importInstanceId).subscribe();
                }
                this.widget.properties.dwdPollenInfo.importGenerated = undefined;
                this.widget.properties.dwdPollenInfo.importInstanceId = undefined;

                if (
                    this.widget.properties.dwdPollenInfo.exportGenerated === true &&
                    this.widget.properties.dwdPollenInfo.exportId !== undefined
                ) {
                    this.exportService.stopPipelineById(this.widget.properties.dwdPollenInfo.exportId).subscribe();
                }
                this.widget.properties.dwdPollenInfo.exportGenerated = undefined;
                this.widget.properties.dwdPollenInfo.exportId = undefined;
            }
            return of(null);
        } else {
            return new Observable<any>((obs) => {
                let matchingImportInstances = this.getImportInstancesOfType(environment.importTypeIdDwdPollen);
                matchingImportInstances = this.filterImportInstancesByConfigValue(matchingImportInstances, 'lat', this.location.latitude);
                matchingImportInstances = this.filterImportInstancesByConfigValue(matchingImportInstances, 'long', this.location.longitude);
                selectedPollen.forEach(
                    (p) =>
                        (matchingImportInstances = this.filterImportInstancesByConfigValue(
                            matchingImportInstances,
                            'FilterPollen',
                            p.short_name,
                        )),
                );
                if (matchingImportInstances.length === 0) {
                    if (
                        this.widget.properties.dwdPollenInfo?.importGenerated === true &&
                        this.widget.properties.dwdPollenInfo.importInstanceId !== undefined
                    ) {
                        this.importInstancesService.deleteImportInstance(this.widget.properties.dwdPollenInfo.importInstanceId).subscribe();
                    }
                    this.generateDwdImportInstance(this.location.latitude, this.location.longitude, selectedPollen).subscribe(
                        (instance) => {
                            if (this.widget.properties.dwdPollenInfo === undefined) {
                                this.widget.properties.dwdPollenInfo = {};
                            }
                            this.widget.properties.dwdPollenInfo.importInstanceId = instance.id;
                            this.widget.properties.dwdPollenInfo.importGenerated = true;
                            this.helperGenerateDWDExport(instance, obs);
                        },
                    );
                } else {
                    if (this.widget.properties.dwdPollenInfo === undefined) {
                        this.widget.properties.dwdPollenInfo = {};
                    }
                    // matching import instance found, might need to generate export
                    const oldInstance = matchingImportInstances.find(
                        (i) => i.id === this.widget.properties.dwdPollenInfo?.importInstanceId,
                    );
                    let instance: ImportInstancesModel;
                    if (oldInstance !== undefined) {
                        instance = oldInstance;
                    } else {
                        if (
                            this.widget.properties.dwdPollenInfo.importGenerated === true &&
                            this.widget.properties.dwdPollenInfo.importInstanceId !== undefined
                        ) {
                            this.importInstancesService
                                .deleteImportInstance(this.widget.properties.dwdPollenInfo.importInstanceId)
                                .subscribe();
                        }
                        instance = matchingImportInstances[0];
                    }
                    this.widget.properties.dwdPollenInfo.importInstanceId = instance.id;
                    const matchingExports = this.getExportsOfImports(matchingImportInstances);
                    matchingExports.filter(
                        (e) =>
                            e.Values.filter(
                                (v) =>
                                    (v.Path === 'value.pollen' && v.Name === 'pollen') || (v.Path === 'value.today' && v.Name === 'today'),
                            ).length === 3,
                    );
                    if (matchingExports.length === 0) {
                        this.helperGenerateDWDExport(instance, obs);
                    } else {
                        // matching export found, no need to generate anything
                        const oldExport = matchingExports.find((e) => e.ID === this.widget.properties.dwdPollenInfo?.exportId);
                        let exp: ExportModel;
                        if (oldExport !== undefined) {
                            exp = oldExport;
                        } else {
                            if (
                                this.widget.properties.dwdPollenInfo?.exportGenerated === true &&
                                this.widget.properties.dwdPollenInfo?.exportId !== undefined
                            ) {
                                this.exportService.stopPipelineById(this.widget.properties.dwdPollenInfo.exportId).subscribe();
                            }
                            exp = matchingExports[0];
                        }
                        this.widget.properties.dwdPollenInfo.exportId = exp.ID;
                        obs.next();
                        obs.complete();
                    }
                }
            });
        }
    }

    private generateDwdImportInstance(lat: number, long: number, pollen: MeasurementModel[]): Observable<ImportInstancesModel> {
        return this.importInstancesService.saveImportInstance({
            name: 'AirQuality Widget: ' + this.name + ' (lat: ' + lat + ', long: ' + long + ')',
            configs: [
                {
                    name: 'lat',
                    value: lat,
                },
                {
                    name: 'long',
                    value: long,
                },
                {
                    name: 'FilterPollen',
                    value: pollen.map((p) => p.short_name),
                },
            ],
            import_type_id: environment.importTypeIdDwdPollen,
            generated: true,
        } as ImportInstancesModel);
    }

    /**
     * Cleans measurements from old dwd export (if needed), creates a new export and fills measurements
     *
     * @param instance
     * @param obs
     * @private
     */
    private helperGenerateDWDExport(instance: ImportInstancesModel, obs: Subscriber<null>) {
        // clean old export if needed
        if (
            this.widget.properties.dwdPollenInfo?.exportGenerated === true &&
            this.widget.properties.dwdPollenInfo?.exportId !== undefined
        ) {
            this.exportService.stopPipelineById(this.widget.properties.dwdPollenInfo.exportId).subscribe();
        }
        this.generateExportOfImport(instance, environment.importTypeIdDwdPollen).subscribe((exp) => {
            if (this.widget.properties.dwdPollenInfo === undefined) {
                this.widget.properties.dwdPollenInfo = {};
            }
            this.widget.properties.dwdPollenInfo.exportId = exp.ID;
            this.widget.properties.dwdPollenInfo.exportGenerated = true;
            obs.next();
            obs.complete();
        });
    }

    private generateYrImportInstance(): Observable<ImportInstancesModel> {
        return this.importInstancesService.saveImportInstance({
            name: 'AirQuality Widget: ' + this.name + ' (lat: ' + this.location.latitude + ', long: ' + this.location.longitude + ')',
            configs: [
                {
                    name: 'lat',
                    value: this.location.latitude,
                },
                {
                    name: 'long',
                    value: this.location.longitude,
                },
                {
                    name: 'max_forecasts',
                    value: 1,
                },
            ],
            import_type_id: environment.importTypeIdYrForecast,
            generated: true,
        } as ImportInstancesModel);
    }

    private generateExportOfImport(importInstance: ImportInstancesModel, typeId: string): Observable<ExportModel> {
        return this.importTypesService.getImportType(typeId).pipe(
            mergeMap((type) =>
                this.exportService.startPipeline({
                    Offset: 'smallest',
                    Name: 'AirQuality Widget: ' + this.name,
                    Filter: importInstance.id,
                    FilterType: 'import_id',
                    ServiceName: type.name,
                    Values: this.importTypesService.parseImportTypeExportValues(type),
                    EntityName: importInstance.name,
                    Topic: importInstance.kafka_topic,
                    TimePath: 'time',
                    Generated: true,
                } as ExportModel),
            ),
        );
    }

    private prepareYrSave(): Observable<null> {
        return new Observable<null>((obs) => {
            if (this.widget.properties.yrInfo === undefined) {
                this.widget.properties.yrInfo = {};
            }
            let yrInstances = this.getImportInstancesOfType(environment.importTypeIdYrForecast);
            yrInstances = this.filterImportInstancesByConfigValue(yrInstances, 'lat', this.location.latitude);
            yrInstances = this.filterImportInstancesByConfigValue(yrInstances, 'long', this.location.longitude);
            yrInstances = this.filterImportInstancesByConfigValue(yrInstances, 'max_forecasts', 1);
            if (yrInstances.length === 0) {
                // no matching import instance, generate import and export
                if (
                    this.widget.properties.yrInfo.importGenerated === true &&
                    this.widget.properties.yrInfo.importInstanceId !== undefined
                ) {
                    this.importInstancesService.deleteImportInstance(this.widget.properties.yrInfo.importInstanceId).subscribe();
                }
                this.generateYrImportInstance().subscribe((instance) => {
                    if (this.widget.properties.yrInfo === undefined) {
                        this.widget.properties.yrInfo = {};
                    }
                    this.widget.properties.yrInfo.importInstanceId = instance.id;
                    this.widget.properties.yrInfo.importGenerated = true;
                    this.helperGenerateYrExport(instance, obs);
                });
            } else {
                // matching import instance found, might need to generate export
                const oldInstance = yrInstances.find((i) => i.id === this.widget.properties.yrInfo?.importInstanceId);
                let instance: ImportInstancesModel;
                if (oldInstance !== undefined) {
                    instance = oldInstance;
                } else {
                    if (
                        this.widget.properties.yrInfo.importGenerated === true &&
                        this.widget.properties.yrInfo.importInstanceId !== undefined
                    ) {
                        this.importInstancesService.deleteImportInstance(this.widget.properties.yrInfo.importInstanceId).subscribe();
                    }
                    instance = yrInstances[0];
                }
                if (this.widget.properties.yrInfo === undefined) {
                    this.widget.properties.yrInfo = {};
                }
                this.widget.properties.yrInfo.importInstanceId = instance.id;
                const matchingExports = this.getExportsOfImports(yrInstances);
                matchingExports.filter(
                    (e) =>
                        e.Values.filter(
                            (v) =>
                                (v.Path === 'value.instant_air_temperature' && v.Name === 'instant_air_temperature') ||
                                (v.Path === 'value.instant_air_pressure_at_sea_level' && v.Name === 'instant_air_pressure_at_sea_level') ||
                                (v.Path === 'value.instant_relative_humidity' && v.Name === 'instant_relative_humidity') ||
                                (v.Path === 'value.1_hours_precipitation_amount' && v.Name === '1_hours_precipitation_amount'),
                        ).length === 3,
                );
                if (matchingExports.length === 0) {
                    this.helperGenerateYrExport(instance, obs);
                } else {
                    // matching export found, no need to generate anything
                    const oldExport = matchingExports.find((e) => e.ID === this.widget.properties.yrInfo?.exportId);
                    let exp: ExportModel;
                    if (oldExport !== undefined) {
                        exp = oldExport;
                    } else {
                        if (
                            this.widget.properties.yrInfo?.exportGenerated === true &&
                            this.widget.properties.yrInfo?.exportId !== undefined
                        ) {
                            this.cleanMeasurementsExportInfo(this.widget.properties.yrInfo?.exportId);
                            this.exportService.stopPipelineById(this.widget.properties.yrInfo.exportId).subscribe();
                        }
                        exp = matchingExports[0];
                    }
                    this.widget.properties.yrInfo.exportId = exp.ID;
                    this.fillMeasurementsYrInfo(exp);
                    obs.next();
                    obs.complete();
                }
            }
        });
    }

    /**
     * Cleans measurements from old uba export (if needed), creates a new export and fills measurements
     *
     * @param instance
     * @param obs
     * @private
     */
    private helperGenerateYrExport(instance: ImportInstancesModel, obs: Subscriber<null>) {
        // clean old export if needed
        if (this.widget.properties.yrInfo?.exportGenerated === true && this.widget.properties.yrInfo?.exportId !== undefined) {
            this.cleanMeasurementsExportInfo(this.widget.properties.yrInfo?.exportId);
            this.exportService.stopPipelineById(this.widget.properties.yrInfo.exportId).subscribe();
        }
        this.generateExportOfImport(instance, environment.importTypeIdYrForecast).subscribe((exp) => {
            if (this.widget.properties.yrInfo === undefined) {
                this.widget.properties.yrInfo = {};
            }
            this.widget.properties.yrInfo.exportId = exp.ID;
            this.widget.properties.yrInfo.exportGenerated = true;
            this.fillMeasurementsYrInfo(exp);
            obs.next();
            obs.complete();
        });
    }

    private fillMeasurementsYrInfo(exp: ExportModel) {
        this.measurements.forEach((m) => {
            if (m.provider === AirQualityExternalProvider.Yr && !m.has_outside) {
                m.outsideExport = exp;
                let path = '';
                switch (m.short_name) {
                case 'Temp.':
                    path = 'value.instant_air_temperature';
                    break;
                case 'Pressure':
                    path = 'value.instant_air_pressure_at_sea_level';
                    break;
                case 'Hum.':
                    path = 'value.instant_relative_humidity';
                    break;
                case 'Precipitation':
                    path = 'value.1_hours_precipitation_amount';
                    break;
                }
                m.outsideData.column = exp.Values.find((v) => v.Path === path);
            }
        });
    }

    private patchNewMeasurements() {
        this.allMeasurements.forEach((all) => {
            const k = this.measurements.find((known) => known.short_name === all.short_name);
            if (k === undefined) {
                this.measurements.push(all);
            } else if (k.provider === undefined && all.provider !== undefined) {
                k.provider = all.provider;
            }
        });
    }
}
