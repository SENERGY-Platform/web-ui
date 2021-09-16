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
import { WidgetModel } from '../../../../modules/dashboard/shared/dashboard-widget.model';
import { DeploymentsService } from '../../../../modules/processes/deployments/shared/deployments.service';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { DashboardResponseMessageModel } from '../../../../modules/dashboard/shared/dashboard-response-message.model';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ExportService } from '../../../../modules/exports/shared/export.service';
import { ExportModel, ExportResponseModel, ExportValueModel } from '../../../../modules/exports/shared/export.model';
import { ChartsExportMeasurementModel, ChartsExportVAxesModel } from '../shared/charts-export-properties.model';
import { ChartsExportRangeTimeTypeEnum } from '../shared/charts-export-range-time-type.enum';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
    templateUrl: './charts-export-edit-dialog.component.html',
    styleUrls: ['./charts-export-edit-dialog.component.css'],
})
export class ChartsExportEditDialogComponent implements OnInit {
    formGroupController = new FormGroup({});
    exportList: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    chartTypes = ['LineChart', 'ColumnChart', 'ScatterChart'];
    timeRangeEnum = ChartsExportRangeTimeTypeEnum;
    timeRangeTypes = [this.timeRangeEnum.Relative, this.timeRangeEnum.Absolute];
    groupTypes = [
        'mean',
        'sum',
        'count',
        'median',
        'min',
        'max',
        'first',
        'last',
        'difference-first',
        'difference-last',
        'difference-min',
        'difference-max',
        'difference-count',
        'difference-mean',
        'difference-sum',
        'difference-median',
    ];
    groupTypeIsDifference = false;

    displayedColumns: string[] = [
        'exportName',
        'valueName',
        'valueType',
        'valueAlias',
        'color',
        'math',
        'conversions',
        'filterType',
        'filterValue',
        'tags',
        'displayOnSecondVAxis',
        'duplicate-delete',
    ];
    dataSource = new MatTableDataSource<ChartsExportVAxesModel>();
    vAxesOptions: Map<string, ChartsExportVAxesModel[]> = new Map();
    exportTags: Map<string, Map<string, { value: string; parent: string }[]>> = new Map();

