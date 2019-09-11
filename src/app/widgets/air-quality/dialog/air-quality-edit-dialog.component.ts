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

import {Component, Inject, NgZone, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {ChartsExportMeasurementModel} from '../../charts/export/shared/charts-export-properties.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ExportModel, ExportValueModel} from '../../../modules/data/export/shared/export.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ExportService} from '../../../modules/data/export/shared/export.service';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { } from 'googlemaps';
import { MapsAPILoader } from '@agm/core';
import {Location} from '@angular-material-extensions/google-maps-autocomplete';
import PlaceResult = google.maps.places.PlaceResult;
import {MeasurementModel, SensorDataModel} from '../shared/air-quality.model';

@Component({
    templateUrl: './air-quality-edit-dialog.component.html',
    styleUrls: ['./air-quality-edit-dialog.component.css'],
})
export class AirQualityEditDialogComponent implements OnInit {
    exports: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {id: '', name: '', type: '', properties: {}};
    disableSave = false;
    changeLocation = false;
    name = ' ';
    emptyExportValueModel: ExportValueModel = {InstanceID: '', Name: '',    Path: '', Type: ''};
    emptyDataModel: SensorDataModel = {column: this.emptyExportValueModel, value: 0};
    measurements: MeasurementModel[] = [
        {name_html: 'PM10',
            description_html: 'Particulate matter up to 10μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 40}, critical: {lower: 0, upper: 50}}},
        {name_html: 'PM2.5',
            description_html: 'Particulate matter up to 2.5μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 25}, critical: {lower: 0, upper: 30}}},
        {name_html: 'PM1',
            description_html: 'Particulate matter up to 2.5μm',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 0}, critical: {lower: 0, upper: 0}}},
        {name_html: 'CO<sub>2</sub>',
            description_html: 'Carbon Dioxide',
            unit_html: 'ppm',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 1000}, critical: {lower: 0, upper: 5000}}},
        {name_html: 'O<sub>2</sub>',
            description_html: 'Oxygen',
            unit_html: '%',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 19, upper: 21}, critical: {lower: 18, upper: 25}}},
        {name_html: 'SO<sub>2</sub>',
            description_html: 'Sulfur Dioxide',
            unit_html: 'ppm',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 0}, critical: {lower: 1, upper: 0}}},
        {name_html: 'CH<sub>4</sub>',
            description_html: 'Methane',
            unit_html: '%', data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 0}, critical: {lower: 1, upper: 0}}},
        {name_html: 'NO<sub>2</sub>',
            description_html: 'Nitrogen Dioxide',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 40}, critical: {lower: 0, upper: 200}}},
        {name_html: 'CO',
            description_html: 'Carbon Monoxide',
            unit_html: 'mg/m<sup>3</sup>',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 8}, critical: {lower: 0, upper: 35}}},
        {name_html: 'O<sub>3</sub>',
            description_html: 'Ozone',
            unit_html: 'μg/m<sup>3</sup>',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 0}, critical: {lower: 0, upper: 180}}},
        {name_html: 'Rn',
            description_html: 'Radon',
            unit_html: 'Bq/m<sup>3</sup>',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 250}, critical: {lower: 0, upper: 1000}}},
        {name_html: 'Hum.',
            description_html: 'relative Humidity',
            unit_html: '%',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 40, upper: 50}, critical: {lower: 30, upper: 70}}},
        {name_html: 'Temp.',
            description_html: 'Temperature',
            unit_html: '°C',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 20, upper: 22}, critical: {lower: 18, upper: 26}}},
        {name_html: 'Noise',
            unit_html: 'dB',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 40}, critical: {lower: 0, upper: 65}}},
        {name_html: 'VOC',
            description_html: 'Volatile Organic Compounds',
            unit_html: 'mg/m<sup>3</sup>',
            data: this.emptyDataModel,
            boundaries: {warn: {lower: 0, upper: 1}, critical: {lower: 0, upper: 10}}},
    ];
    measurementSelected: string[] = [];
    location: Location = new class implements Location {
        latitude = 0;
        longitude = 0;
    };
    formatted_address = ' ';

    constructor(private dialogRef: MatDialogRef<AirQualityEditDialogComponent>,
                private deploymentsService: DeploymentsService,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                private mapsAPILoader: MapsAPILoader,
                private ngZone: NgZone,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.getWidgetData();
        this.initDeployments();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            console.log(widget); // TODO
            this.widget = widget;
            this.measurements = widget.properties.measurements ? widget.properties.measurements : this.measurements;
            this.location = widget.properties.location ? widget.properties.location : this.location;
            if (widget.properties.formatted_address === undefined) {
                this.changeLocation = true;
            } else {
                this.formatted_address = widget.properties.formatted_address;
            }
            this.name = widget.name;
            this.measurements.forEach(measurement => {
                if (measurement.is_enabled) {
                    this.measurementSelected.push(measurement.name_html);
                }
            });
        });
    }

    initDeployments() {
        this.exportService.getExports().subscribe((exports: (ExportModel[] | null)) => {
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

        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }


    displayFn(input?: ChartsExportMeasurementModel): string | undefined {
        return input ? input.name : undefined;
    }

    compare(a: any, b: any) {
        if (a === undefined && b === undefined) {
            return true;
        }
        if (a === undefined || b === undefined) {
            return false;
        }
        if (a.InstanceID !== undefined || b.InstanceID !== undefined) {
            return a.InstanceID === b.InstanceID && a.Name === b.Name && a.Path === b.Path;
        }
        return a.id === b.id;
    }


    onLocationSelected(location: Location) {
        this.location = location;
    }

    onAutocompleteSelected(result: PlaceResult) {
        this.changeLocation = false;
        this.formatted_address = result.formatted_address as string;
    }

    measurementsSelected() {
        this.measurements.forEach(measurement => {
            measurement.is_enabled = false;
            this.measurementSelected.forEach(value => {
                if (value === measurement.name_html) {
                    measurement.is_enabled = true;
                }
            });
        });
    }

    changeLocationButtonClicked() {
        this.changeLocation = true;
    }

    trackByIndex(index: number, obj: any): any {
        console.log(obj); // TODO
        return index;
    }
}
