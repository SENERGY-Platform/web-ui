/*
 * Copyright 2025 InfAI (CC SES)
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

import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { forkJoin, Observable, map, concatMap } from 'rxjs';
import { DashboardResponseMessageModel } from 'src/app/modules/dashboard/shared/dashboard-response-message.model';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { ExportModel, ExportResponseModel } from 'src/app/modules/exports/shared/export.model';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { ChartsExportMeasurementModel } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';
import { PVPredictionNextValue, PVPredictionProperties } from '../../shared/prediction.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { WidgetSpinnerComponent } from '../../../components/widget-spinner/widget-spinner.component';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-edit',
    templateUrl: './edit.component.html',
    styleUrls: ['./edit.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, WidgetSpinnerComponent, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MatCheckbox, MtxOption, MatDialogActions, MatButton]
})
export class PVPredictionEditComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<PVPredictionEditComponent>>(MatDialogRef);
    private exportService = inject(ExportService);
    private dashboardService = inject(DashboardService);
    private formBuilder = inject(FormBuilder);
    private destroyRef = inject(DestroyRef);

    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    form = this.formBuilder.group({
        name: ['', Validators.required],
        export: this.formBuilder.control<ChartsExportMeasurementModel | string | null | undefined>(''),
        displayTimeline: [false],
        displayNextValue: [false],
        nextValueConfig: this.formBuilder.group({
            time: this.formBuilder.control<number | string | null>(''),
            level: ['']
        })
    });
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    exports: ChartsExportMeasurementModel[] = [];
    ready = false;

    levels = [
        {
            name: 'Hours',
            value: 'h'
        },
        {
            name: 'Days',
            value: 'd'
        }
    ];

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

    close(): void {
        this.dialogRef.close(this.widget);
    }

    ngOnInit() {
        this.getAvailableExports().pipe(
            concatMap((_) => this.getWidgetData())
        ).subscribe({
            next: (_) => {
                this.ready = true;
            },
            error: (_) => {
                this.ready = true;
            }
        });

        this.setupToggle();
    }

    setupToggle() {
        this.form.controls.displayTimeline.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (value) => {
                if(value) {
                    this.form.controls.displayNextValue.patchValue(false);
                }
            }
        });
        this.form.controls.displayNextValue.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (value) => {
                if(value) {
                    this.form.controls.displayTimeline.patchValue(false);
                }
            }
        });
    }

    getWidgetData(): Observable<WidgetModel> {
        return this.dashboardService.getWidget(this.dashboardId, this.widgetId).pipe(
            map((widget: WidgetModel) => {
                this.widget = widget;
                const exportElement = this.exports.find((availableExport) => availableExport.id === this.widget.properties.pvPrediction?.exportID);
                this.form.patchValue({
                    name: widget.name,
                    export: exportElement,
                    displayTimeline: widget.properties.pvPrediction?.displayTimeline,
                    displayNextValue: widget.properties.pvPrediction?.displayNextValue,
                    nextValueConfig: widget.properties.pvPrediction?.nextValueConfig
                });
                return widget;
            })
        );
    }

    updateName(): Observable<DashboardResponseMessageModel> {
        const newName =  this.form.get('name')?.value as string;
        this.widget.name = newName;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        const pvPrediction: PVPredictionProperties = {
            exportID: (this.form.controls.export.value as ChartsExportMeasurementModel).id,
            displayNextValue: this.form.get('displayNextValue')?.value as boolean,
            displayTimeline: this.form.get('displayTimeline')?.value as boolean,
            nextValueConfig: this.form.get('nextValueConfig')?.value as PVPredictionNextValue
        };
        this.widget.properties.pvPrediction = pvPrediction;

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

    getAvailableExports(): Observable<ExportResponseModel | null> {
        return this.exportService.getExports(true, '', 9999, 0, 'name', 'asc', undefined, undefined).pipe(
            map((exports: ExportResponseModel | null) => {
                const tmp: ChartsExportMeasurementModel[] = [];
                if (exports !== null) {
                    exports.instances?.forEach((exportModel: ExportModel) => {
                        if (
                            exportModel.ID !== undefined &&
                  exportModel.Name !== undefined // &&
                  // EnergyPredictionRequirementsService.exportHasRequiredValues(exportModel.Values)
                        ) {
                            tmp.push({ id: exportModel.ID, name: exportModel.Name, values: exportModel.Values, exportDatabaseId: exportModel.ExportDatabaseID });
                        }
                    });
                }
                this.exports = tmp;
                return exports;
            })
        );
    }

    displayFn(input?: ChartsExportMeasurementModel): string {
        return input ? input.name : '';
    }

}
