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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { AbstractControl, FormBuilder, ValidatorFn, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportMeasurementModel } from '../../charts/export/shared/charts-export-properties.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ExportModel, ExportResponseModel, ExportValueModel } from '../../../modules/exports/shared/export.model';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { saveWidgetEdits } from '../../../modules/dashboard/shared/save-widget-edits';
import { chartsExportMeasurementModelValidator } from '../../charts/export/shared/chartsExportMeasurementModel.validator';
import { EnergyPredictionRequirementsService } from '../shared/energy-prediction-requirements.service';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../core/directives/matError.directive';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './energy-prediction-edit-dialog.component.html',
    styleUrls: ['./energy-prediction-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MtxOption, MatHint, MatDialogActions, MatButton]
})
export class EnergyPredictionEditDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<EnergyPredictionEditDialogComponent>>(MatDialogRef);
    private deploymentsService = inject(DeploymentsService);
    private dashboardService = inject(DashboardService);
    private exportService = inject(ExportService);
    private formBuilder = inject(FormBuilder);

    exports: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    options: string[] = ['Day', 'Month', 'Year'];
    thresholdOptions: string[] = ['Consumption', 'Price'];

    form = this.formBuilder.group({
        name: ['', Validators.required],
        export: this.formBuilder.control<ChartsExportMeasurementModel | string | null | undefined>('', [Validators.required, chartsExportMeasurementModelValidator()]),  // , EnergyPredictionEditDialogComponent.estimationExportValidator()]],
        math: [''],
        unit: ['kWh'],
        predictionType: ['', Validators.required],
        numberFormat: ['1.3-3'],
        pricePerUnit: this.formBuilder.control<number | string | null | undefined>('', Validators.required),
        currency: ['€'],
        thresholdOption: ['', Validators.required],
        threshold: this.formBuilder.control<number | string | null | undefined>('', Validators.required),
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

    constructor() {
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
        const newName =  this.form.get('name')?.value as string;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        this.widget.properties.selectedOption = this.form.get('predictionType')?.value as string | undefined;
        this.widget.properties.thresholdOption = this.form.get('thresholdOption')?.value as string | undefined;
        if (this.widget.properties.columns === undefined) {
            this.widget.properties.columns = { timestamp: '', prediction: '', predictionTotal: '' };
        }
        this.widget.properties.columns.prediction = this.form.get('predictionType')?.value + 'Prediction';
        this.widget.properties.columns.predictionTotal = this.form.get('predictionType')?.value + 'PredictionTotal';
        this.widget.properties.columns.timestamp = this.form.get('predictionType')?.value + 'Timestamp';
        this.widget.properties.math = this.form.get('math')?.value as string | undefined;
        this.widget.properties.format = this.form.get('numberFormat')?.value as string | undefined;
        this.widget.properties.unit = this.form.get('unit')?.value as string | undefined;
        this.widget.properties.currency = this.form.get('currency')?.value as string | undefined;
        this.widget.properties.price = this.form.get('pricePerUnit')?.value as number | undefined;
        this.widget.properties.threshold = this.form.get('threshold')?.value as number | undefined;
        this.widget.properties.measurement = this.form.get('export')?.value as ChartsExportMeasurementModel | undefined;

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
        saveWidgetEdits(obs).subscribe(() => {
            this.dialogRef.close(this.widget);
        });
    }

    displayFn(input?: ChartsExportMeasurementModel): string {
        return input ? input.name : '';
    }
}
