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

import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { WidgetModel } from '../../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { DashboardResponseMessageModel } from '../../../../modules/dashboard/shared/dashboard-response-message.model';
import {
    AbstractControl,
    FormArray,
    FormControl,
    UntypedFormBuilder,
    UntypedFormGroup,
    ValidatorFn, Validators
} from '@angular/forms';
import { ExportService } from '../../../../modules/exports/shared/export.service';
import { ChartsExportDeviceGroupMergingStrategy, ChartsExportMeasurementModel, ChartsExportVAxesModel } from '../shared/charts-export-properties.model';
import { ChartsExportRangeTimeTypeEnum } from '../shared/charts-export-range-time-type.enum';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { DeviceTypeDeviceClassModel, DeviceTypeFunctionModel } from '../../../../modules/metadata/device-types-overview/shared/device-type.model';
import { environment } from '../../../../../environments/environment';
import { DeviceGroupCriteriaModel, DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { AspectsPermSearchModel } from 'src/app/modules/metadata/aspects/shared/aspects-perm-search.model';
import { ConceptsCharacteristicsModel } from 'src/app/modules/metadata/concepts/shared/concepts-characteristics.model';
import { DataSourceConfig, DataSourceSelectorComponent } from '../../shared/data-source-selector/data-source-selector.component';
import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { NestedTreeControl } from '@angular/cdk/tree';
import { hashCode } from 'src/app/core/services/util.service';

@Component({
    templateUrl: './charts-export-edit-dialog.component.html',
    styleUrls: ['./charts-export-edit-dialog.component.css'],
})
export class ChartsExportEditDialogComponent implements OnInit {
    typeString = 'https://schema.org/Text';
    typeInteger = 'https://schema.org/Integer';
    typeFloat = 'https://schema.org/Float';
    typeBoolean = 'https://schema.org/Boolean';
    typeStructure = 'https://schema.org/StructuredValue';
    typeList = 'https://schema.org/ItemList';

    chartsExportDeviceGroupMergingStrategy = ChartsExportDeviceGroupMergingStrategy;
    dataSourceConfig?: DataSourceConfig;

    formGroupController = new UntypedFormGroup({});
    dashboardId: string;
    widgetId: string;
    chartTypes = ['LineChart', 'ColumnChart', 'ScatterChart', 'PieChart', 'Timeline'];
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
        'deviceGroupMergingStrategy',
        'displayOnSecondVAxis',
        'duplicate-delete',
    ];

    dataSource = new MatTableDataSource<ChartsExportVAxesModel>();
    vAxesOptions: Map<string, ChartsExportVAxesModel[]> = new Map();
    exportTags: Map<string, Map<string, { value: string; parent: string }[]>> = new Map();
    ready = false;
    emptyMap = new Map();
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;

    deviceGroups: DeviceGroupModel[] = [];
    aspects: AspectsPermSearchModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    concepts: Map<string, ConceptsCharacteristicsModel | null> = new Map();

    @ViewChild('datasourceselector', {static: false}) dataSourceSelector?: DataSourceSelectorComponent;

    constructor(
        private dialogRef: MatDialogRef<ChartsExportEditDialogComponent>,
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private exportService: ExportService,
        private _formBuilder: UntypedFormBuilder,
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
        this.getWidgetData();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.setDefaultValues(widget);
            this.initFormGroup(widget);
            this.createDataSourceConfig(widget);
            this.ready = true;
        });

    }

    createDataSourceConfig(widget: WidgetModel) {
        let timeRangeValue = '';
        let timeRangeLevel = '';
        const timeRange = widget.properties.time?.ahead || widget.properties.time?.last;
        if (timeRange != null) {
            const timeRangeSplit = timeRange.match(/[a-zA-Z]+|[0-9]+/g);
            timeRangeValue = timeRangeSplit?.[0] || '';
            timeRangeLevel = timeRangeSplit?.[1] || '';
        }

        let groupValue = '';
        let groupLevel = '';
        const group = widget.properties.group?.time;
        if (group != null) {
            const groupSplit = group.match(/[a-zA-Z]+|[0-9]+/g);
            groupValue = groupSplit?.[0] || '';
            groupLevel = groupSplit?.[1] || '';
        }

        this.dataSourceConfig = {
            exports: widget.properties.exports,
            fields: widget.properties.vAxes,
            timeRange: {
                type: widget.properties.timeRangeType,
                start: widget.properties.time?.start,
                end: widget.properties.time?.end,
                level: timeRangeLevel,
                time: parseFloat(timeRangeValue)
            },
            group: {
                type: widget.properties.group?.type,
                time: parseFloat(groupValue),
                level: groupLevel
            }
        };

    }

    dataSourceConfigChanged(updatedDataSourceConfig: DataSourceConfig) {
        this.formGroupController.get('properties.vAxes')?.patchValue(updatedDataSourceConfig.fields);
        this.formGroupController.get('properties.exports')?.patchValue(updatedDataSourceConfig.exports);
        this.formGroupController.get('properties.timeRangeType')?.patchValue(updatedDataSourceConfig.timeRange?.type);
        const timeRangeType = updatedDataSourceConfig.timeRange?.type;
        const timeRangeLevel = updatedDataSourceConfig.timeRange?.level || '';

        if (timeRangeType === ChartsExportRangeTimeTypeEnum.Absolute) {
            const start = updatedDataSourceConfig.timeRange?.start;
            if (start != null && start !== '') {
                this.formGroupController.get('properties.time.start')?.patchValue(start + timeRangeLevel);
            }
            const end = updatedDataSourceConfig.timeRange?.end;
            if (end != null && end !== '') {
                this.formGroupController.get('properties.time.end')?.patchValue(end + timeRangeLevel);
            }
        } else if (timeRangeType === ChartsExportRangeTimeTypeEnum.Relative) {
            const last = updatedDataSourceConfig.timeRange?.time;
            if (last != null) {
                this.formGroupController.get('properties.time.last')?.patchValue(last + timeRangeLevel);
            }
        } else if (timeRangeType === ChartsExportRangeTimeTypeEnum.RelativeAhead) {
            const ahead = updatedDataSourceConfig.timeRange?.time;;
            if (ahead != null) {
                this.formGroupController.get('properties.time.ahead')?.patchValue(ahead + timeRangeLevel);
            }
        }

        const groupTimeType = updatedDataSourceConfig.group?.type;
        const groupTimeLevel = updatedDataSourceConfig.group?.level || '';
        const groupTimeValue = updatedDataSourceConfig.group?.time;
        this.formGroupController.get('properties.group.time')?.patchValue(groupTimeValue + groupTimeLevel);
        this.formGroupController.get('properties.group.type')?.patchValue(groupTimeType);
    }

    initFormGroup(widget: WidgetModel): void {
        this.formGroupController = this._formBuilder.group({
            id: widget.id,
            name: [widget.name, Validators.required],
            type: widget.type,
            properties: this._formBuilder.group({
                chartType: widget.properties.chartType,
                curvedFunction: this._formBuilder.control(widget.properties.curvedFunction),
                calculateIntervals: this._formBuilder.control(widget.properties.calculateIntervals),
                breakInterval: this._formBuilder.control(widget.properties.breakInterval),
                exports: this._formBuilder.control(widget.properties.exports),
                timeRangeType: widget.properties.timeRangeType,
                time: this._formBuilder.group({
                    last: widget.properties.time ? widget.properties.time.last : '',
                    ahead: widget.properties.time ? widget.properties.time.ahead : '',
                    start: widget.properties.time ? widget.properties.time.start : '',
                    end: widget.properties.time ? widget.properties.time.end : '',
                }),
                group: this._formBuilder.group({
                    time: [widget.properties.group ? widget.properties.group.time : '', [this.validateInterval]],
                    type: widget.properties.group ? widget.properties.group.type : undefined,
                }),
                hAxisLabel: widget.properties.hAxisLabel,
                hAxisFormat: widget.properties.hAxisFormat,
                vAxisLabel: widget.properties.vAxisLabel,
                secondVAxisLabel: widget.properties.secondVAxisLabel,
                vAxes: [widget.properties.vAxes || []],
                zoomTimeFactor: widget.properties.zoomTimeFactor || 2,
                stacked: widget.properties.stacked,
            }),
        });
        this.groupTypeIsDifference = widget.properties.group?.type?.startsWith ? (widget.properties.group?.type?.startsWith('difference') || false) : false;
        this.formGroupController.get('properties.group.type')?.valueChanges.subscribe((val) => {
            this.groupTypeIsDifference = val.startsWith ? val.startsWith('difference') : false;
            if (this.groupTypeIsDifference) {
                this.dataSource.data.forEach((element) => (element.math = ''));
            }
        });
        widget.properties.exports?.forEach((exp) => {
            if ((exp as DeviceInstanceModel).device_type_id === undefined &&
                ((exp as ChartsExportMeasurementModel).exportDatabaseId === undefined || (exp as ChartsExportMeasurementModel).exportDatabaseId === environment.exportDatabaseIdInternalInfluxDb)) {
                this.preloadExportTags(exp.id || '').subscribe();
            }
        });
        this.formGroupController.get('properties.exports')?.valueChanges.subscribe((exports: (ChartsExportMeasurementModel | DeviceInstanceModel)[]) => {
            exports.forEach((exp) => {
                if ((exp as DeviceInstanceModel).device_type_id === undefined &&
                    ((exp as ChartsExportMeasurementModel).exportDatabaseId === undefined || (exp as ChartsExportMeasurementModel).exportDatabaseId === environment.exportDatabaseIdInternalInfluxDb)) {
                    this.preloadExportTags(exp.id || '').subscribe();
                }
            });
        });

        this.formGroupController.get('properties.vAxes')?.valueChanges.subscribe((vAxes: ChartsExportVAxesModel[]) => {
            // Remove no longer existing
            for (let i = this.dataSource.data.length - 1; i >= 0; i--) {
                const axis = this.dataSource.data[i] as ChartsExportVAxesModel;
                const sameExportAxisExists = vAxes.some(
                    (item: ChartsExportVAxesModel) =>
                        item.instanceId != null &&
                        item.instanceId === axis.instanceId &&
                        item.exportName === axis.exportName &&
                        item.valueName === axis.valueName &&
                        item.valueType === axis.valueType,
                );
                const sameDeviceAxisExsits = vAxes.some(
                    (item: ChartsExportVAxesModel) =>
                        item.deviceId != null &&
                        item.deviceId === axis.deviceId &&
                        item.serviceId === axis.serviceId &&
                        item.valueName === axis.valueName
                );

                if (!sameExportAxisExists && !sameDeviceAxisExsits) {
                    this.dataSource.data.splice(i);
                }
            }

            // Add not yet existing
            vAxes.forEach((axis) => {
                const sameExportValueExists = this.dataSource.data.some(
                    (item: ChartsExportVAxesModel) =>
                        item.instanceId != null &&
                        item.instanceId === axis.instanceId &&
                        item.exportName === axis.exportName &&
                        item.valueName === axis.valueName &&
                        item.valueType === axis.valueType,
                );
                const sameDeviceValueExists = this.dataSource.data.some(
                    (item: ChartsExportVAxesModel) =>
                        item.deviceId != null &&
                        item.deviceId === axis.deviceId &&
                        item.serviceId === axis.serviceId &&
                        item.valueName === axis.valueName
                );

                if (!sameExportValueExists && !sameDeviceValueExists) {
                    this.dataSource.data.push(axis);
                }
            });
            this.reloadTable();
        });
        this.dataSource.data = widget.properties.vAxes || [];
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    close(): void {
        this.dialogRef.close();
    }

    updateName(): Observable<DashboardResponseMessageModel> {
        const newName = (this.formGroupController.get('name') as FormControl).value;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widgetId, newName);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        // bug patchValue leads to dataSource.data being empty ?
        // this.formGroupController.patchValue({properties: {vAxes: this.dataSource.data}});
        const newProperties = (this.formGroupController.get('properties') as FormControl).value;
        newProperties['vAxes'] = this.dataSource.data;
        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widgetId, [], newProperties);
    }

    save(): void {
        const obs = [];
        if (this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }

        if (this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties());
        }

        forkJoin(obs).subscribe(responses => {
            const errorOccured = responses.find((response) => response.message !== 'OK');
            if (!errorOccured) {
                this.dialogRef.close(this.formGroupController.value);
            }
        });
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
                ahead: '',
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

    addConversion(element: any) {
        if (element.conversions === undefined) {
            element.conversions = [];
        }
        let from = element.__from;
        if (element.valueType !== 'string') {
            from = JSON.parse(from);
        }
        let to = element.__to;
        if (this.chartType.value !== 'Timeline' && this.chartType.value !== 'PieChart') {
            to = JSON.parse(to);
        }
        element.conversions.push({ from, to, color: element.__color, alias: element.__alias });
        element.__from = undefined;
        element.__to = undefined;
        element.__color = undefined;
        element.__alias = undefined;
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

    validateInterval: ValidatorFn = (control: AbstractControl) => {
        const type = this.formGroupController.get('properties.group.type')?.value;
        if (type === undefined || type === null || type.length === 0) {
            return null;
        }
        if (control.value === undefined || control.value === null || control.value.length === 0) {
            return { validateInterval: { value: control.value } };
        }
        const re = new RegExp('\\d+(ns|u|µ|ms|s|months|y|m|h|d|w)');
        const matches = re.exec(control.value);
        if (matches == null || matches.length === 0 || matches[0].length !== control.value.length) {
            return { validateInterval: { value: control.value } };
        }
        return null;
    };

    describeCriteria(): (criteria: DeviceGroupCriteriaModel) => string {
        return criteria => (this.functions.find(f => f.id === criteria.function_id)?.display_name || criteria.function_id) + ' ' + (criteria.device_class_id !== '' ? this.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '' : '') + ' ' + (criteria.aspect_id !== '' ? this.aspects.find(a => a.id === criteria.aspect_id)?.name || '' : '');
    }

    treeControl = new NestedTreeControl<ChartsExportVAxesModel>((node) => node.subAxes);

    dragging = false;

    hasChild(_: number, node: ChartsExportVAxesModel): boolean {
        return node.subAxes !== undefined && node.subAxes.length > 0;
    }

    deleteDuplicate(node: ChartsExportVAxesModel) {
        const stringified = JSON.stringify(node);
        const index = this.dataSource.data.findIndex(x => JSON.stringify(x) === stringified);
        this.dataSource.data.splice(index, 1);
        const t = this.dataSource.data; // required for change detection
        this.dataSource.data = t;
    }

    duplicate(node: ChartsExportVAxesModel) {
        const stringified = JSON.stringify(node);
        const newElement = JSON.parse(stringified) as ChartsExportVAxesModel;
        newElement.isDuplicate = true;
        const index = this.dataSource.data.findIndex(x => JSON.stringify(x) === stringified);
        this.dataSource.data.splice(index + 1, 0, newElement);
        this.redraw();
    }

    dropped($event: any, target?: ChartsExportVAxesModel) {
        const node = $event.item.data as ChartsExportVAxesModel;
        if (node === target) {
            console.warn('Can\'t move node into itself');
            return;
        }
        const expanded = this.treeControl.isExpanded(node);

        const clone = JSON.parse(JSON.stringify(node));
        if (target !== undefined) {
            if (target.subAxes === undefined || target.subAxes === null) {
                target.subAxes = [clone];
            } else {
                target.subAxes.push(clone);
            }
        } else {
            this.dataSource.data.push(clone);
        }
        this.deleteNode(node);
        if (expanded) {
            this.treeControl.expand(clone);
        }
        this.redraw();
    }

    deleteNode(node: ChartsExportVAxesModel) {
        this.dataSource.data.forEach((sub, i) => {
            if (sub === node) {
                const del = (dele: boolean) => {
                    if (dele) {
                        this.dataSource.data.splice(i, 1);
                        this.redraw();
                    }
                };
                del(true);

            } else {
                this.findAndDeleteChild(sub, node);
            }
        });
        this.redraw();
    }

    startDrag() {
        this.dragging = true;
    }

    stopDrag() {
        this.dragging = false;
    }

    private findAndDeleteChild(data: ChartsExportVAxesModel, searchElement: ChartsExportVAxesModel) {
        if (data.subAxes === null || data.subAxes === undefined) {
            return;
        }
        const i = data.subAxes.indexOf(searchElement);
        if (i === -1) {
            data.subAxes.forEach((sub) => this.findAndDeleteChild(sub, searchElement));
        } else {
            data.subAxes?.splice(i, 1);
            this.redraw();
        }
    }

    private redraw() {
        const data = this.dataSource.data;
        if (this.dataSourceSelector !== undefined) {
            this.dataSourceSelector?.patchFields(this.dataSource.data);
        }
        const expanded = this.treeControl.expansionModel.selected;
        this.dataSource.data = [];
        this.dataSource.data = data;
        data.filter(f => expanded.some(e => e === f)).forEach(n => this.treeControl.expand(n));
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    dontDropPredicate = (_: any, __: any) => false;

    getConnectedNodesFn() {
        const that = this;
        return (not: ChartsExportVAxesModel | undefined) => ChartsExportEditDialogComponent.connectedNodes(not, that);
    }

    static connectedNodes(not: ChartsExportVAxesModel | undefined, that: ChartsExportEditDialogComponent): string[] {
        const res: string[] = [];
        if (not !== undefined) {
            res.push('rootDropZone');
        }
        res.push(...ChartsExportEditDialogComponent.connectedChildNodes(that.dataSource.data, not));
        return res;
    }
    static connectedChildNodes(nodes: ChartsExportVAxesModel[], not?: ChartsExportVAxesModel): string[] {
        const res: string[] = [];
        nodes.forEach(n => {
            if (n !== not) {
                res.push('' + hashCode(JSON.stringify(n)));
            }
            if (n.subAxes !== undefined) {
                res.push(...ChartsExportEditDialogComponent.connectedChildNodes(n.subAxes, not));
            }
        });
        return res;
    }
}
