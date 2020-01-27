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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {FormControl} from '@angular/forms';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/internal/operators';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {ChartsExportMeasurementModel} from '../../charts/export/shared/charts-export-properties.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ExportModel} from '../../../modules/data/export/shared/export.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ExportService} from '../../../modules/data/export/shared/export.service';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';


@Component({
    templateUrl: './energy-prediction-edit-dialog.component.html',
    styleUrls: ['./energy-prediction-edit-dialog.component.css'],
})
export class EnergyPredictionEditDialogComponent implements OnInit {

    formControl = new FormControl('');
    optionsFormControl = new FormControl('');
    thresholdOptionsFormControl = new FormControl('');
    exports: ChartsExportMeasurementModel[] = [];
    filteredExports: Observable<ChartsExportMeasurementModel[]> = new Observable();
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {id: '', name: '', type: '', properties: {}};
    options: string[] = ['Day', 'Month', 'Year'];
    thresholdOptions: string[] = ['Consumption', 'Price'];
    selectedThresholdOption: string;
    selectedOption: string;
    disableSave = false;
    math = '';
    format = '1.3-3';
    unit = 'kWh';
    currency = '€';

    constructor(private dialogRef: MatDialogRef<EnergyPredictionEditDialogComponent>,
                private deploymentsService: DeploymentsService,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.selectedOption = '';
        this.selectedThresholdOption = '';
    }

    ngOnInit() {
        this.getWidgetData();
        this.initDeployments();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.formControl.setValue(this.widget.properties.measurement || '');
            this.selectedOption = this.widget.properties.selectedOption || '';
            this.math = this.widget.properties.math || this.math;
            this.format = this.widget.properties.format || this.format;
            this.unit = this.widget.properties.unit || this.unit;
            this.currency = this.widget.properties.currency || this.currency;
            this.optionsFormControl.setValue(this.selectedOption);
            this.selectedThresholdOption = this.widget.properties.thresholdOption || '';
            this.thresholdOptionsFormControl.setValue(this.selectedThresholdOption);
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
                this.filteredExports = this.formControl.valueChanges
                    .pipe(
                        startWith<string | ChartsExportMeasurementModel>(''),
                        map(value => typeof value === 'string' ? value : value.name),
                        map(name => name ? this._filter(name) : this.exports.slice())
                    );
            }
        });
    }


    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.widget.properties.selectedOption = this.selectedOption;
        this.widget.properties.thresholdOption = this.selectedThresholdOption;
        if (this.widget.properties.columns === undefined) {
            this.widget.properties.columns = {timestamp: '', prediction: '', predictionTotal: ''};
        }
        this.widget.properties.columns.prediction = this.selectedOption + 'Prediction';
        this.widget.properties.columns.predictionTotal = this.selectedOption + 'PredictionTotal';
        this.widget.properties.columns.timestamp = this.selectedOption + 'Timestamp';
        this.widget.properties.math = this.math;
        this.widget.properties.format = this.format;
        this.widget.properties.unit = this.unit;
        this.widget.properties.currency = this.currency;

        if (this.formControl.value) {
            this.widget.properties.measurement = {
                id: this.formControl.value.id,
                name: this.formControl.value.name,
                values: this.formControl.value.values
            };
        }
        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }

    private _filter(value: string): ChartsExportMeasurementModel[] {
        const filterValue = value.toLowerCase();
        return this.exports.filter(option => {
            if (option.name) {
                return option.name.toLowerCase().indexOf(filterValue) === 0;
            }
            return false;
        });
    }

    displayFn(input?: ChartsExportMeasurementModel): string | undefined {
        return input ? input.name : undefined;
    }

    autoCompleteClosed() {
        if (typeof this.formControl.value === 'string') {
            this.disableSave = true;
            this.formControl.setErrors({'valid': false});
        } else {
            this.disableSave = false;
            this.formControl.updateValueAndValidity();
        }

    }
}