    constructor(
        private dialogRef: MatDialogRef<ChartsExportEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        private exportService: ExportService,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) data: { dashboardId: string; widgetId: string },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.initFormGroup({
            name: '',
            properties: {
                chartType: '',
                curvedFunction: false,
                exports: [] as ChartsExportMeasurementModel[],
                timeRangeType: '',
                vAxes: [] as ChartsExportVAxesModel[],
            },
        } as WidgetModel);
        this.getWidgetData();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.setDefaultValues(widget);
            this.initDeployments(widget);
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
                hAxisFormat: widget.properties.hAxisFormat,
                vAxisLabel: widget.properties.vAxisLabel,
                secondVAxisLabel: widget.properties.secondVAxisLabel,
                vAxes: [widget.properties.vAxes || []],
            }),
        });
        this.groupTypeIsDifference = widget.properties.group?.type?.startsWith('difference') || false;
        this.formGroupController.get('properties.group.type')?.valueChanges.subscribe((val) => {
            this.groupTypeIsDifference = val.startsWith('difference');
            if (this.groupTypeIsDifference) {
                this.dataSource.data.forEach((element) => (element.math = ''));
            }
        });
        widget.properties.exports?.forEach((exp) => this.preloadExportTags(exp.id || '').subscribe());
        this.formGroupController.get('properties.exports')?.valueChanges.subscribe((exports: ChartsExportMeasurementModel[]) => {
            exports.forEach((exp) => this.preloadExportTags(exp.id || '').subscribe());
        });

        this.formGroupController.get('properties.vAxes')?.valueChanges.subscribe((vAxes: ChartsExportVAxesModel[]) => {
            // Remove no longer existing
            for (let i = this.dataSource.data.length - 1; i >= 0; i--) {
                const axis = this.dataSource.data[i] as ChartsExportVAxesModel;
                if (
                    !vAxes.some(
                        (item: ChartsExportVAxesModel) =>
                            item.instanceId === axis.instanceId &&
                            item.exportName === axis.exportName &&
                            item.valueName === axis.valueName &&
                            item.valueType === axis.valueType,
                    )
                ) {
                    this.dataSource.data.splice(i);
                }
            }
            // Add not yet existing
            vAxes.forEach((axis) => {
                if (
                    !this.dataSource.data.some(
                        (item: ChartsExportVAxesModel) =>
                            item.instanceId === axis.instanceId &&
                            item.exportName === axis.exportName &&
                            item.valueName === axis.valueName &&
                            item.valueType === axis.valueType,
                    )
                ) {
                    this.dataSource.data.push(axis);
                }
            });
            this.reloadTable();
        });

        this.dataSource.data = widget.properties.vAxes || [];
    }

    initDeployments(widget: WidgetModel) {
        this.exportService.getExports('', 9999, 0, 'name', 'asc').subscribe((exports: ExportResponseModel | null) => {
            if (exports !== null) {
                exports.instances.forEach((exportModel: ExportModel) => {
                    if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                        this.exportList.push({ id: exportModel.ID, name: exportModel.Name, values: exportModel.Values });
                    }
                });
                // remove deleted exports
                if (widget.properties.exports !== undefined) {
                    widget.properties.exports = widget.properties.exports.filter(
                        (selected) => exports.instances.findIndex((existing) => existing.ID === selected.id) !== -1,
                    );

                    // exports values or names might have changed
                    widget.properties.exports.forEach((selected) => {
                        const latestExisting = exports.instances.find((existing) => existing.ID === selected.id);
                        if (latestExisting !== undefined && latestExisting.Name !== undefined && latestExisting.ID !== undefined) {
                            selected.values = latestExisting.Values;
                            selected.name = latestExisting.Name;
                        }
                    });
                }
                this.selectionChange(widget.properties.exports || []);
            }
        });
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    compareFilterTypes(a: string, b: string): boolean {
        return a === b;
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.formGroupController.patchValue({ properties: { vAxes: this.dataSource.data } });
        this.dashboardService
            .updateWidget(this.dashboardId, this.formGroupController.value)
            .subscribe((resp: DashboardResponseMessageModel) => {
                if (resp.message === 'OK') {
                    this.dialogRef.close(this.formGroupController.value);
                }
            });
    }

    selectionChange(selectedExports: ChartsExportMeasurementModel[]) {
        const newData: Map<string, ChartsExportVAxesModel[]> = new Map();
        const newSelection: ChartsExportVAxesModel[] = [];
        (selectedExports || []).forEach((selectedExport: ChartsExportMeasurementModel) => {
            if (!newData.has(selectedExport.name)) {
                newData.set(selectedExport.name, []);
            }
            selectedExport.values?.forEach((value: ExportValueModel) => {
                const newVAxis: ChartsExportVAxesModel = {
                    instanceId: value.InstanceID,
                    exportName: selectedExport.name,
                    valueName: value.Name,
                    valueType: value.Type,
                    color: '',
                    math: '',
                    displayOnSecondVAxis: false,
                    tagSelection: [],
                };
                const index = this.formGroupController
                    .get('properties.vAxes')
                    ?.value.findIndex(
                        (item: ChartsExportVAxesModel) =>
                            item.instanceId === newVAxis.instanceId &&
                            item.exportName === newVAxis.exportName &&
                            item.valueName === newVAxis.valueName &&
                            item.valueType === newVAxis.valueType,
                    );
                if (index === -1) {
                    newData.get(selectedExport.name)?.push(newVAxis);
                } else {
                    newSelection.push(this.formGroupController.get('properties.vAxes')?.value[index]);
                    newData.get(selectedExport.name)?.push(this.formGroupController.get('properties.vAxes')?.value[index]);
                }
                // Add duplicates of this export value
                const duplicates = this.formGroupController
                    .get('properties.vAxes')
                    ?.value.filter(
                        (item: ChartsExportVAxesModel) =>
                            item.isDuplicate &&
                            item.instanceId === newVAxis.instanceId &&
                            item.exportName === newVAxis.exportName &&
                            item.valueName === newVAxis.valueName &&
                            item.valueType === newVAxis.valueType,
                    );
                newSelection.push(...duplicates);
            });
        });
        this.vAxesOptions = newData;
        this.dataSource.data = newSelection;
    }

    filerTypeSelected(element: ChartsExportVAxesModel) {
        if (element.filterType === undefined) {
            element.filterValue = undefined;
        }
    }

    duplicate(element: ChartsExportVAxesModel, index: number) {
        const newElement = JSON.parse(JSON.stringify(element)) as ChartsExportVAxesModel;
        newElement.isDuplicate = true;
        this.dataSource.data.splice(index + 1, 0, newElement);
        this.reloadTable();
    }

    deleteDuplicate(_: ChartsExportVAxesModel, index: number) {
        this.dataSource.data.splice(index, 1);
        this.reloadTable();
    }

    private reloadTable() {
        this.dataSource._updateChangeSubscription();
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
                end: '',
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

    deleteConversion(element: ChartsExportVAxesModel, index: number, $event: MouseEvent) {
        element.conversions?.splice(index, 1);
        $event.stopPropagation();
    }

    addConversion(element: any) {
        if (element.conversions === undefined) {
            element.conversions = [];
        }
        element.conversions.push({ from: element.__from, to: element.__to });
        element.__from = undefined;
        element.__to = undefined;
    }

    getTags(element: ChartsExportVAxesModel): Map<string, { value: string; parent: string }[]> {
        return this.exportTags.get(element.instanceId) || new Map();
    }

    private preloadExportTags(exportId: string): Observable<any> {
        if (this.exportTags.get(exportId) !== undefined) {
            return of(this.exportTags.get(exportId));
        }
        this.exportTags?.set(exportId, new Map());
        return this.exportService.getExportTags(exportId).pipe(
            map((res) => {
                const m = new Map<string, { value: string; parent: string }[]>();
                res.forEach((v, k) =>
                    m.set(
                        k,
                        v.map((t) => ({ value: t, parent: k })),
                    ),
                );
                this.exportTags?.set(exportId, m);
                return m;
            }),
        );
    }

    getTagOptionDisabledFunction(tab: ChartsExportVAxesModel): (option: { value: string; parent: string }) => boolean {
        return (option: { value: string; parent: string }) => {
            const selection = tab.tagSelection;
            if (selection === null || selection === undefined || Object.keys(selection).length === 0) {
                return false;
            }
            const existing = selection.find((s) => s.startsWith(option.parent) && this.getTagValue(option) !== s);
            return existing !== undefined;
        };
    }

    getTagValue(a: { value: string; parent: string }): string {
        return a.parent + '!' + a.value;
    }
}
