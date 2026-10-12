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

import { Component, NgZone, OnInit, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportMeasurementModel } from '../../charts/export/shared/charts-export-properties.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ExportModel, ExportResponseModel, ExportValueModel } from '../../../modules/exports/shared/export.model';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { AirQualityExternalProvider, Location, MeasurementModel } from '../shared/air-quality.model';
import { createMeasurementCatalogue, createPollenCatalogue } from '../shared/air-quality-catalogue';
import { AirQualityProvisioningService, AirQualitySaveStepError } from '../shared/air-quality-provisioning.service';
import { UBAService } from '../shared/uba.service';
import { DWDPollenService } from '../shared/dwd-pollen.service';
import { UBAStation } from '../shared/uba.model';
import { GeonamesService } from '../shared/geonames.service';
import { Geoname } from '../shared/geonames.model';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, map, tap } from 'rxjs/operators';
import { forkJoin, from, Observable, of, concatMap } from 'rxjs';
import { NameValuePair } from '../shared/dwd-pollen.model';
import { ImportInstancesService } from '../../../modules/imports/import-instances/shared/import-instances.service';
import { ImportInstancesModel } from '../../../modules/imports/import-instances/shared/import-instances.model';
import { DeviceInstanceModel } from '../../../modules/devices/device-instances/shared/device-instances.model';
import {
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../core/directives/close-mtx-select-on-scroll.directive';
import { WidgetSpinnerComponent } from '../../components/widget-spinner/widget-spinner.component';
import { MatStepper, MatStep, MatStepperNext, MatStepperPrevious } from '@angular/material/stepper';
import { MatFormField, MatLabel, MatError, MatHint, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../core/directives/matError.directive';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatAutocompleteTrigger, MatAutocomplete } from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription, MatExpansionPanelContent } from '@angular/material/expansion';
import { MatDivider } from '@angular/material/divider';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatList, MatListItem } from '@angular/material/list';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackError } from '../../../core/services/snack-bar-messages';

@Component({
    templateUrl: './air-quality-edit-dialog.component.html',
    styleUrls: ['./air-quality-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    providers: [AirQualityProvisioningService],
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, WidgetSpinnerComponent, MatStepper, MatStep, MatFormField, MatLabel, MatInput, FormsModule, MatError, MatErrorMessagesDirective, MatButton, MatStepperNext, MatIconButton, MatIcon, MatAutocompleteTrigger, ReactiveFormsModule, MatAutocomplete, MatOption, MatHint, MatTooltip, MatStepperPrevious, MtxSelect, MtxOption, MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription, MatExpansionPanelContent, MatDivider, MatSlideToggle, MatSuffix, MatList, MatListItem, MatDialogActions, AsyncPipe, DecimalPipe]
})
export class AirQualityEditDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<AirQualityEditDialogComponent>>(MatDialogRef);
    private deploymentsService = inject(DeploymentsService);
    private dashboardService = inject(DashboardService);
    private exportService = inject(ExportService);
    private ngZone = inject(NgZone);
    private ubaService = inject(UBAService);
    private dwdPollenService = inject(DWDPollenService);
    private geonamesService = inject(GeonamesService);
    private importInstancesService = inject(ImportInstancesService);
    private deviceInstancesService = inject(DeviceInstancesService);
    private deviceTypeService = inject(DeviceTypeService);
    private destroyRef = inject(DestroyRef);
    private snackBar = inject(MatSnackBar);
    private provisioning = inject(AirQualityProvisioningService);

    constructor() {
        const dwdPollenService = this.dwdPollenService;
        const data = inject<{
            dashboardId: string;
            widgetId: string;
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean;
        }>(MAT_DIALOG_DATA);

        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
        this.geonamesSearchResults = from([]);
        this.pollenLevel = dwdPollenService.getNameValuePairs();
        this.provisioning.bind(this);
    }

    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    exports: ExportModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    disableSave = false;
    changeLocation = false;
    name = ' ';
    measurements: MeasurementModel[] = [];
    allMeasurements: MeasurementModel[] = createMeasurementCatalogue();
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
    pollen: MeasurementModel[] = createPollenCatalogue();
    pollenLevel: NameValuePair[];
    pollenSelected: string[] = [];
    geonamesSearchResults: Observable<Geoname[]>;
    searchFormControl = new FormControl();
    importInstances: ImportInstancesModel[] = [];
    ready = false;
    devices: DeviceInstanceModel[] = [];
    deviceTypes: Map<string, DeviceTypeModel> = new Map();

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
        this.exportService.getExports(true, '', 9999, 0, 'name', 'asc', undefined, undefined).subscribe((exports: ExportResponseModel | null) => {
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
            this.deviceInstancesService.getDeviceInstances({limit: 9999, offset: 0}).pipe(
                map((resp) => {
                    this.devices = resp.result;
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
                takeUntilDestroyed(this.destroyRef),
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

    updateName(): Observable<DashboardResponseMessageModel> {
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, this.name);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        return this.provisioning.prepareSave().pipe(
            concatMap((_) => {
                this.widget.properties.version = 4; // can use devices and queries timescale
                this.widget.properties.measurements = this.measurements;
                this.widget.properties.location = this.location;
                this.widget.properties.formatted_address = this.formatted_address;
                this.widget.properties.pollen = this.pollen;
                return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties).pipe(
                    tap((response) => {
                        // independent of the name update: once the properties are persisted the old resources are unused
                        if (response.message === 'OK') {
                            this.provisioning.runPendingCleanup();
                        }
                    }),
                );
            })
        );
    }

    save(): void {
        this.ready = false;
        const obs = [];
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }

        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties());
        }
        forkJoin(obs).subscribe({
            next: (responses) => {
                const errorOccured = responses.find((response) => response.message != 'OK');
                if(!errorOccured) {
                    this.dialogRef.close(this.widget);
                } else {
                    this.ready = true;
                }
            },
            error: (err: unknown) => {
                // the dialog stays open; the spinner would otherwise never go away
                this.ready = true;
                if (err instanceof AirQualitySaveStepError) {
                    snackError(this.snackBar, 'Could not create the ' + err.step + ' for ' + err.provider + ', the widget was not saved');
                } else {
                    snackError(this.snackBar, 'Could not save the widget');
                }
            },
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
        this.autoLocationFailed = false;
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
        if (this.deviceTypes.has(device.device_type_id)) {
            return of(this.deviceTypes.get(device.device_type_id)?.services || []);
        }
        this.deviceTypes.set(device.device_type_id, {} as DeviceTypeModel);
        return new Observable<DeviceTypeServiceModel[]>(obs => { // need to subscribe in function
            this.deviceTypeService.getDeviceType(device.device_type_id).subscribe(dt => {
                if (dt === null) {
                    obs.next([]);
                    obs.complete();
                    return;
                }
                this.deviceTypes.set(device.device_type_id, dt);
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
        const service = this.deviceTypes.get(device.device_type_id)?.services?.find(x => x.id === serviceId);
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
