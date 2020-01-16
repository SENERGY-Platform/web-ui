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
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {ChartsExportMeasurementModel} from '../../charts/export/shared/charts-export-properties.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ExportModel} from '../../../modules/data/export/shared/export.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ExportService} from '../../../modules/data/export/shared/export.service';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {MultiValueMeasurement, MultiValueOrderEnum} from '../shared/multi-value.model';


@Component({
    templateUrl: './multi-value-edit-dialog.component.html',
    styleUrls: ['./multi-value-edit-dialog.component.css'],
})
export class MultiValueEditDialogComponent implements OnInit {

    exports: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {id: '', name: '', type: '', properties: {}};
    disableSave = false;
    name = '';
    order = 0;
    orderValues = MultiValueOrderEnum;
    measurements: MultiValueMeasurement[] = [];

    constructor(private dialogRef: MatDialogRef<MultiValueEditDialogComponent>,
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
            this.measurements = this.widget.properties.multivaluemeasurements ?
                this.widget.properties.multivaluemeasurements : this.measurements;
            if (this.measurements.length === 0) {
                this.add();
            }
            this.name = widget.name;
            this.order = widget.properties.order || 0;
            this.initDeployments();
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
        this.widget.properties.multivaluemeasurements = this.measurements;
        this.widget.name = this.name;
        this.widget.properties.order = this.order;
        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }

    add() {
        const addexport = {
            id: '',
            name: '',
            values: []
        };
        const m: MultiValueMeasurement = {
            name: '',
            column: {InstanceID: '', Name: '', Path: '', Type: ''},
            type: '',
            format: '',
            unit: '',
            export: addexport,
        };
        this.measurements.push(m);
    }

    displayFn(input?: ChartsExportMeasurementModel): string | undefined {
        return input ? input.name : undefined;
    }

    compare(a: any, b: any) {
        return a.InstanceID === b.InstanceID && a.Name === b.Name && a.Path === b.Path;
    }

    compareStrings(a: any, b: any) {
        return a === b;
    }

    removeTab(index: number) {
        this.measurements.splice(index, 1);
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
        const removed = this.measurements[index];
        this.measurements.splice(index, 1);
        if (isUp) {
            this.measurements.splice(index - 1, 0, removed);
        } else {
            this.measurements.splice(index + 1, 0, removed);
        }
    }
}
