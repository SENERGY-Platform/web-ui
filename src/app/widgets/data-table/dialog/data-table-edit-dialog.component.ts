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
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {
    ExportModel,
    ExportValueBaseModel,
    ExportValueCharacteristicModel
} from '../../../modules/exports/shared/export.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {AbstractControl, FormArray, FormControl, FormGroup, UntypedFormBuilder, Validators} from '@angular/forms';
import {DeviceStatusConfigConvertRuleModel} from '../../device-status/shared/device-status-properties.model';
import {
    DataTableElementModel,
    DataTableElementTypesEnum,
    DataTableOrderEnum,
    ExportValueTypes
} from '../shared/data-table.model';
import {
    DeviceTypeFunctionModel,
    DeviceTypeInteractionEnum,
    DeviceTypeServiceModel,
} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import {
    DeviceInstancesPermSearchModel,
    DeviceSelectablesModel,
} from '../../../modules/devices/device-instances/shared/device-instances.model';
import {DataTableHelperService} from '../shared/data-table-helper.service';
import {ExportService} from '../../../modules/exports/shared/export.service';
import {PipelineModel, PipelineOperatorModel} from '../../../modules/data/pipeline-registry/shared/pipeline.model';
import {V2DeploymentsPreparedModel} from '../../../modules/processes/deployments/shared/deployments-prepared-v2.model';
import {forkJoin, Observable, of} from 'rxjs';
import {flatMap, map} from 'rxjs/operators';
import {ProcessSchedulerService} from '../../process-scheduler/shared/process-scheduler.service';
import {DataTableService} from '../shared/data-table.service';
import {boundaryValidator, elementDetailsValidator, exportValidator} from './data-table-edit-dialog.validators';
import {util} from 'jointjs';
import {environment} from '../../../../environments/environment';
import uuid = util.uuid;

@Component({
    templateUrl: './data-table-edit-dialog.component.html',
    styleUrls: ['./data-table-edit-dialog.component.css'],
})
export class DataTableEditDialogComponent implements OnInit {
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    step = -1;
    elementTypes = DataTableElementTypesEnum;
    exportTypes = ExportValueTypes;
    orderValues = DataTableOrderEnum;
    operatorExportValueCache = new Map<string, ExportValueBaseModel[]>();
    numReady = 0;
    numReadyNeeded = 2; // helper and widget raw data
    ready = false;
    saving = false;
    icons: string[] = [
        'power',
        'power_off',
        'toggle_on',
        'toggle_off',
        'sensor_window',
        'sensor_door',
        'meeting_room',
        'tv',
        'tv_off',
        'flash_on',
        'flash_off',
        'emoji_objects',
        'check_circle_outline',
        'highlight_off',
    ];
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
    formGroup = this.fb.group({
        name: [undefined, Validators.required],
        order: [undefined, Validators.required],
        valueAlias: [undefined],
        refreshTime: [undefined],
        elements: this.fb.array([]),
        convertRules: this.fb.array([]),
        valuesPerElement: [1, Validators.min(1)],
    });

    constructor(
        private dialogRef: MatDialogRef<DataTableEditDialogComponent>,
        public dataTableHelperService: DataTableHelperService,
        private dataTableService: DataTableService,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        private exportService: ExportService,
        private fb: UntypedFormBuilder,
        private processSchedulerService: ProcessSchedulerService,
        private cdref: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) data: { dashboardId: string; widgetId: string },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    get convertRulesControl(): FormArray {
        return this.formGroup.get('convertRules') as FormArray;
    }

    ngOnInit() {
        this.dataTableHelperService.initialize().subscribe(() => {
            this.numReady++;
            this.setReady();
        });
        this.getWidgetData();
    }

    onFunctionSelected(element: AbstractControl): Observable<DeviceSelectablesModel[]> {
        const functionId = element.get('elementDetails')?.get('device')?.get('functionId')?.value;
        const aspectId = element.get('elementDetails')?.get('device')?.get('aspectId')?.value;
        if (aspectId) {
            return this.dataTableHelperService.preloadDevicesOfFunctionAndAspect(aspectId, functionId);
        }
        return of([]);
    }

    compareSelectables(a: DeviceInstancesPermSearchModel, b: DeviceInstancesPermSearchModel) {
        return a !== undefined && b !== undefined && a.id !== undefined && b.id !== undefined && a.id === b.id;
    }

    compareValues(a: ExportValueCharacteristicModel, b: ExportValueCharacteristicModel) {
        return (
            a !== undefined &&
            b !== undefined &&
            a.Name !== undefined &&
            b.Name !== undefined &&
            a.Path !== undefined &&
            b.Path !== undefined &&
            a.Name === b.Name &&
            a.Path === b.Path
        );
    }

    compareServices(a: DeviceTypeServiceModel, b: DeviceTypeServiceModel) {
        return a !== undefined && b !== undefined && a.id !== undefined && b.id !== undefined && a.id === b.id;
    }

