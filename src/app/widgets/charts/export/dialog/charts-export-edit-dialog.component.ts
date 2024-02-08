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

import {ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import {WidgetModel} from '../../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {DashboardResponseMessageModel} from '../../../../modules/dashboard/shared/dashboard-response-message.model';
import {
    AbstractControl,
    FormArray,
    FormControl,
    UntypedFormBuilder,
    UntypedFormGroup,
    ValidatorFn
} from '@angular/forms';
import {ExportService} from '../../../../modules/exports/shared/export.service';
import {ExportModel, ExportResponseModel, ExportValueModel} from '../../../../modules/exports/shared/export.model';
import {ChartsExportConversion, ChartsExportDeviceGroupMergingStrategy, ChartsExportMeasurementModel, ChartsExportVAxesModel} from '../shared/charts-export-properties.model';
import {ChartsExportRangeTimeTypeEnum} from '../shared/charts-export-range-time-type.enum';
import {MatTableDataSource} from '@angular/material/table';
import {MAT_DIALOG_DATA, MatDialogRef, MatDialog} from '@angular/material/dialog';
import {forkJoin, Observable, of} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {DeviceInstancesModel} from '../../../../modules/devices/device-instances/shared/device-instances.model';
import {DeviceInstancesService} from '../../../../modules/devices/device-instances/shared/device-instances.service';
import {DeviceTypeService} from '../../../../modules/metadata/device-types-overview/shared/device-type.service';
import {DeviceTypeFunctionModel, DeviceTypeModel} from '../../../../modules/metadata/device-types-overview/shared/device-type.model';
import {environment} from '../../../../../environments/environment';
import { DeviceGroupsPermSearchModel } from 'src/app/modules/devices/device-groups/shared/device-groups-perm-search.model';
import { DeviceGroupCriteriaModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { AspectsPermSearchModel } from 'src/app/modules/metadata/aspects/shared/aspects-perm-search.model';
import { DeviceClassesPermSearchModel } from 'src/app/modules/metadata/device-classes/shared/device-classes-perm-search.model';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { ConceptsCharacteristicsModel } from 'src/app/modules/metadata/concepts/shared/concepts-characteristics.model';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { ListRulesComponent } from './list-rules/list-rules.component';

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

    formGroupController = new UntypedFormGroup({});
    exportList: ChartsExportMeasurementModel[] = [];
    deviceList: DeviceInstancesModel[] = [];
    deviceTypes: Map<string, DeviceTypeModel> = new Map();
    dashboardId: string;
    widgetId: string;
    chartTypes = ['LineChart', 'ColumnChart', 'ScatterChart', 'PieChart', 'Timeline'];
    timeRangeEnum = ChartsExportRangeTimeTypeEnum;
    timeRangeTypes = [this.timeRangeEnum.Relative, this.timeRangeEnum.RelativeAhead, this.timeRangeEnum.Absolute];
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
    exportDeviceList: Map<string, ChartsExportMeasurementModel[] | DeviceInstancesModel[] | DeviceGroupsPermSearchModel[]> = new Map();
    emptyMap = new Map();
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;

    deviceGroups: DeviceGroupsPermSearchModel[] = [];
    aspects: AspectsPermSearchModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    deviceClasses: DeviceClassesPermSearchModel[] = [];
    concepts: Map<string, ConceptsCharacteristicsModel | null> = new Map();

    constructor(
        private dialogRef: MatDialogRef<ChartsExportEditDialogComponent>,
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private exportService: ExportService,
        private deviceInstancesService: DeviceInstancesService,
        private deviceTypeService: DeviceTypeService,
        private _formBuilder: UntypedFormBuilder,
        private cd: ChangeDetectorRef,
        private deviceGroupsService: DeviceGroupsService,
        private conceptsService: ConceptsService,
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
        this.getWidgetData().subscribe(_ => this.ready = true);
    }

    getWidgetData(): Observable<any> {
        return new Observable<any>(obs => {
            this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
                this.setDefaultValues(widget);
                this.initDeployments(widget).subscribe(_ => {
                    this.initFormGroup(widget);
                    this.selectionChange(widget.properties.exports || []);
                    obs.next(null);
                    obs.complete();
                });
            });
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
            }),
        });
        this.groupTypeIsDifference = widget.properties.group?.type?.startsWith('difference') || false;
        this.formGroupController.get('properties.group.type')?.valueChanges.subscribe((val) => {
            this.groupTypeIsDifference = val.startsWith('difference');
            if (this.groupTypeIsDifference) {
                this.dataSource.data.forEach((element) => (element.math = ''));
            }
        });
        widget.properties.exports?.forEach((exp) => {
            if ((exp as DeviceInstancesModel).device_type === undefined &&
                ((exp as ChartsExportMeasurementModel).exportDatabaseId === undefined || (exp as ChartsExportMeasurementModel).exportDatabaseId === environment.exportDatabaseIdInternalInfluxDb)) {
                this.preloadExportTags(exp.id || '').subscribe();
            }
        });
        this.formGroupController.get('properties.exports')?.valueChanges.subscribe((exports: (ChartsExportMeasurementModel | DeviceInstancesModel)[]) => {
            exports.forEach((exp) => {
                if ((exp as DeviceInstancesModel).device_type === undefined &&
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

    initDeployments(widget: WidgetModel): Observable<any> {
        const obs: Observable<any>[] = [];
        obs.push(this.exportService.getExports(true, '', 9999, 0, 'name', 'asc', undefined, undefined).pipe(map((exports: ExportResponseModel | null) => {
            if (exports !== null) {
                exports.instances?.forEach((exportModel: ExportModel) => {
                    if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                        this.exportList.push({
                            id: exportModel.ID,
                            name: exportModel.Name,
                            values: exportModel.Values,
                            exportDatabaseId: exportModel.ExportDatabaseID
                        });
                    }
                    this.exportDeviceList.set('Exports', this.exportList);
                    this.cd.detectChanges();
                });
                if (widget.properties.exports !== undefined) {
                    // exports values or names might have changed
                    widget.properties.exports.forEach((selected) => {
                        const latestExisting = exports.instances?.find((existing) => existing.ID === selected.id);
                        if (latestExisting !== undefined && latestExisting.Name !== undefined && latestExisting.ID !== undefined) {
                            (selected as ChartsExportMeasurementModel).values = latestExisting.Values;
                            selected.name = latestExisting.Name;
                        }
                    });
                }
            }
        })));
        obs.push(this.deviceInstancesService.getDeviceInstances(9999, 0)
            .pipe(
                map(devices => this.deviceInstancesService.useDisplayNameAsName(devices)),
                map(devices => devices as DeviceInstancesModel[]),
                map(devices => this.deviceList = devices),
                map(_ => {
                    this.exportDeviceList.set('Devices', this.deviceList);
                    this.cd.detectChanges();
                })));
        obs.push(this.deviceGroupsService.getDeviceGroups('', 10000, 0, 'name', 'asc').pipe(mergeMap(deviceGroups => {
            this.deviceGroups = deviceGroups;
            const ascpectIds: Map<string, null> = new Map();
            const functionIds: Map<string, null> = new Map();
            const deviceClassids: Map<string, null> = new Map();
            const innerObs: Observable<any>[] = [];
            this.deviceGroups.forEach(dg => {
                dg.criteria.forEach(c => {
                    ascpectIds.set(c.aspect_id, null);
                    functionIds.set(c.function_id, null);
                    deviceClassids.set(c.device_class_id, null);
                });
                innerObs.push(this.deviceGroupsService.getDeviceGroup(dg.id, true).pipe(map(newDg => {
                    const criteria: DeviceGroupCriteriaModel[] = [];
                    newDg?.criteria.forEach(c => {
                        if (criteria.findIndex(c2 => c.aspect_id === c2.aspect_id && c.function_id === c2.function_id && c.device_class_id === c2.device_class_id) === -1) {
                            // filters interaction, irrelevant for widget
                            c.interaction = '';
                            criteria.push(c);
                        }
                    });
                    dg.criteria = criteria;
                })));

            });
            this.exportDeviceList.set('Device Groups', this.deviceGroups);
            innerObs.push(this.deviceGroupsService.getAspectListByIds(Array.from(ascpectIds.keys())).pipe(map(aspects => this.aspects = aspects)));
            innerObs.push(this.deviceGroupsService.getFunctionListByIds(Array.from(functionIds.keys())).pipe(map(functions => this.functions = functions)));
            innerObs.push(this.deviceGroupsService.getDeviceClassListByIds(Array.from(deviceClassids.keys())).pipe(map(deviceClasses => this.deviceClasses = deviceClasses)));
            return forkJoin(innerObs);
        })));
        return forkJoin(obs);
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

    updateName(): Observable<DashboardResponseMessageModel> {
        const newName = (this.formGroupController.get('name') as FormControl).value;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widgetId, newName);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        this.formGroupController.patchValue({properties: {vAxes: this.dataSource.data}});
        const newProperties = (this.formGroupController.get('properties') as FormControl).value;
        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widgetId, [], newProperties);
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
                this.dialogRef.close(this.formGroupController.value);
            }
        });
    }

    selectionChange(selectedExports: (ChartsExportMeasurementModel | DeviceInstancesModel)[]) {
        const newData: Map<string, ChartsExportVAxesModel[]> = new Map();
        const newSelection: ChartsExportVAxesModel[] = [];
        const observables: Observable<any>[] = [];
        (selectedExports || []).forEach((selectedElement: ChartsExportMeasurementModel | DeviceInstancesModel | DeviceGroupsPermSearchModel) => {
            if (!newData.has(selectedElement.name)) {
                newData.set(selectedElement.name, []);
            }
            if ((selectedElement as ChartsExportMeasurementModel).values !== undefined) { // is export
                selectedElement = selectedElement as ChartsExportMeasurementModel;
                selectedElement.values?.forEach((value: ExportValueModel) => {
                    const newVAxis: ChartsExportVAxesModel = {
                        instanceId: value.InstanceID,
                        exportName: selectedElement.name,
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
                        newData.get(selectedElement.name)?.push(newVAxis);
                    } else {
                        newSelection.push(this.formGroupController.get('properties.vAxes')?.value[index]);
                        newData.get(selectedElement.name)?.push(this.formGroupController.get('properties.vAxes')?.value[index]);
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
            } else if ((selectedElement as DeviceGroupsPermSearchModel)?.criteria !== undefined) { // is device group
                const deviceGroup = (selectedElement as DeviceGroupsPermSearchModel);
                deviceGroup.criteria.forEach(criteria => {
                    const f = this.functions.find(func => func.id === criteria.function_id);
                    if (f === undefined) {
                        return;
                    }
                    const conceptSubs: Observable<ConceptsCharacteristicsModel|null|undefined> = this.concepts.get(f.concept_id) !== undefined ? of(this.concepts.get(f.concept_id)) :
                        this.conceptsService.getConceptWithCharacteristics(f.concept_id).pipe(map(c => {
                            if (c!==null) {
                                this.concepts.set(c?.id, c);
                            }
                            return c;
                        }));
                    observables.push(
                        conceptSubs.pipe(map(concept => {
                            if (concept === undefined || concept === null) {
                                return;
                            }
                            const newVAxis: ChartsExportVAxesModel = {
                                exportName: selectedElement.name,
                                valueName: this.describeCriteria()(criteria),
                                criteria,
                                deviceGroupId: deviceGroup.id,
                                valueType: this.translateTypeDeviceToExport(concept.characteristics.find(char => char.id === concept.base_characteristic_id)?.type || ''),
                                color: '',
                                math: '',
                                displayOnSecondVAxis: false,
                                tagSelection: [],
                            };
                            const index = this.formGroupController
                                .get('properties.vAxes')
                                ?.value.findIndex(
                                    (item: ChartsExportVAxesModel) => item.deviceGroupId === newVAxis.deviceGroupId && JSON.stringify(item.criteria) === JSON.stringify(newVAxis.criteria));
                            if (index === -1) {
                                newData.get(selectedElement.name)?.push(newVAxis);
                            } else {
                                newSelection.push(this.formGroupController.get('properties.vAxes')?.value[index]);
                                newData.get(selectedElement.name)?.push(this.formGroupController.get('properties.vAxes')?.value[index]);
                            }
                            // Add duplicates of this device group value
                            const duplicates = this.formGroupController
                                .get('properties.vAxes')
                                ?.value.filter(
                                    (item: ChartsExportVAxesModel) =>
                                        item.isDuplicate && item.deviceGroupId === newVAxis.deviceGroupId && JSON.stringify(item.criteria) === JSON.stringify(newVAxis.criteria)
                                );
                            newSelection.push(...duplicates);
                        })));
                });
            } else {
                selectedElement = selectedElement as DeviceInstancesModel;
                let observableDeviceType: Observable<DeviceTypeModel | undefined>;
                if (this.deviceTypes.has(selectedElement.device_type.id)) {
                    observableDeviceType = of(this.deviceTypes.get(selectedElement.device_type.id));
                } else {
                    observableDeviceType = this.deviceTypeService.getDeviceType(selectedElement.device_type.id).pipe(map(dt => {
                        if (dt === null) {
                            return;
                        }
                        this.deviceTypes.set((selectedElement as DeviceInstancesModel).device_type.id, dt);
                        return dt;
                    }));
                }
                observables.push(observableDeviceType.pipe(map(dt => {
                    dt?.services.forEach(service => {
                        service.outputs.forEach(output => {
                            this.deviceTypeService.getValuePathsAndTypes(output.content_variable).forEach(path => {
                                const newVAxis = {
                                    exportName: selectedElement.name,
                                    valueName: service.name + ': ' + path.path,
                                    valuePath: path.path,
                                    serviceId: service.id,
                                    deviceId: selectedElement.id,
                                    valueType: this.translateTypeDeviceToExport(path.type),
                                    color: '',
                                    math: '',
                                    displayOnSecondVAxis: false,
                                    tagSelection: [],
                                };
                                const index = this.formGroupController
                                    .get('properties.vAxes')
                                    ?.value.findIndex(
                                        (item: ChartsExportVAxesModel) =>
                                            item.serviceId === newVAxis.serviceId &&
                                            item.deviceId === newVAxis.deviceId &&
                                            item.valueName === newVAxis.valueName
                                    );
                                if (index === -1) {
                                    newData.get(selectedElement.name)?.push(newVAxis);
                                } else {
                                    newSelection.push(this.formGroupController.get('properties.vAxes')?.value[index]);
                                    newData.get(selectedElement.name)?.push(this.formGroupController.get('properties.vAxes')?.value[index]);
                                }
                                // Add duplicates of this device value
                                const duplicates = this.formGroupController
                                    .get('properties.vAxes')
                                    ?.value.filter(
                                        (item: ChartsExportVAxesModel) =>
                                            item.isDuplicate &&
                                            item.serviceId === newVAxis.serviceId &&
                                            item.deviceId === newVAxis.deviceId &&
                                            item.valueName === newVAxis.valueName
                                    );
                                newSelection.push(...duplicates);
                            });
                        });
                    });
                })));
            }
        });
        if (observables.length === 0) {
            observables.push(of(null));
        }
        forkJoin(observables).subscribe(_ => {
            this.vAxesOptions = newData;
            this.dataSource.data = newSelection;
            this.cd.detectChanges();
        });
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

    listRules(element: ChartsExportVAxesModel) {
        const dialog = this.dialog.open(ListRulesComponent, {
            data: element.conversions || []
        });

        dialog.afterClosed().subscribe({
            next: (rules: ChartsExportConversion[]) => {
                if(rules != null) {
                    element.conversions = rules;
                }
            },
            error: (_) => {

            }
        });
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
        element.conversions.push({from, to, color: element.__color, alias: element.__alias});
        element.__from = undefined;
        element.__to = undefined;
        element.__color = undefined;
        element.__alias = undefined;
    }

    getTags(element: ChartsExportVAxesModel): Map<string, { value: string; parent: string }[]> {
        return this.exportTags.get(element.instanceId || '') || this.emptyMap;
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
                        v.map((t) => ({value: t, parent: k})),
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

    private translateTypeDeviceToExport(type: string): string {
        switch (type) {
        case this.typeString:
            return 'string';
        case this.typeFloat:
            return 'float';
        case this.typeInteger:
            return 'int';
        case this.typeBoolean:
            return 'bool';
        case this.typeList:
        case this.typeStructure:
            return 'string_json';
        }
        console.error('unknown type ' + type);
        return '';
    }

    validateInterval: ValidatorFn = (control: AbstractControl) => {
        const type = this.formGroupController.get('properties.group.type')?.value;
        if (type === undefined || type === null || type.length === 0) {
            return null;
        }
        if (control.value === undefined || control.value === null || control.value.length === 0) {
            return {validateInterval: {value: control.value}};
        }
        const re = new RegExp('\\d+(ns|u|µ|ms|s|months|y|m|h|d|w)');
        const matches = re.exec(control.value);
        if (matches == null || matches.length === 0 || matches[0].length !== control.value.length) {
            return {validateInterval: {value: control.value}};
        }
        return null;
    };

    groupTypes(): string[] {
        const res = [
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
        const influxExp = (this.exports.value as (ChartsExportMeasurementModel | DeviceInstancesModel | DeviceGroupsPermSearchModel)[])
            ?.find(exp => (exp as DeviceInstancesModel).device_type === undefined &&
                (((exp as ChartsExportMeasurementModel).exportDatabaseId === undefined && (exp as DeviceGroupsPermSearchModel).criteria === undefined) || (exp as ChartsExportMeasurementModel).exportDatabaseId === environment.exportDatabaseIdInternalInfluxDb));
        if (influxExp === undefined) {
            res.push('time-weighted-mean-linear', 'time-weighted-mean-locf');
        }
        return res;
    }

    describeCriteria(): (criteria: DeviceGroupCriteriaModel) => string {
        return criteria => (this.functions.find(f => f.id === criteria.function_id)?.display_name || criteria.function_id) + ' ' + (criteria.device_class_id !== '' ? this.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '' : '') + ' ' + (criteria.aspect_id !== '' ? this.aspects.find(a => a.id === criteria.aspect_id)?.name || '' : '');
    }
}
