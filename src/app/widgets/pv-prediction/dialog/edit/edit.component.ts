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

import { Component, Inject, OnInit } from '@angular/core';
import {UntypedFormBuilder, Validators} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { forkJoin, Observable, map, concatMap } from 'rxjs';
import { DashboardResponseMessageModel } from 'src/app/modules/dashboard/shared/dashboard-response-message.model';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { ExportModel, ExportResponseModel } from 'src/app/modules/exports/shared/export.model';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { ChartsExportMeasurementModel } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';
import { PVPredictionProperties } from '../../shared/prediction.model';

@Component({
    selector: 'app-edit',
    templateUrl: './edit.component.html',
    styleUrls: ['./edit.component.css']
})
export class PVPredictionEditComponent implements OnInit {
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    form = this.formBuilder.group({
        name: ['', Validators.required],
        export: [''],
        displayTimeline: [false],
        displayNextValue: [false],
        nextValueConfig: this.formBuilder.group({
            time: [''],
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

    constructor(
    private dialogRef: MatDialogRef<PVPredictionEditComponent>,
    private exportService: ExportService,
    private dashboardService: DashboardService,
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
        this.form.controls.displayTimeline.valueChanges.subscribe({
            next: (value) => {
                if(value) {
                    this.form.controls.displayNextValue.patchValue(false);
                }
            }
        });
        this.form.controls.displayNextValue.valueChanges.subscribe({
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
        const newName =  this.form.get('name')?.value;
        this.widget.name = newName;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        const pvPrediction: PVPredictionProperties = {
            exportID: this.form.get('export')?.value['id'],
            displayNextValue: this.form.get('displayNextValue')?.value,
            displayTimeline: this.form.get('displayTimeline')?.value,
            nextValueConfig: this.form.get('nextValueConfig')?.value
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
