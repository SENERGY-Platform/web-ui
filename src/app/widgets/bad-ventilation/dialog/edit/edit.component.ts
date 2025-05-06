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
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { forkJoin, map } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { ChartsExportMeasurementModel } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';
import { DataSourceConfig } from 'src/app/widgets/charts/shared/data-source-selector/data-source-selector.component';

@Component({
    selector: 'senergy-edit-ventilation',
    templateUrl: './edit.component.html',
    styleUrls: ['./edit.component.css']
})
export class EditVentilationWidgetComponent implements OnInit {
    form = this.formBuilder.group({
        name: ['', Validators.required],
        exportConfig:  this.formBuilder.group({
            exports: [[]],
        }),
        deviceValueConfig: this.formBuilder.group({
            exports: [[]],
            fields: [[]]
        }),
        timeRangeConfig: this.formBuilder.group({
            timeRange: this.formBuilder.group({
                type: [''],
                time: [''],
                level: [''],
                start: [''],
                end: ['']
            })
        }),
    });
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    ready = false;
    widget: WidgetModel = {} as WidgetModel;
    dashboardId = '';
    widgetId = '';
    exports: ChartsExportMeasurementModel[] = [];

    constructor(
        private formBuilder: UntypedFormBuilder,
        private dialogRef: MatDialogRef<EditVentilationWidgetComponent>,
        private dashboardService: DashboardService,
        private exportService: ExportService,
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
        this.getWidgetData().subscribe({
            next: (_) => {
                this.ready = true;
            },
            error: (_) => {
                this.ready = true;
            }
        });
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
            const errorOccured = responses.find((response) => response.message !== 'OK');
            if(!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        });
    }

    updateName() {
        const newName =  this.form.get('name')?.value;
        this.widget.name = newName;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateProperties() {
        this.widget.properties.badVentilation = {
            exportConfig: this.form.controls.exportConfig.value,
            deviceConfig: this.form.controls.deviceValueConfig.value,
            timeRangeConfig: this.form.controls.timeRangeConfig.value,
        };

        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties);
    }

    close(): void {
        this.dialogRef.close(this.widget);
    }

    getWidgetData() {
        return this.dashboardService.getWidget(this.dashboardId, this.widgetId).pipe(
            map((widget: WidgetModel) => {
                this.widget = widget;
                this.form.patchValue({
                    name: widget.name,
                    exportConfig: widget.properties.badVentilation?.exportConfig,
                    deviceValueConfig: widget.properties.badVentilation?.deviceConfig,
                    timeRangeConfig: widget.properties.badVentilation?.timeRangeConfig
                });
            })
        );
    }


    updateFormControl(controlName: string, value: any, formKey: string) {
        const control = this.form.get(formKey + controlName);
        if(control != null) {
            control.patchValue(value);
        }
    }

    timeConfigUpdated(updatedDataSourceConfig: DataSourceConfig) {
        const timelineKey = 'timeRangeConfig.timeRange.';
        this.updateFormControl('type', updatedDataSourceConfig.timeRange?.type, timelineKey);
        this.updateFormControl('level', updatedDataSourceConfig.timeRange?.level, timelineKey);
        this.updateFormControl('time', updatedDataSourceConfig.timeRange?.time, timelineKey);
        this.updateFormControl('end', updatedDataSourceConfig.timeRange?.end, timelineKey);
        this.updateFormControl('start', updatedDataSourceConfig.timeRange?.start, timelineKey);
    }

    deviceConfigUpdated(updatedDataSourceConfig: DataSourceConfig) {
        const formKey = 'deviceValueConfig.';
        this.updateFormControl('fields', updatedDataSourceConfig.fields, formKey);
        this.updateFormControl('exports', updatedDataSourceConfig.exports, formKey);
    }

    exportConfigUpdated(updatedDataSourceConfig: DataSourceConfig) {
        const formKey = 'exportConfig.';
        this.updateFormControl('exports', updatedDataSourceConfig.exports, formKey);
    }
}