    compareExportValues(a: ExportValueCharacteristicModel, b: ExportValueCharacteristicModel): boolean {
        return a !== undefined && b !== undefined && a.Path !== undefined && b.Path !== undefined && a.Path === b.Path;
    }

    compareExports(a: ExportModel, b: ExportModel) {
        return a !== undefined && b !== undefined && a.ID !== undefined && b.ID !== undefined && a.ID === b.ID;
    }

    getWidgetData() {
        if (this.dashboardId === undefined || this.widgetId === undefined) {
            return;
        }
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.formGroup.patchValue({
                name: widget.name,
                order: widget.properties.dataTable?.order || this.orderValues.Default,
                valueAlias: widget.properties.dataTable?.valueAlias,
                refreshTime: widget.properties.dataTable?.refreshTime || 60,
                valuesPerElement: widget.properties.dataTable?.valuesPerElement || 1,
            });

            const convertRules = widget.properties.dataTable?.convertRules || [];
            convertRules.forEach((rule) => this.addConvertRule(rule));

            const measurements: DataTableElementModel[] = this.widget.properties.dataTable?.elements || [];
            measurements.forEach((measurement) => this.addMeasurement(measurement, true));

            if (measurements.length === 0) {
                this.addNewMeasurement();
            }
            this.numReady++;
            this.setReady();
        });
    }

    getElements(): FormArray {
        return this.formGroup.get('elements') as FormArray;
    }

    getWarningGroup(element: AbstractControl): FormGroup {
        return element.get('warning') as FormGroup;
    }

    addMeasurement(measurement: DataTableElementModel | undefined, init: boolean = false) {
        const newGroup = this.fb.group(
            {
                id: [undefined, Validators.required],
                name: [undefined, Validators.required],
                valueType: [undefined, Validators.required],
                format: [undefined],
                exportId: [undefined, Validators.required],
                exportValuePath: [undefined],
                exportValueName: [undefined],
                exportCreatedByWidget: [undefined],
                exportTagSelection: [undefined],
                exportDbId: [undefined],
                groupType: [undefined],
                groupTime: [undefined],
                unit: [undefined],
                warning: this.fb.group(
                    {
                        enabled: [false],
                        lowerBoundary: [undefined],
                        upperBoundary: [undefined],
                    },
                    {validators: [boundaryValidator()]},
                ),
                elementDetails: this.fb.group(
                    {
                        elementType: [DataTableElementTypesEnum.DEVICE, Validators.required],
                        device: this.fb.group({
                            aspectId: [undefined],
                            functionId: [undefined],
                            deviceId: [undefined],
                            serviceId: [undefined],
                            deploymentId: [undefined],
                            requestDevice: [false],
                            scheduleId: [undefined],
                        }),
                        pipeline: this.fb.group({
                            pipelineId: [undefined],
                            operatorId: [undefined],
                        }),
                        import: this.fb.group({
                            typeId: [undefined],
                            instanceId: [undefined],
                        }),
                    },
                    {validators: [elementDetailsValidator()]},
                ),
            },
            {validators: [exportValidator()]},
        );

        // Init valueChanges listeners
        newGroup
            .get('elementDetails')
            ?.get('elementType')
            ?.valueChanges.subscribe((elementType) => this.enableDisableElementDetailsFields(newGroup, elementType));

        newGroup
            .get('elementDetails')
            ?.get('device')
            ?.get('aspectId')
            ?.valueChanges.subscribe((aspectId) => {
                if (aspectId !== null) {
                    if (init) {
                        this.numReadyNeeded++;
                    }
                    this.dataTableHelperService.preloadMeasuringFunctionsOfAspect(aspectId).subscribe(() => {
                        if (init) {
                            this.numReady++;
                            this.setReady();
                        }
                    });
                }
            });

        newGroup
            .get('elementDetails')
            ?.get('device')
            ?.get('functionId')
            ?.valueChanges.subscribe(() => {
                if (init) {
                    this.numReadyNeeded++;
                }
                this.onFunctionSelected(newGroup).subscribe(() => {
                    if (init) {
                        this.numReady++;
                        this.setReady();
                    }
                });
            });

        newGroup
            .get('elementDetails')
            ?.get('device')
            ?.get('serviceId')
            ?.valueChanges.subscribe(() => {
                this.onServiceSelected(newGroup);
                this.onExportValueSelected(newGroup);
            }
            );

        newGroup
            .get('elementDetails')
            ?.get('device')
            ?.get('deviceId')
            ?.valueChanges.subscribe(() => {
                this.onExportValueSelected(newGroup);
                this.runChangeDetection();  // avoids changedAfterChecked error
            });

        newGroup
            .get('elementDetails')
            ?.get('pipeline')
            ?.get('operatorId')
            ?.valueChanges.subscribe(() => this.onOperatorSelected(newGroup));

        newGroup
            .get('elementDetails.import.typeId')
            ?.valueChanges.subscribe((id) => this.dataTableHelperService.preloadFullImportType(id).subscribe());

        newGroup.get('exportValuePath')?.valueChanges.subscribe(() => this.onExportValueSelected(newGroup));

        newGroup.get('valueType')?.valueChanges.subscribe((value) => {
            if (value === this.exportTypes.INTEGER || value === this.exportTypes.FLOAT) {
                this.getWarningGroup(newGroup).get('enabled')?.enable();
                newGroup.get('format')?.enable();
            } else {
                this.getWarningGroup(newGroup).disable();
                newGroup.get('format')?.disable();
            }
            this.runChangeDetection();
        });

        newGroup
            .get('warning')
            ?.get('enabled')
            ?.valueChanges.subscribe((enabled) => {
                const warnGroup = this.getWarningGroup(newGroup);
                if (!enabled) {
                    warnGroup.patchValue({
                        lowerBoundary: undefined,
                        upperBoundary: undefined,
                    });
                    warnGroup.get('lowerBoundary')?.disable();
                    warnGroup.get('upperBoundary')?.disable();
                } else {
                    warnGroup.get('lowerBoundary')?.enable();
                    warnGroup.get('upperBoundary')?.enable();
                }
            });

        newGroup.get('exportId')?.valueChanges.subscribe((exportId) => {
            this.dataTableHelperService.preloadExportTags(exportId).subscribe();
            newGroup.get('exportDbId')?.setValue(this.dataTableHelperService.getPreloadedExportById(exportId)?.ExportDatabaseID);
        });

        if (measurement !== undefined) {
            newGroup.patchValue(measurement);
        } else {
            newGroup.patchValue({id: uuid()});
        }
        this.getElements().push(newGroup);
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.saving = true;
        this.ensureCorrectExportCreatedByWidget();
        this.widget.name = this.formGroup.get('name')?.value;
        const observables: Observable<any>[] = [];
        observables.push(...this.createDeploymentsAndSchedules());
        observables.push(...this.dataTableService.deleteElementsAndObserve(this.widget.properties.dataTable?.elements));
        observables.push(...this.createExports());

        forkJoin(observables)
            .pipe(
                flatMap(() => {
                    this.widget.properties.dataTable = this.formGroup.value;
                    return this.dashboardService.updateWidget(this.dashboardId, this.widget);
                }),
            )
            .subscribe((resp) => {
                if (resp.message === 'OK') {
                    this.dialogRef.close(this.widget);
                } else {
                    this.saving = false;
                }
            });
    }

    addNewMeasurement() {
        this.addMeasurement(undefined);
        this.step = this.getElements().controls.length - 1;
    }

    getBoundaryWarningTooltip(element: AbstractControl): string {
        const wg = this.getWarningGroup(element);
        const warningEnabled = wg.get('enabled') as FormControl;
        if (warningEnabled.value === true && wg.invalid) {
            if (wg.getError('lowerBiggerThanUpper') !== undefined) {
                return 'Lower boundary can\'t be bigger than upper boundary';
            }
            if (wg.getError('nothingSelected') !== undefined) {
                return 'Set at least one value';
            }
        }
        if (warningEnabled.disabled && (element.get('valueType') as FormControl).valid) {
            return 'Warnings only work with numeric types';
        }
        return '';
    }

    compareStrings(a: any, b: any): boolean {
        return a !== undefined && b !== undefined && a === b;
    }

    removeTab(index: number) {
        this.getElements().controls.splice(index, 1);
        this.step = index - 1;
    }

    moveUp(index: number) {
        this.changePosition(index, true);
    }

    moveDown(index: number) {
        this.changePosition(index, false);
    }

    changePosition(index: number, isUp: boolean) {
        const removed = this.getElement(index);
        this.getElements().controls.splice(index, 1);
        if (isUp) {
            this.getElements().controls.splice(index - 1, 0, removed);
        } else {
            this.getElements().controls.splice(index + 1, 0, removed);
        }
    }

    addConvertRule(convertRule: DeviceStatusConfigConvertRuleModel = {} as DeviceStatusConfigConvertRuleModel) {
        this.convertRulesControl.push(this.setConvertRule(convertRule));
    }

    getIcon(index: number): string {
        return this.convertRulesControl.at(index).value.icon;
    }

    getColor(index: number): string {
        return this.convertRulesControl.at(index).value.color;
    }

    deleteConvertRule(index: number): void {
        this.convertRulesControl.removeAt(index);
    }

    isDevice(element: AbstractControl): boolean {
        return element.get('elementDetails')?.get('elementType')?.value === this.elementTypes.DEVICE;
    }

    isPipeline(element: AbstractControl): boolean {
        return element.get('elementDetails')?.get('elementType')?.value === this.elementTypes.PIPELINE;
    }

    isImport(element: AbstractControl): boolean {
        return element.get('elementDetails')?.get('elementType')?.value === this.elementTypes.IMPORT;
    }

    getFunctions(element: AbstractControl): DeviceTypeFunctionModel[] {
        if (!this.ready) {
            return [];
        }
        let functions: DeviceTypeFunctionModel[] = [];
        const aspectId = element.get('elementDetails')?.get('device')?.get('aspectId')?.value;
        if (aspectId !== undefined && aspectId !== null) {
            functions = this.dataTableHelperService.getMeasuringFunctionsOfAspect(aspectId);
        }
        let functionId = element.get('elementDetails')?.get('device')?.get('functionId')?.value;
        if (functionId !== null && functions.findIndex((f) => f.id === functionId) === -1) {
            functionId = null;
            element.get('elementDetails')?.get('device')?.patchValue({functionId});
        }
        if (functionId === null && functions.length === 1) {
            element.get('elementDetails')?.get('device')?.patchValue({functionId: functions[0].id});
        }
        return functions;
    }

    getSelectables(element: AbstractControl): DeviceSelectablesModel[] {
        if (!this.ready) {
            return [];
        }
        const aspectId = element.get('elementDetails')?.get('device')?.get('aspectId')?.value;
        const functionId = element.get('elementDetails')?.get('device')?.get('functionId')?.value;
        const selectables = this.dataTableHelperService.getDevicesOfFunctionAndAspect(aspectId, functionId);

        let deviceId = element.get('elementDetails')?.get('device')?.get('deviceId')?.value;
        if (deviceId !== null && selectables.findIndex((d) => d.device.id === deviceId) === -1) {
            deviceId = null;
            element.get('elementDetails')?.get('device')?.patchValue({deviceId});
        }
        if (deviceId === null && selectables.length === 1) {
            element.get('elementDetails')?.get('device')?.patchValue({deviceId: selectables[0].device.id});
        }

        return selectables;
    }

    getServices(element: AbstractControl): DeviceTypeServiceModel[] {
        if (!this.ready) {
            return [];
        }
        const deviceId = element.get('elementDetails')?.get('device')?.get('deviceId')?.value;
        let selectedSelectable: DeviceSelectablesModel | undefined = {services: [] as DeviceTypeServiceModel[]} as DeviceSelectablesModel;
        if (deviceId !== null) {
            selectedSelectable = this.getSelectables(element).find((selectable) => selectable.device.id === deviceId);
            if (selectedSelectable === undefined) {
                selectedSelectable = {services: [] as DeviceTypeServiceModel[]} as DeviceSelectablesModel;
            }
        }
        let serviceId = element.get('elementDetails')?.get('device')?.get('serviceId')?.value;
        if (serviceId !== null && selectedSelectable.services.findIndex((s) => s.id === serviceId) === -1) {
            serviceId = null;
            element.get('elementDetails')?.get('device')?.patchValue({serviceId});
        }
        if (serviceId === null && selectedSelectable.services.length === 1) {
            element.get('elementDetails')?.get('device')?.patchValue({serviceId: selectedSelectable.services[0].id});
        }

        return selectedSelectable.services;
    }

    getServiceValues(element: AbstractControl): ExportValueCharacteristicModel[] {
        if (!this.ready) {
            return [];
        }
        const selectedService = this.getSelectedService(element);
        let values: ExportValueCharacteristicModel[] = [];
        if (selectedService !== undefined) {
            values = this.dataTableHelperService.getServiceValues(selectedService);
        }

        let exportValuePath = element.get('exportValuePath')?.value;
        if (exportValuePath !== null && values.findIndex((v) => v.Path === exportValuePath) === -1) {
            exportValuePath = null;
            element.patchValue({exportValuePath});
        }
        if (exportValuePath === null && values.length === 1) {
            element.patchValue({exportValuePath: values[0].Path});
        }

        return values;
    }

    getExports(element: AbstractControl): ExportModel[] {
        if (!this.ready) {
            return [];
        }
        let exports: ExportModel[] = [];

        const exportValuePath = element.get('exportValuePath')?.value;
        if (exportValuePath !== undefined && exportValuePath !== null && exportValuePath !== '') {
            if (this.isDevice(element)) {
                const deviceId = element.get('elementDetails')?.get('device')?.get('deviceId')?.value;
                const serviceId = element.get('elementDetails')?.get('device')?.get('serviceId')?.value;
                if (deviceId !== null && serviceId !== null) {
                    exports = this.dataTableHelperService.getExportsForDeviceAndValue(serviceId, deviceId, exportValuePath);
                }
            } else if (this.isPipeline(element)) {
                const pipelineId = element.get('elementDetails')?.get('pipeline')?.get('pipelineId')?.value;
                if (pipelineId !== null) {
                    const operatorId = element.get('elementDetails')?.get('pipeline')?.get('operatorId')?.value;
                    if (operatorId !== null) {
                        const operator = this.getOperators(element).find((op) => op.id === operatorId);
                        if (operator !== undefined) {
                            exports = this.dataTableHelperService.getExportsForPipelineOperatorValue(
                                pipelineId,
                                operator.name,
                                operatorId,
                                exportValuePath,
                            );
                        }
                    }
                }
            } else if (this.isImport(element)) {
                exports = this.dataTableHelperService.getExportsOfImportInstance(
                    element.get('elementDetails.import.instanceId')?.value,
                    exportValuePath,
                );
            }
        }

        if (exports.length === 0) {
            element.get('exportId')?.disable();
            element.patchValue({exportCreatedByWidget: true});
        } else {
            element.get('exportId')?.enable();
            element.patchValue({exportCreatedByWidget: false});
        }

        let exportId = element.get('exportId')?.value;
        if (exportId !== null) {
            if (exports.findIndex((e) => e.ID === exportId) === -1) {
                exportId = null;
                element.patchValue({exportId});
            }
        }
        if (exportId === null && exports.length === 1) {
            element.patchValue({exportId: exports[0].ID});
        }

        return exports;
    }

    getOperators(element: AbstractControl): PipelineOperatorModel[] {
        if (!this.ready) {
            return [];
        }
        const pipelineId = element.get('elementDetails')?.get('pipeline')?.get('pipelineId')?.value;
        let selectedPipeline: PipelineModel | undefined = {operators: [] as PipelineOperatorModel[]} as PipelineModel;
        if (pipelineId !== null) {
            selectedPipeline = this.dataTableHelperService.getPipelines().find((pipe) => pipe.id === pipelineId);
            if (selectedPipeline === undefined) {
                selectedPipeline = {operators: [] as PipelineOperatorModel[]} as PipelineModel;
            }
        }

        let operatorId = element.get('elementDetails')?.get('pipeline')?.get('operatorId')?.value;
        if (operatorId !== null && selectedPipeline.operators.findIndex((o) => o.id === operatorId) === -1) {
            operatorId = null;
            element.get('elementDetails')?.get('pipeline')?.patchValue({operatorId});
        }
        if (operatorId === null && selectedPipeline.operators.length === 1) {
            element.get('elementDetails')?.get('pipeline')?.patchValue({operatorId: selectedPipeline.operators[0].id});
        }

        return selectedPipeline.operators;
    }

    getOperatorValues(element: AbstractControl): ExportValueBaseModel[] {
        if (!this.ready) {
            return [];
        }
        const values: ExportValueBaseModel[] = [];
        const operatorId = this.getSelectedOperator(element)?.operatorId;
        if (operatorId !== undefined && operatorId !== null) {
            if (this.operatorExportValueCache.has(operatorId)) {
                return this.operatorExportValueCache.get(operatorId) || [];
            }
            const ioModels = this.dataTableHelperService.getOperator(operatorId)?.outputs || [];
            ioModels.forEach((ioModel) =>
                values.push({
                    Name: ioModel.name,
                    Path: 'analytics.' + ioModel.name,
                    Type: ioModel.type,
                }),
            );
            if (values.length > 0) {
                this.operatorExportValueCache.set(operatorId, values);
            }
        }

        let exportValuePath = element.get('exportValuePath')?.value;
        if (exportValuePath !== null && values.findIndex((v) => v.Path === exportValuePath) === -1) {
            exportValuePath = null;
            element.patchValue({exportValuePath});
        }
        if (exportValuePath === null && values.length === 1) {
            element.patchValue({exportValuePath: values[0].Path});
        }
        return values;
    }

    getElement(index: number): FormGroup {
        return this.getElements().at(index) as FormGroup;
    }

    copyTab(index: number) {
        this.addNewMeasurement();
        const newIndex = this.getElements().length - 1;
        this.getElement(newIndex).patchValue(this.getElement(index).value);
        this.getElement(newIndex).patchValue({
            id: uuid(),
            exportValuePath: this.getElement(index).get('exportValuePath')?.value,
        });
        this.step = newIndex;
    }

    runChangeDetection() {
        this.cdref.detectChanges();
    }

    getOperatorViewValue(operator: PipelineOperatorModel): string {
        return operator.name + ' (' + operator.id + ')';
    }

    private getSelectedService(element: AbstractControl): DeviceTypeServiceModel | undefined {
        const serviceId = element.get('elementDetails')?.get('device')?.get('serviceId')?.value;
        if (serviceId === null) {
            return undefined;
        }
        return this.getServices(element).find((service) => service.id === serviceId);
    }

    private getSelectedPipeline(element: AbstractControl): PipelineModel | undefined {
        const pipelineId = element.get('elementDetails')?.get('pipeline')?.get('pipelineId')?.value;
        if (pipelineId === null) {
            return undefined;
        }
        return this.dataTableHelperService.getPipelines().find((pipe) => pipe.id === pipelineId);
    }

    private getSelectedOperator(element: AbstractControl): PipelineOperatorModel | undefined {
        const operatorId = element.get('elementDetails')?.get('pipeline')?.get('operatorId')?.value;
        if (operatorId === null) {
            return undefined;
        }
        return this.getOperators(element).find((operator) => operator.id === operatorId);
    }

    private getSelectedExport(element: AbstractControl): ExportModel | undefined {
        const exportId = element.get('exportId')?.value;
        if (exportId == null) {
            return undefined;
        }
        return this.getExports(element).find((ex) => ex.ID === exportId);
    }

    private onOperatorSelected(element: AbstractControl) {
        const operatorId = this.getSelectedOperator(element)?.operatorId;
        if (operatorId !== undefined) {
            this.dataTableHelperService.preloadOperator(operatorId).subscribe();
        }
    }

    private onExportValueSelected(element: AbstractControl) {
        const path = element.get('exportValuePath')?.value;
        if (path === null || path === undefined) {
            return;
        }
        const type = element.get('elementDetails')?.get('elementType')?.value;
        if (type === null || type === undefined) {
            return;
        }
        let values: ExportValueBaseModel[] = [];
        switch (type) {
        case this.elementTypes.PIPELINE:
            values = this.getOperatorValues(element);
            break;
        case this.elementTypes.DEVICE:
            values = this.getServiceValues(element);
            break;
        case this.elementTypes.IMPORT:
            values = this.dataTableHelperService.getImportTypeValues(element.get('elementDetails.import.typeId')?.value);
            break;
        default:
            throw new Error('DataTableEditDialogComponent:onExportValueSelected:Unknown type');
            return;
        }

        const value = values.find((val) => val.Path === path);
        if (value === undefined) {
            return;
        }
        element.patchValue({valueType: value.Type, exportValueName: value.Name});
    }

    private setConvertRule(convertRule: DeviceStatusConfigConvertRuleModel): FormGroup {
        return this.fb.group({
            status: [convertRule.status],
            icon: [convertRule.icon],
            color: [convertRule.color],
        });
    }

    private enableDisableElementDetailsFields(element: AbstractControl, elementType: DataTableElementTypesEnum) {
        switch (elementType) {
        case this.elementTypes.PIPELINE:
            element.get('elementDetails')?.get('device')?.disable();
            element.get('elementDetails')?.get('pipeline')?.enable();
            element.get('elementDetails')?.get('import')?.disable();
            break;
        case this.elementTypes.DEVICE:
            element.get('elementDetails')?.get('pipeline')?.disable();
            element.get('elementDetails')?.get('device')?.enable();
            element.get('elementDetails')?.get('import')?.disable();
            element.get('exportId')?.disable();
            break;
        case this.elementTypes.IMPORT:
            element.get('elementDetails')?.get('pipeline')?.disable();
            element.get('elementDetails')?.get('device')?.disable();
            element.get('elementDetails')?.get('import')?.enable();
            break;
        }
    }

    private onServiceSelected(element: AbstractControl) {
        const service = this.getSelectedService(element);
        if (service === undefined) {
            return;
        }
        let requestDevice = false;
        if (
            service.interaction === null ||
            service.interaction === undefined ||
            service.interaction === DeviceTypeInteractionEnum.Request
        ) {
            requestDevice = true;
        }
        element.get('elementDetails')?.get('device')?.patchValue({requestDevice});
    }

    private ensureCorrectExportCreatedByWidget() {
        const elements = (this.formGroup.get('elements') as FormArray).controls;
        elements.forEach((element) => {
            const id = element.get('id')?.value;
            if (id === undefined) {
                console.error('DataTableEditDialogComponent: id undefined', element.value);
                return;
            }
            const exportId = element.get('exportId')?.value;
            if (exportId === undefined) {
                console.error('DataTableEditDialogComponent: exportId undefined', element.value);
                return;
            }
            const existingElement = this.widget.properties.dataTable?.elements.find((e) => e.id === id);

            if (existingElement !== undefined && existingElement.exportCreatedByWidget && existingElement.exportId === exportId
                && (element.value.elementDetails?.device?.deviceId || '').length === 0) {
                element.patchValue({exportCreatedByWidget: true});
            }
            element.patchValue({
                exportDbId: element.get('exportCreatedByWidget')?.value === true ? environment.exportDatabaseIdInternalInfluxDb : undefined
            });
        });
    }

    private createExports(): Observable<any>[] {
        const elements = (this.formGroup.get('elements') as FormArray).controls;
        const observables: Observable<any>[] = [of(null)];
        elements.forEach((element) => {
            if (element.get('exportCreatedByWidget')?.value !== true) {
                return;
            }
            element.get('exportId')?.enable(); // if field is disabled, value will be omitted
            let preparedExport: ExportModel = {} as ExportModel;
            switch (element.get('elementDetails')?.get('elementType')?.value) {
            case this.elementTypes.DEVICE:
                const deviceId = element.get('elementDetails')?.get('device')?.get('deviceId')?.value;
                const selectedDevice = this.getSelectables(element).find((d) => d.device.id === deviceId)?.device;
                const selectedService = this.getSelectedService(element);
                if (selectedDevice === undefined || selectedService === undefined) {
                    return;
                }
                const exports = this.exportService.prepareDeviceServiceExport(selectedDevice, selectedService);
                if (exports.length !== 1) {
                    console.error('DataTableEditDialogComponent: No support for devices with multiple outputs!');
                    return;
                }
                preparedExport = exports[0];
                break;
            case this.elementTypes.PIPELINE:
                preparedExport = this.preparePipelineOperatorExport(element);
                break;
            case this.elementTypes.IMPORT:
                preparedExport = this.prepareImportExport(element);
                break;
            }
            preparedExport.Name = 'Widget: ' + this.formGroup.get('name')?.value;
            preparedExport.Description = 'generated Export';
            preparedExport.ExportDatabaseID = environment.exportDatabaseIdInternalTimescaleDb;

            observables.push(
                this.exportService.startPipeline(preparedExport).pipe(
                    map((model) => {
                        element.patchValue({exportId: model.ID});
                    }),
                ),
            );
        });
        return observables;
    }

    private preparePipelineOperatorExport(element: AbstractControl): ExportModel {
        const pipeline = this.getSelectedPipeline(element);
        const operator = this.getSelectedOperator(element);
        const exportValueName = element.get('exportValueName')?.value;
        const exportValuePath = element.get('exportValuePath')?.value;
        const valueType = element.get('valueType')?.value;

        if (
            pipeline === undefined ||
            operator === undefined ||
            exportValueName === undefined ||
            exportValuePath === undefined ||
            valueType === undefined
        ) {
            throw new Error('undefined values');
        }

        return {
            Name: pipeline.name + '_' + operator.name,
            TimePath: 'time',
            Values: [
                {
                    Name: exportValueName,
                    Path: exportValuePath,
                    Type: valueType,
                },
            ],
            EntityName: operator.id,
            Filter: pipeline.id + ':' + operator.id,
            FilterType: 'operatorId',
            ServiceName: operator.name,
            Topic: 'analytics-' + operator.name,
            Offset: 'largest',
            Generated: true,
            TimestampFormat: '%Y-%m-%dT%H:%M:%S.%fZ',
        } as ExportModel;
    }

    private getSelectedFunction(element: AbstractControl): DeviceTypeFunctionModel | undefined {
        const functionId = element.get('elementDetails')?.get('device')?.get('functionId')?.value;
        return this.getFunctions(element).find((f) => f.id === functionId);
    }

    private createDeploymentsAndSchedules(): Observable<any>[] {
        const elements = (this.formGroup.get('elements') as FormArray).controls;
        const observables: Observable<any>[] = [of(null)];
        elements.forEach((element, index) => {
            if (element.get('elementDetails')?.get('device')?.get('requestDevice')?.value === true) {
                const selectedFunction = this.getSelectedFunction(element);
                const refreshTime = this.formGroup.get('refreshTime')?.value;
                if (selectedFunction === undefined || refreshTime === undefined || refreshTime === null || refreshTime === 0) {
                    return;
                }

                const aspectId = element.get('elementDetails')?.get('device')?.get('aspectId')?.value;
                const serviceId = element.get('elementDetails')?.get('device')?.get('serviceId')?.value;
                const deviceId = element.get('elementDetails')?.get('device')?.get('deviceId')?.value;

                const xml =
                    '<?xml version="1.0" encoding="UTF-8"?>\n' +
                    '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn"><bpmn:process id="generatedByProcessStatusWidget" isExecutable="true"><bpmn:startEvent id="StartEvent_1"><bpmn:outgoing>SequenceFlow_1oborg2</bpmn:outgoing></bpmn:startEvent><bpmn:sequenceFlow id="SequenceFlow_1oborg2" sourceRef="StartEvent_1" targetRef="Task_0os5tro" /><bpmn:endEvent id="EndEvent_131n4r3"><bpmn:incoming>SequenceFlow_0lpgosu</bpmn:incoming></bpmn:endEvent><bpmn:sequenceFlow id="SequenceFlow_0lpgosu" sourceRef="Task_0os5tro" targetRef="EndEvent_131n4r3" /><bpmn:serviceTask id="Task_0os5tro" name="' +
                    selectedFunction.name +
                    '" camunda:type="external" camunda:topic="pessimistic"><bpmn:extensionElements><camunda:inputOutput><camunda:inputParameter name="payload">{\n' +
                    '    "function": {\n' +
                    '        "id": "' +
                    selectedFunction.id +
                    '",\n' +
                    '        "name": "' +
                    selectedFunction.name +
                    '",\n' +
                    '        "concept_id": "' +
                    selectedFunction.concept_id +
                    '",\n' +
                    '        "rdf_type": "https://senergy.infai.org/ontology/MeasuringFunction"\n' +
                    '    },\n' +
                    '    "device_class": null,\n' +
                    '    "aspect": {\n' +
                    '        "id": "' +
                    aspectId +
                    '",\n' +
                    '        "name": "aspect",\n' +
                    '        "rdf_type": "https://senergy.infai.org/ontology/Aspect"\n' +
                    '    },\n' +
                    '    "label": "getFunction",\n' +
                    '    "input": {},\n' +
                    '    "characteristic_id": "urn:infai:ses:characteristic:7621686a-56bc-402d-b4cc-5b266d39736f",\n' +
                    '    "retries": 0\n' +
                    '}</camunda:inputParameter><camunda:outputParameter name="outputs">${result}</camunda:outputParameter></camunda:inputOutput></bpmn:extensionElements><bpmn:incoming>SequenceFlow_1oborg2</bpmn:incoming><bpmn:outgoing>SequenceFlow_0lpgosu</bpmn:outgoing></bpmn:serviceTask></bpmn:process></bpmn:definitions>';

                const svg =
                    '<?xml version="1.0" encoding="utf-8"?>\n' +
                    '<!-- created with bpmn-js / http://bpmn.io -->\n' +
                    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
                    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="112" height="92" viewBox="254 74 112 92" version="1.1"><defs><marker id="sequenceflow-end-white-black-8shwih7rrgzkmm4pwfqg6rb2a" viewBox="0 0 20 20" refX="11" refY="10" markerWidth="10" markerHeight="10" orient="auto"><path d="M 1 5 L 11 10 L 1 15 Z" style="fill: black; stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1; stroke: black;"/></marker></defs><g class="djs-group"><g class="djs-element djs-shape" data-element-id="Task_10z5wf9" style="display: block;" transform="matrix(1 0 0 1 260 80)"><g class="djs-visual"><rect x="0" y="0" width="100" height="80" rx="10" ry="10" style="stroke: black; stroke-width: 2px; fill: white; fill-opacity: 0.95;"/><text lineHeight="1.2" class="djs-label" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: normal; fill: black;"><tspan x="11.4375" y="43.599999999999994">GENERATED!</tspan></text></g><rect x="0" y="0" width="100" height="80" class="djs-hit" style="fill: none; stroke-opacity: 0; stroke: white; stroke-width: 15px;"/><rect x="-6" y="-6" width="112" height="92" class="djs-outline" style="fill: none;"/></g></g></svg>';
                observables.push(
                    this.deploymentsService
                        .v2getPreparedDeploymentsByXml(xml, svg)
                        .pipe(
                            map((pD: V2DeploymentsPreparedModel | null) => {
                                if (
                                    pD !== null &&
                                    pD.elements.length === 1 &&
                                    pD.elements[0].task !== null &&
                                    pD.elements[0].task.selection !== undefined
                                ) {
                                    const name = this.formGroup.get('name')?.value;
                                    if (name !== undefined && name !== null) {
                                        pD.name = name;
                                    }
                                    pD.elements[0].task.selection.selected_device_id = deviceId;
                                    pD.elements[0].task.selection.selected_service_id = serviceId;
                                    return pD;
                                }
                                return null;
                            }),
                        )
                        .pipe(
                            flatMap((pD) => {
                                if (pD !== null) {
                                    return this.deploymentsService.v2postDeployments(pD, 'generated');
                                }
                                return of(null);
                            }),
                        )
                        .pipe(
                            flatMap((deployment) => {
                                if (deployment !== null && deployment.status === 200) {
                                    element.get('elementDetails')?.get('device')?.patchValue({deploymentId: deployment.id});
                                    // spread process starts
                                    let cron =
                                        refreshTime === '*'
                                            ? refreshTime
                                            : (Math.round((refreshTime / elements.length) * index) as unknown as string) +
                                            '/' +
                                            refreshTime;
                                    cron += ' * * * * *';
                                    return this.processSchedulerService.createSchedule({
                                        created_by: this.widgetId,
                                        process_deployment_id: deployment.id,
                                        cron,
                                        id: '',
                                    });
                                } else {
                                    return of(null);
                                }
                            }),
                        )
                        .pipe(
                            flatMap((schedule) => {
                                if (schedule !== null) {
                                    element.get('elementDetails')?.get('device')?.patchValue({scheduleId: schedule.id});
                                }
                                return of(null);
                            }),
                        ),
                );
            }
        });
        return observables;
    }

    private setReady() {
        this.ready = this.numReady === this.numReadyNeeded;
    }

    getTags(tab: AbstractControl): Map<string, { value: string; parent: string }[]> {
        const expId = tab.get('exportId')?.value;
        if (expId === undefined) {
            return new Map();
        }
        return this.dataTableHelperService.getExportTags(expId);
    }

    getTagOptionDisabledFunction(tab: AbstractControl): (option: { value: string; parent: string }) => boolean {
        return (option: { value: string; parent: string }) => {
            const selection = tab.get('exportTagSelection')?.value as string[];
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

    private prepareImportExport(element: AbstractControl): ExportModel {
        const type = this.dataTableHelperService.getFullImportType(element.get('elementDetails.import.typeId')?.value);
        const values = this.dataTableHelperService.getImportTypeValues(element.get('elementDetails.import.typeId')?.value);
        const instance = this.dataTableHelperService
            .getImportInstancesOfType(element.get('elementDetails.import.typeId')?.value)
            .find((i) => i.id === element.get('elementDetails.import.instanceId')?.value);
        if (instance === undefined || type === undefined) {
            throw new Error('undefined values');
        }
        return {
            TimePath: 'time',
            Values: values,
            EntityName: instance.id,
            Filter: instance.id,
            FilterType: 'import_id',
            ServiceName: type.name,
            Topic: instance.kafka_topic,
            Offset: 'smallest',
            Generated: true,
            TimestampFormat: '%Y-%m-%dT%H:%M:%SZ',
        } as ExportModel;
    }
}
