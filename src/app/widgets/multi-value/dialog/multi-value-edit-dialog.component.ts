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
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportMeasurementModel } from '../../charts/export/shared/charts-export-properties.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ExportModel, ExportResponseModel, ExportValueModel } from '../../../modules/exports/shared/export.model';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { MultiValueMeasurement, MultiValueOrderEnum } from '../shared/multi-value.model';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { emptyObjectValidator } from '../../../core/validators/empty-object.validator';
import { forkJoin, Observable } from 'rxjs';

@Component({
    templateUrl: './multi-value-edit-dialog.component.html',
    styleUrls: ['./multi-value-edit-dialog.component.css'],
})
export class MultiValueEditDialogComponent implements OnInit {
    exports: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    orderValues = MultiValueOrderEnum;
    step = -1;

    formGroup = this.fb.group({
        name: ['', Validators.required],
        order: ['', Validators.required],
        valueAlias: [''],
        measurements: this.fb.array([]),
    });

    userHasUpdateNameAuthorization: boolean = false
    userHasUpdatePropertiesAuthorization: boolean = false 

    constructor(
        private dialogRef: MatDialogRef<MultiValueEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        private exportService: ExportService,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) data: { 
            dashboardId: string; 
            widgetId: string, 
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean 
        },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization
    }

    ngOnInit() {
        this.getWidgetData();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            const measurements = this.widget.properties.multivaluemeasurements || [];
            this.initDeployments();
            (this.formGroup.get('name') as FormControl).setValue(widget.name);
            (this.formGroup.get('order') as FormControl).setValue(widget.properties.order || 0);
            (this.formGroup.get('valueAlias') as FormControl).setValue(widget.properties.valueAlias);

            measurements.forEach((measurement) => this.addMeasurement(measurement));

            if (measurements.length === 0) {
                this.addNewMeasurement();
            }
        });
    }

    getMeasurements(): FormArray {
        return this.formGroup.get('measurements') as FormArray;
    }

    getMeasurement(index: number): FormGroup {
        return this.getMeasurements().controls[index] as FormGroup;
    }

    getWarningGroup(index: number): FormGroup {
        return this.getMeasurement(index).get('warnings') as FormGroup;
    }

    boundaryValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
        const lower = control.get('lowerBoundary') as FormControl;
        const upper = control.get('upperBoundary') as FormControl;

        // Check if warning are enabled
        if ((control.get('warning_enabled') as FormControl).value === false) {
            lower.setErrors(null);
            upper.setErrors(null);
            return null;
        }

        // Check if at least one boundary is set
        const lowerHasValue = MultiValueEditDialogComponent.hasValue(lower);
        const upperHasValue = MultiValueEditDialogComponent.hasValue(upper);
        if (!lowerHasValue && !upperHasValue) {
            lower.setErrors({ nothingSelected: true });
            upper.setErrors({ nothingSelected: true });
            return { nothingSelected: true };
        }

        // Check if only one value is set
        if ((lowerHasValue && !upperHasValue) || (!lowerHasValue && upperHasValue)) {
            lower.setErrors(null);
            upper.setErrors(null);
            return null;
        }

        // Check if lower is bigger than upper
        const lowerValue = Number(lower.value);
        const upperValue = Number(upper.value);

        if (lowerValue > upperValue) {
            lower.setErrors({ lowerBiggerThanUpper: true });
            upper.setErrors({ lowerBiggerThanUpper: true });
            return { lowerBiggerThanUpper: true };
        }

        // Both lower and upper are set and lower is smaller than upper
        lower.setErrors(null);
        upper.setErrors(null);
        return null;
    };

    mathValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
        let value = control.value as string;
        if (value === null || value === '') {
            return null;
        }
        value = value.replace(',', '.').replace(' ', '');
        const rx = new RegExp('^(\\+|-|\\*|/)\\d+((\\.|,)\\d+)?$');
        if (!rx.test(value)) {
            return { mathInvalid: true };
        }
        return null;
    };

    private static hasValue(control: FormControl) {
        return control.value !== null && control.value !== '';
    }

    addMeasurement(measurement: MultiValueMeasurement) {
        const disableNumberOperations = measurement.type === 'String' || measurement.type === '' || measurement.type === 'Boolean';
        const disableUnit = measurement.type === 'Boolean';
        const warningDisabled = measurement.warning_enabled !== true;
        let lower: any = measurement.lowerBoundary;
        let upper: any = measurement.upperBoundary;
        if (lower === Number.MIN_VALUE) {
            lower = '';
        }
        if (upper === Number.MAX_VALUE) {
            upper = '';
        }
        const newGroup = this.fb.group({
            name: [measurement.name, Validators.required],
            export: [measurement.export, emptyObjectValidator()],
            column: [measurement.column, emptyObjectValidator()],
            unit: [{ value: measurement.unit, disabled: disableUnit }],
            type: [measurement.type, Validators.required],
            format: [measurement.format],
            math: [{ value: measurement.math, disabled: disableNumberOperations }, this.mathValidator],
            warnings: this.fb.group(
                {
                    warning_enabled: [{ value: measurement.warning_enabled, disabled: disableNumberOperations }],
                    lowerBoundary: [{ value: lower, disabled: warningDisabled }],
                    upperBoundary: [{ value: upper, disabled: warningDisabled }],
                },
                { validators: [this.boundaryValidator] },
            ),
        });

        (newGroup.get('column') as FormControl).valueChanges.subscribe(() => {
            if (!(newGroup.get('name') as FormControl).valid && (newGroup.get('column') as FormControl).valid) {
                newGroup.patchValue({
                    name:
                        ((newGroup.get('export') as FormControl).value as ChartsExportMeasurementModel).name +
                        ' - ' +
                        ((newGroup.get('column') as FormControl).value as ExportValueModel).Name,
                });
            }
        });

        (newGroup.get('type') as FormControl).valueChanges.subscribe(() => {
            const type = (newGroup.get('type') as FormControl).value;
            const disableNumberOperationsChange = type === 'String' || type === '' || type === 'Boolean';
            const disableUnitChange = type === 'Boolean';

            if (disableNumberOperationsChange) {
                const warnGroup = newGroup.get('warnings') as FormGroup;

                (warnGroup.get('warning_enabled') as FormControl).setValue(false);
                (warnGroup.get('warning_enabled') as FormControl).disable();

                (newGroup.get('math') as FormControl).setValue('');
                (newGroup.get('math') as FormControl).disable();
            } else {
                ((newGroup.get('warnings') as FormGroup).get('warning_enabled') as FormControl).enable();
                (newGroup.get('math') as FormControl).enable();
            }

            const unitFormControl = newGroup.get('unit') as FormControl;
            if (disableUnitChange) {
                unitFormControl.disable();
            } else {
                unitFormControl.enable();
            }
        });

        ((newGroup.get('warnings') as FormGroup).get('warning_enabled') as FormControl).valueChanges.subscribe(() => {
            const warnGroup = newGroup.get('warnings');
            if (warnGroup === null) {
                return;
            }
            const warningEnabled = (warnGroup.get('warning_enabled') as FormControl).value === true;

            if (!warningEnabled) {
                (warnGroup.get('lowerBoundary') as FormControl).setValue('');
                (warnGroup.get('lowerBoundary') as FormControl).disable();
                (warnGroup.get('upperBoundary') as FormControl).setValue('');
                (warnGroup.get('upperBoundary') as FormControl).disable();
            } else if (warningEnabled) {
                (warnGroup.get('lowerBoundary') as FormControl).enable();
                (warnGroup.get('upperBoundary') as FormControl).enable();
            }
        });

        this.getMeasurements().push(newGroup);
    }

    initDeployments() {
        this.exportService.getExports(true, '', 9999, 0, 'name', 'asc').subscribe((exports: ExportResponseModel | null) => {
            if (exports !== null) {
                exports.instances?.forEach((exportModel: ExportModel) => {
                    if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                        this.exports.push({ id: exportModel.ID, name: exportModel.Name, values: exportModel.Values });
                    }
                });
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    updateName(): Observable<DashboardResponseMessageModel> {
        var newName = (this.formGroup.get('name') as FormControl).value;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName)
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        const measurements: MultiValueMeasurement[] = [];
        this.getMeasurements().controls.forEach((control, index) => {
            const warnGroup = this.getWarningGroup(index);
            const m = {
                name: (control.get('name') as FormControl).value,
                type: (control.get('type') as FormControl).value,
                format: (control.get('format') as FormControl).value,
                export: (control.get('export') as FormControl).value,
                column: (control.get('column') as FormControl).value,
                unit: (control.get('unit') as FormControl).value,
                math: (control.get('math') as FormControl).value,
                lowerBoundary: (warnGroup.get('lowerBoundary') as FormControl).value || Number.MIN_VALUE,
                upperBoundary: (warnGroup.get('upperBoundary') as FormControl).value || Number.MAX_VALUE,
                warning_enabled: (warnGroup.get('warning_enabled') as FormControl).value,
            } as MultiValueMeasurement;
            measurements.push(m);
        });
        this.widget.properties.multivaluemeasurements = measurements;
        this.widget.properties.order = (this.formGroup.get('order') as FormControl).value;
        this.widget.properties.valueAlias = (this.formGroup.get('valueAlias') as FormControl).value;
        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties)
    }

    save(): void {
        var obs = []
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName())
        }
        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties())
        }        
        
        forkJoin(obs).subscribe(responses => {
            var errorOccured = responses.find((response) => response.message != "OK")
            if(!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        })
    }

    addNewMeasurement() {
        const m: MultiValueMeasurement = {
            name: '',
            column: {} as ExportValueModel,
            type: '',
            format: '',
            unit: '',
            export: {} as ChartsExportMeasurementModel,
            math: '',
            warning_enabled: false,
        };
        this.addMeasurement(m);
        this.step = this.getMeasurements().controls.length - 1;
    }

    getMathWarningTooltip(index: number): string {
        const fg = this.getMeasurement(index);
        const type = fg.get('type') as FormControl;
        const math = fg.get('math') as FormControl;
        if (type.valid && math.disabled) {
            return 'Math don\'t work with String type';
        }
        if (math.errors) {
            return 'Math invalid: only works with +-*/ and a single number';
        }
        return '';
    }

    getBoundaryWarningTooltip(index: number): string {
        const wg = this.getWarningGroup(index);
        const warningEnabled = wg.get('warning_enabled') as FormControl;
        if (warningEnabled.value === true && wg.invalid) {
            if (wg.getError('lowerBiggerThanUpper') !== undefined) {
                return 'Lower boundary can\'t be bigger than upper boundary';
            }
            if (wg.getError('nothingSelected') !== undefined) {
                return 'Set at least one value';
            }
        }
        if (warningEnabled.disabled && (this.getMeasurement(index).get('type') as FormControl).valid) {
            return 'Warnings don\'t work with String type';
        }
        return '';
    }

    compare(a: any, b: any) {
        return a.InstanceID === b.InstanceID && a.Name === b.Name && a.Path === b.Path;
    }

    compareStrings(a: any, b: any) {
        return a === b;
    }

    removeTab(index: number) {
        this.getMeasurements().controls.splice(index, 1);
        this.step = index - 1;
    }

    compareExports(a: any, b: any): boolean {
        if (a.id && b.id) {
            return a.id === b.id;
        }
        return false;
    }

    moveUp(index: number) {
        this.changePosition(index, true);
    }

    moveDown(index: number) {
        this.changePosition(index, false);
    }

    changePosition(index: number, isUp: boolean) {
        const removed = this.getMeasurement(index);
        this.getMeasurements().controls.splice(index, 1);
        if (isUp) {
            this.getMeasurements().controls.splice(index - 1, 0, removed);
        } else {
            this.getMeasurements().controls.splice(index + 1, 0, removed);
        }
    }
}
