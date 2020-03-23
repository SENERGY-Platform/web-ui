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

import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {WidgetModel} from '../../../../modules/dashboard/shared/dashboard-widget.model';
import {DeploymentsService} from '../../../../modules/processes/deployments/shared/deployments.service';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {DashboardResponseMessageModel} from '../../../../modules/dashboard/shared/dashboard-response-message.model';
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {ExportService} from '../../../../modules/data/export/shared/export.service';
import {ExportModel, ExportValueModel} from '../../../../modules/data/export/shared/export.model';
import {ChartsExportMeasurementModel, ChartsExportVAxesModel} from '../shared/charts-export-properties.model';
import {SelectionModel} from '@angular/cdk/collections';
import {PipelineModel} from '../../../../modules/data/pipeline-registry/shared/pipeline.model';
import {ChartsExportRangeTimeTypeEnum} from '../shared/charts-export-range-time-type.enum';
import {MatTable, MatTableDataSource} from '@angular/material/table';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {DeploymentsPreparedLaneElementModel} from '../../../../modules/processes/deployments/shared/deployments-prepared.model';

@Component({
    templateUrl: './charts-export-edit-dialog.component.html',
    styleUrls: ['./charts-export-edit-dialog.component.css'],
})
export class ChartsExportEditDialogComponent implements OnInit {

    formGroupController = new FormGroup({});
    exportList: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    chartTypes = ['LineChart', 'ColumnChart'];
    timeRangeEnum = ChartsExportRangeTimeTypeEnum;
    timeRangeTypes = [this.timeRangeEnum.Relative, this.timeRangeEnum.Absolute];
    groupTypes = ['mean', 'sum', 'count', 'median'];

    displayedColumns: string[] = ['select', 'exportName', 'valueName', 'valueType', 'color', 'math'];
    dataSource = new MatTableDataSource<ChartsExportVAxesModel>();
    selection = new SelectionModel<ChartsExportVAxesModel>(true, []);

    constructor(private dialogRef: MatDialogRef<ChartsExportEditDialogComponent>,
                private deploymentsService: DeploymentsService,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                private _formBuilder: FormBuilder,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.initFormGroup({
            name: '', properties: {
                chartType: '',
                curvedFunction: false,
                exports: [] as ChartsExportMeasurementModel[],
                timeRangeType: '',
            }
        } as WidgetModel);
        this.getWidgetData();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.setDefaultValues(widget);
            if (widget.properties.vAxes) {
                widget.properties.vAxes.forEach(row => this.selection.select(row));
            }
            this.selectionChange(widget.properties.exports || []);
            this.initDeployments();
            this.initFormGroup(widget);
        });
    }

    initFormGroup(widget: WidgetModel): void {
        this.formGroupController = this._formBuilder.group({
            id: widget.id,
            name: widget.name,
            type: widget.type,
            properties: this._formBuilder.group({
                chartType: widget.properties.chartType,
                curvedFunction: this._formBuilder.control(widget.properties.curvedFunction),
                exports: this._formBuilder.control(widget.properties.exports),
                timeRangeType: widget.properties.timeRangeType,
                time: this._formBuilder.group({
                    last: widget.properties.time ? widget.properties.time.last : '',
                    start: widget.properties.time ? widget.properties.time.start : '',
                    end: widget.properties.time ? widget.properties.time.end : '',
                }),
                group: this._formBuilder.group({
                    time: widget.properties.group ? widget.properties.group.time : '',
                    type: widget.properties.group ? widget.properties.group.type : undefined,
                }),
                hAxisLabel: widget.properties.hAxisLabel,
                vAxisLabel: widget.properties.vAxisLabel,
                vAxes: widget.properties.vAxes,
            })
        });
    }

    initDeployments() {
        this.exportService.getExports('name', 'asc').subscribe((exports: (ExportModel[] | null)) => {
            if (exports !== null) {
                exports.forEach((exportModel: ExportModel) => {
                    if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                        this.exportList.push({id: exportModel.ID, name: exportModel.Name, values: exportModel.Values});
                    }
                });
            }
        });
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.formGroupController.patchValue({'properties': {'vAxes': this.selection.selected}});
        this.dashboardService.updateWidget(this.dashboardId, this.formGroupController.value).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.formGroupController.value);
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
    }

    private setDefaultValues(widget: WidgetModel): void {
        if (widget.properties.chartType === undefined) {
            widget.properties.chartType = this.chartTypes[0];
        }

        if (widget.properties.time === undefined) {
            widget.properties.timeRangeType = 'relative';
            widget.properties.time = {
                last: '1d',
                start: '',
                end: ''
            };
        }

        if (widget.properties.group === undefined) {
            widget.properties.group = {
                time: '',
                type: '',
            };
        }
    }

    get chartType(): FormControl {
        return this.formGroupController.get(['properties', 'chartType']) as FormControl;
    }

    get exports(): FormArray {
        return this.formGroupController.get(['properties', 'exports']) as FormArray;
    }

    get timeRangeType(): FormControl {
        return this.formGroupController.get(['properties', 'timeRangeType']) as FormControl;
    }
}
