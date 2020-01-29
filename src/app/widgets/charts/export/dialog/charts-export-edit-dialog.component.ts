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

import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef, MatTable, MatTableDataSource} from '@angular/material';
import {WidgetModel} from '../../../../modules/dashboard/shared/dashboard-widget.model';
import {DeploymentsService} from '../../../../modules/processes/deployments/shared/deployments.service';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {DashboardResponseMessageModel} from '../../../../modules/dashboard/shared/dashboard-response-message.model';
import {FormControl} from '@angular/forms';
import {ExportService} from '../../../../modules/data/export/shared/export.service';
import {ExportModel, ExportValueModel} from '../../../../modules/data/export/shared/export.model';
import {ChartsExportMeasurementModel, ChartsExportVAxesModel} from '../shared/charts-export-properties.model';
import {SelectionModel} from '@angular/cdk/collections';
import {PipelineModel} from '../../../../modules/data/pipeline-registry/shared/pipeline.model';

@Component({
    templateUrl: './charts-export-edit-dialog.component.html',
    styleUrls: ['./charts-export-edit-dialog.component.css'],
})
export class ChartsExportEditDialogComponent implements OnInit {

    formControl = new FormControl();
    exports: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {id: '', name: '', type: '', properties: {}};
    disableSave = false;
    chartTypes = ['LineChart', 'ColumnChart'];

    displayedColumns: string[] = ['select', 'exportName', 'valueName', 'valueType', 'color', 'math'];
    dataSource = new MatTableDataSource<ChartsExportVAxesModel>();
    selection = new SelectionModel<ChartsExportVAxesModel>(true, []);

    @ViewChild(MatTable, {static: false}) table!: MatTable<PipelineModel>;

    constructor(private dialogRef: MatDialogRef<ChartsExportEditDialogComponent>,
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
            this.formControl.setValue(this.widget.properties.exports || []);
            if (this.widget.properties.vAxes) {
                this.widget.properties.vAxes.forEach(row => this.selection.select(row));
            }
            this.selectionChange(this.widget.properties.exports || []);

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

    compare(a: any, b: any): boolean {
        return a.id === b.id && a.name === b.name;
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.widget.properties.measurement = undefined; // old field
        this.widget.properties.vAxis = undefined; // old field
        this.widget.properties.vAxes = this.selection.selected;
        this.widget.properties.exports = this.formControl.value;
        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.data.length;
        return numSelected === numRows;
    }

    masterToggle() {
        this.isAllSelected() ?
            this.selection.clear() :
            this.dataSource.data.forEach(row => this.selection.select(row));
    }

    selectionChange(selectedExports: ChartsExportMeasurementModel[]) {
        const newData: ChartsExportVAxesModel[] = [];
        const newSelection: ChartsExportVAxesModel[] = [];
        selectedExports.forEach((selectedExport: ChartsExportMeasurementModel) => {
            selectedExport.values.forEach((value: ExportValueModel) => {
                const newVAxis: ChartsExportVAxesModel = {
                    instanceId: value.InstanceID,
                    exportName: selectedExport.name,
                    valueName: value.Name,
                    valueType: value.Type,
                    color: '',
                    math: ''
                };
                const index = this.selection.selected.findIndex(
                    item => item.instanceId === newVAxis.instanceId &&
                        item.exportName === newVAxis.exportName &&
                        item.valueName === newVAxis.valueName &&
                        item.valueType === newVAxis.valueType);
                if (index === -1) {
                    newData.push(newVAxis);
                } else {
                    newSelection.push(this.selection.selected[index]);
                    newData.push(this.selection.selected[index]);
                }
            });
        });
        this.dataSource.data = newData;
        this.selection.clear();
        newSelection.forEach(row => this.selection.select(row));
        this.table.renderRows();
    }

}
