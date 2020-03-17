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

import {Component, Inject, OnInit} from '@angular/core';
import {FormControl} from '@angular/forms';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/internal/operators';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {ChartsExportMeasurementModel} from '../../charts/export/shared/charts-export-properties.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ExportModel, ExportValueModel} from '../../../modules/data/export/shared/export.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ExportService} from '../../../modules/data/export/shared/export.service';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';


@Component({
    templateUrl: './single-value-edit-dialog.component.html',
    styleUrls: ['./single-value-edit-dialog.component.css'],
})
export class SingleValueEditDialogComponent implements OnInit {

    formControl = new FormControl('');
    exports: ChartsExportMeasurementModel[] = [];
    filteredExports: Observable<ChartsExportMeasurementModel[]> = new Observable();
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    vAxisValues: ExportValueModel[] = [];
    disableSave = false;

    vAxisLabel = '';
    name = '';
    type = '';
    format = '';
    threshold = 128;
    math = '';

    constructor(private dialogRef: MatDialogRef<SingleValueEditDialogComponent>,
                private deploymentsService: DeploymentsService,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.getWidgetData();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.vAxisLabel = widget.properties.vAxisLabel ? widget.properties.vAxisLabel : this.vAxisLabel;
            this.name = widget.name;
            this.type = widget.properties.type ? widget.properties.type : this.type;
            this.format =  widget.properties.format ? widget.properties.format : this.format;
            this.threshold = widget.properties.threshold ? widget.properties.threshold : this.threshold;
            this.math = widget.properties.math ? widget.properties.math : this.math;
            this.formControl.setValue(this.widget.properties.measurement || '');
            this.initDeployments();
        });
    }

    initDeployments() {
        this.exportService.getExports('name', 'asc').subscribe((exports: (ExportModel[] | null)) => {
            if (exports !== null) {
                exports.forEach((exportModel: ExportModel) => {
                    if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                        this.exports.push({id: exportModel.ID, name: exportModel.Name, values: exportModel.Values});
                        if (this.widget.properties.vAxis) {
                            if (this.widget.properties.vAxis.InstanceID === exportModel.ID) {
                                this.vAxisValues = exportModel.Values;
                            }
                        }
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
        if (this.formControl.value) {
            this.widget.properties.measurement = {
                id: this.formControl.value.id,
                name: this.formControl.value.name,
                values: this.formControl.value.values
            };
        }
        this.widget.properties.vAxisLabel = this.vAxisLabel;
        this.widget.name = this.name;
        this.widget.properties.type = this.type;
        this.widget.properties.format = this.format;
        this.widget.properties.threshold = this.threshold;
        this.widget.properties.math = this.math;

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

    displayFn(input?: ChartsExportMeasurementModel): string {
        return input ? input.name : '';
    }

    compare(a: any, b: any) {
        return a.InstanceID === b.InstanceID && a.Name === b.Name && a.Path === b.Path;
    }

    compareStrings(a: any, b: any) {
        return a === b;
    }


    optionSelected(input: MatAutocompleteSelectedEvent ) {
        this.vAxisValues = input.option.value.values;
        this.widget.properties.vAxis = this.vAxisValues[0];
    }

    autoCompleteClosed() {
        if (typeof this.formControl.value === 'string') {
            this.disableSave = true;
            this.vAxisValues = [];
            this.formControl.setErrors({'valid': false});
        } else {
            this.disableSave = false;
            this.formControl.updateValueAndValidity();
        }

    }

}
