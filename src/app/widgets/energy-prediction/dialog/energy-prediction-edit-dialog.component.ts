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

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AbstractControl, FormControl, UntypedFormBuilder, ValidatorFn, Validators } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportMeasurementModel } from '../../charts/export/shared/charts-export-properties.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ExportModel, ExportResponseModel, ExportValueModel } from '../../../modules/exports/shared/export.model';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { chartsExportMeasurementModelValidator } from '../../charts/export/shared/chartsExportMeasurementModel.validator';
import { EnergyPredictionRequirementsService } from '../shared/energy-prediction-requirements.service';

@Component({
    templateUrl: './energy-prediction-edit-dialog.component.html',
    styleUrls: ['./energy-prediction-edit-dialog.component.css'],
})
export class EnergyPredictionEditDialogComponent implements OnInit {
    exports: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    options: string[] = ['Day', 'Month', 'Year'];
    thresholdOptions: string[] = ['Consumption', 'Price'];

    form = this.formBuilder.group({
        name: ['', Validators.required],
        export: ['', [Validators.required, chartsExportMeasurementModelValidator()]],  // , EnergyPredictionEditDialogComponent.estimationExportValidator()]],
        math: [''],
        unit: ['kWh'],
        predictionType: ['', Validators.required],
        numberFormat: ['1.3-3'],
        pricePerUnit: ['', Validators.required],
        currency: ['€'],
        thresholdOption: ['', Validators.required],
        threshold: ['', Validators.required],
    });

    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;

    private static estimationExportValidator(): ValidatorFn {
        return (control: AbstractControl): { [key: string]: any } | null => {
            const values: ExportValueModel[] = control.value.values;
            return EnergyPredictionRequirementsService.exportHasRequiredValues(values)
                ? null
                : { isEstimationExport: { value: control.value } };
        };
    }

    constructor(
        private dialogRef: MatDialogRef<EnergyPredictionEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        private exportService: ExportService,
        private formBuilder: UntypedFormBuilder,
        @Inject(MAT_DIALOG_DATA) data: {
            dashboardId: string;
            widgetId: string;
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean;
        },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
    }

    ngOnInit() {
        this.getWidgetData();
        this.initDeployments();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.form.patchValue({
                name: widget.name,
                export: widget.properties.measurement,
                math: widget.properties.math,
                unit: widget.properties.unit || this.form.get('unit')?.value,
                predictionType: widget.properties.selectedOption,
                numberFormat: widget.properties.format || this.form.get('numberFormat')?.value,
                pricePerUnit: widget.properties.price,
                currency: widget.properties.currency || this.form.get('currency')?.value,
                thresholdOption: widget.properties.thresholdOption,
                threshold: widget.properties.threshold,
            });
        });
    }

    initDeployments() {
        this.exportService.getExports(true, '', 9999, 0, 'name', 'asc', undefined, undefined).subscribe((exports: ExportResponseModel | null) => {
            if (exports !== null) {
                const tmp: ChartsExportMeasurementModel[] = [];
                exports.instances?.forEach((exportModel: ExportModel) => {
                    if (
                        exportModel.ID !== undefined &&
                        exportModel.Name !== undefined &&
                        EnergyPredictionRequirementsService.exportHasRequiredValues(exportModel.Values)
                    ) {
                        tmp.push({ id: exportModel.ID, name: exportModel.Name, values: exportModel.Values, exportDatabaseId: exportModel.ExportDatabaseID });
                    }
                });
                this.exports = tmp;
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }


    updateName(): Observable<DashboardResponseMessageModel> {
        const newName =  this.form.get('name')?.value;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        this.widget.properties.selectedOption = this.form.get('predictionType')?.value;
        this.widget.properties.thresholdOption = this.form.get('thresholdOption')?.value;
        if (this.widget.properties.columns === undefined) {
            this.widget.properties.columns = { timestamp: '', prediction: '', predictionTotal: '' };
        }
        this.widget.properties.columns.prediction = this.form.get('predictionType')?.value + 'Prediction';
        this.widget.properties.columns.predictionTotal = this.form.get('predictionType')?.value + 'PredictionTotal';
        this.widget.properties.columns.timestamp = this.form.get('predictionType')?.value + 'Timestamp';
        this.widget.properties.math = this.form.get('math')?.value;
        this.widget.properties.format = this.form.get('numberFormat')?.value;
        this.widget.properties.unit = this.form.get('unit')?.value;
        this.widget.properties.currency = this.form.get('currency')?.value;
        this.widget.properties.price = this.form.get('pricePerUnit')?.value;
        this.widget.properties.threshold = this.form.get('threshold')?.value;
        this.widget.properties.measurement = this.form.get('export')?.value;

        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties);
    }

    save(): void {
        const obs = [];
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }
        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties());
        }
        forkJoin(obs).subscribe(responses => {
            const errorOccured = responses.find((response) => response.message != 'OK');
            if(!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        });
    }

    displayFn(input?: ChartsExportMeasurementModel): string {
        return input ? input.name : '';
    }
}
