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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import {
    DeviceTypeAspectModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel,
    DeviceTypeServiceModel,
} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import { DeviceStatusConfigConvertRuleModel, DeviceStatusElementModel } from '../shared/device-status-properties.model';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {
    DeploymentsPreparedModel,
    DeploymentsPreparedSelectableModel,
} from '../../../modules/processes/deployments/shared/deployments-prepared.model';
import { ExportModel, ExportValueCharacteristicModel } from '../../../modules/exports/shared/export.model';
import { forkJoin, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DeviceStatusService } from '../shared/device-status.service';
import { ProcessSchedulerService } from '../../process-scheduler/shared/process-scheduler.service';
import { ProcessSchedulerModel } from '../../process-scheduler/shared/process-scheduler.model';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceSelectablesModel } from '../../../modules/devices/device-instances/shared/device-instances.model';
import { V2DeploymentsPreparedModel } from '../../../modules/processes/deployments/shared/deployments-prepared-v2.model';

@Component({
    templateUrl: './device-status-edit-dialog.component.html',
    styleUrls: ['./device-status-edit-dialog.component.css'],
})
export class DeviceStatusEditDialogComponent implements OnInit {
    aspects: DeviceTypeAspectModel[] = [];
    icons: string[] = [
        'power',
        'power_off',
        'toggle_on',
        'toggle_off',
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
    dashboardId: string;
    widgetId: string;
    widgetNew: WidgetModel = {} as WidgetModel;
    widgetOld: WidgetModel = {} as WidgetModel;
    funcArray: DeviceTypeFunctionModel[][] = [];
    selectablesArray: DeviceSelectablesModel[][] = [];
    preparedDeployment: V2DeploymentsPreparedModel[] = [];
    serviceExportValueArray: { service: DeviceTypeServiceModel; exportValues: ExportValueCharacteristicModel[] }[][] = [];

    formGroup = this.fb.group({
        name: ['', Validators.required],
        refreshTime: [0],
        elements: this.fb.array([]),
        convertRules: this.fb.array([]),
    });

    constructor(
        private dialogRef: MatDialogRef<DeviceStatusEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        private exportService: ExportService,
        private fb: FormBuilder,
        private deviceTypeService: DeviceTypeService,
        private deviceStatusService: DeviceStatusService,
        private processSchedulerService: ProcessSchedulerService,
        private deviceInstanceService: DeviceInstancesService,
        @Inject(MAT_DIALOG_DATA) data: { dashboardId: string; widgetId: string },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.getWidgetData();
        this.getAspects();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widgetOld = widget;
            this.widgetNew = widget;
            this.formGroup.patchValue({ name: widget.name });
            this.formGroup.patchValue({ refreshTime: widget.properties.refreshTime || 0 });
            if (widget.properties.convertRules) {
                widget.properties.convertRules.forEach((convertRule: DeviceStatusConfigConvertRuleModel) => {
                    this.addConvertRule(convertRule);
                });
            }
            if (widget.properties.elements) {
                widget.properties.elements.forEach((element: DeviceStatusElementModel) => {
                    this.addElement(element);
                });
            }
        });
    }

    loadFunctions(elementIndex: number): void {
        if (this.getAspectId(elementIndex).value) {
            this.deviceTypeService
                .getAspectsMeasuringFunctions(this.getAspectId(elementIndex).value)
                .subscribe((resp: DeviceTypeFunctionModel[]) => {
                    this.funcArray[elementIndex] = resp;
                });
        }
    }

    loadDeviceType(elementIndex: number): void {
        if (this.getSelectable(elementIndex).value) {
            this.deviceTypeService
                .getDeviceType(this.getSelectable(elementIndex).value.device.device_type_id)
                .subscribe((deviceType: DeviceTypeModel | null) => {
                    if (deviceType) {
                        const servicesArray: { service: DeviceTypeServiceModel; exportValues: ExportValueCharacteristicModel[] }[] = [];
                        deviceType.services.forEach((deviceTypeService: DeviceTypeServiceModel) => {
                            this.getSelectableServices(elementIndex).forEach((selectableService: DeviceTypeServiceModel) => {
                                if (deviceTypeService.id === selectableService.id) {
                                    const traverse = this.exportService.addCharacteristicToDeviceTypeContentVariable(
                                        deviceTypeService.outputs[0].content_variable,
                                    );
                                    const timePath = this.exportService.getTimePath(traverse);
                                    if (timePath.path !== '') {
                                        servicesArray.push({ service: deviceTypeService, exportValues: traverse });
                                    }
                                }
                            });
                        });
                        this.serviceExportValueArray[elementIndex] = servicesArray;
                        if (servicesArray.length === 1) {
                            this.getServiceControl(elementIndex).setValue(servicesArray[0].service);
                        }
                    }
                });
        }
    }

    loadDevices(elementIndex: number): void {
        if (this.getFunction(elementIndex) !== null) {
            const xml =
                '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn"><bpmn:process id="generatedByProcessStatusWidget" isExecutable="true"><bpmn:startEvent id="StartEvent_1"><bpmn:outgoing>SequenceFlow_1oborg2</bpmn:outgoing></bpmn:startEvent><bpmn:sequenceFlow id="SequenceFlow_1oborg2" sourceRef="StartEvent_1" targetRef="Task_0os5tro" /><bpmn:endEvent id="EndEvent_131n4r3"><bpmn:incoming>SequenceFlow_0lpgosu</bpmn:incoming></bpmn:endEvent><bpmn:sequenceFlow id="SequenceFlow_0lpgosu" sourceRef="Task_0os5tro" targetRef="EndEvent_131n4r3" /><bpmn:serviceTask id="Task_0os5tro" name="Door/Window getOnOffStateFunction" camunda:type="external" camunda:topic="pessimistic"><bpmn:extensionElements><camunda:inputOutput><camunda:inputParameter name="payload">{\n' +
                '    "function": {\n' +
                '        "id": "' +
                this.getFunction(elementIndex).id +
                '",\n' +
                '        "name": "func",\n' +
                '        "concept_id": "' +
                this.getFunction(elementIndex).concept_id +
                '",\n' +
                '        "rdf_type": "https://senergy.infai.org/ontology/MeasuringFunction"\n' +
                '    },\n' +
                '    "device_class": null,\n' +
                '    "aspect": {\n' +
                '        "id": "' +
                this.getAspectId(elementIndex).value +
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
            this.deploymentsService.v2getPreparedDeploymentsByXml(xml, svg).subscribe((resp: V2DeploymentsPreparedModel | null) => {
                if (resp !== null) {
                    this.preparedDeployment[elementIndex] = resp;
                }
            });

            const filter = [{ function_id: this.getFunction(elementIndex).id, aspect_id: this.getAspectId(elementIndex).value }];
            this.deviceInstanceService.getDeviceSelections(filter, true).subscribe((resp: DeviceSelectablesModel[] | null) => {
                if (resp !== null) {
                    this.selectablesArray[elementIndex] = resp;
                }
            });
        }
    }

    createdDeployment(
        selectable: DeploymentsPreparedSelectableModel,
        index: number,
        name: string | null | undefined,
    ): Observable<{ status: number; id: string }> {
        const pD = this.preparedDeployment[index];
        if (name) {
            pD.name = name;
        }
        if (pD.elements.length === 0 || pD.elements[0].task === null) {
            console.log('PANIC: unexpected prepared deployment value', pD);
            return of({ status: 500, id: '' });
        }
        pD.elements[0].task.selection.selected_device_id = selectable.device.id;
        pD.elements[0].task.selection.selected_service_id = this.getService(index).id;
        return this.deploymentsService.v2postDeployments(pD, 'generated');
    }

    getIcon(index: number): string {
        return this.convertRulesControl.at(index).value.icon;
    }

    getColor(index: number): string {
        return this.convertRulesControl.at(index).value.color;
    }

    getServiceExportValues(elementIndex: number): ExportValueCharacteristicModel[] {
        const serviceId = this.getService(elementIndex) ? this.getService(elementIndex).id : null;
        if (serviceId) {
            for (let i = 0; i < this.serviceExportValueArray[elementIndex].length; i++) {
                if (this.serviceExportValueArray[elementIndex][i].service.id === serviceId) {
                    return this.serviceExportValueArray[elementIndex][i].exportValues;
                }
            }
        }
        return [];
    }

    addElement(element: DeviceStatusElementModel) {
        this.elementsControl.push(this.setElement(element));
        const index = this.elementsControl.length - 1;
        this.loadFunctions(index);
        this.loadDevices(index);
        this.loadDeviceType(index);
        this.getAspectId(index).valueChanges.subscribe((aspectId) => {
            this.getFunctionControl(index).reset();
            if (aspectId !== null) {
                this.loadFunctions(index);
            }
        });
        this.getFunctionControl(index).valueChanges.subscribe((func) => {
            this.getSelectable(index).reset();
            if (func !== null) {
                this.loadDevices(index);
            }
        });
        this.getSelectable(index).valueChanges.subscribe((selectable) => {
            this.getServiceControl(index).reset();
            this.getExportValuesControl(index).reset();
            if (selectable !== null) {
                this.loadDeviceType(index);
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    deleteElement(elementIndex: number): void {
        this.funcArray.splice(elementIndex, 1);
        this.selectablesArray.splice(elementIndex, 1);
        this.serviceExportValueArray.splice(elementIndex, 1);
        this.preparedDeployment.splice(elementIndex, 1);
        this.elementsControl.removeAt(elementIndex);
    }

    deleteConvertRule(index: number): void {
        this.convertRulesControl.removeAt(index);
    }

    save(): void {
        this.deviceStatusService.deleteElements(this.widgetOld.properties.elements);

        forkJoin(this.getExportArray()).subscribe((respExport: ExportModel[]) => {
            respExport.forEach((exp: ExportModel, exportIndex: number) => {
                this.getExportId(exportIndex).setValue(exp.ID);
            });

            forkJoin(this.getDeploymentArray()).subscribe((respDeployment: { status: number; id: string }[]) => {
                respDeployment.forEach((deployment: { status: number; id: string }, deploymentIndex: number) => {
                    this.getDeploymentId(deploymentIndex).setValue(deployment.id);
                });
                forkJoin(this.getScheduleArray()).subscribe((schedules) => {
                    schedules.forEach((schedule, index) => {
                        this.getScheduleId(index).setValue(schedule !== null ? schedule.id : null);
                    });
                    this.saveWidget();
                });
            });
        });
    }

    add() {
        this.addElement({} as DeviceStatusElementModel);
    }

    compareFunc(a: DeviceTypeFunctionModel, b: DeviceTypeFunctionModel) {
        return a && b && a.id === b.id;
    }

    compareSelectables(a: DeploymentsPreparedSelectableModel, b: DeploymentsPreparedSelectableModel) {
        return a && b && a.device.id === b.device.id;
    }

    compareValues(a: ExportValueCharacteristicModel, b: ExportValueCharacteristicModel) {
        return a && b && a.Name === b.Name && a.Path === b.Path;
    }

    compareServices(a: DeviceTypeServiceModel, b: DeviceTypeServiceModel) {
        return a && b && a.id === b.id;
    }

    addConvertRule(convertRule: DeviceStatusConfigConvertRuleModel = {} as DeviceStatusConfigConvertRuleModel) {
        this.convertRulesControl.push(this.setConvertRule(convertRule));
    }

    private getDeploymentArray(): Observable<{ status: number; id: string }>[] {
        const deploymentArray: Observable<{ status: number; id: string }>[] = [];
        this.elements.forEach((element: DeviceStatusElementModel, index: number) => {
            if (element.selectable) {
                if (!element.requestDevice || this.getService(index).protocol_id === environment.mqttProtocolID) {
                    deploymentArray.push(of({ status: 0, id: '' }));
                } else {
                    deploymentArray.push(
                        this.createdDeployment(element.selectable, index, 'generated by widget ' + this.widgetName + ' ' + element.name),
                    );
                }
            }
        });
        return deploymentArray;
    }

    private getExportArray(): Observable<ExportModel>[] {
        const exportArray: Observable<ExportModel>[] = [];
        this.elements.forEach((element: DeviceStatusElementModel, elementIndex: number) => {
            if (element.selectable && element.service) {
                const exports = this.exportService.prepareDeviceServiceExport(element.selectable.device, element.service);
                if (exports.length !== 1) {
                    console.error('Unexpectedly got more than one export');
                    return;
                }
                this.cleanExportModel(exports[0], this.getExportValues(elementIndex));
                exportArray.push(this.exportService.startPipeline(exports[0]));
            }
        });
        return exportArray;
    }

    private getScheduleArray(): Observable<ProcessSchedulerModel | null>[] {
        const scheduleArray: Observable<ProcessSchedulerModel | null>[] = [];
        if ((this.formGroup.get('refreshTime') as FormControl).value === 0) {
            this.elements.forEach(() => scheduleArray.push(of(null)));
            return scheduleArray;
        }

        const refreshTime =
            (this.formGroup.get('refreshTime') as FormControl).value === 1 ? '*' : (this.formGroup.get('refreshTime') as FormControl).value;
        this.elements.forEach((element: DeviceStatusElementModel, index: number) => {
            if (element.selectable) {
                if (!element.requestDevice || this.getService(index).protocol_id === environment.mqttProtocolID) {
                    scheduleArray.push(of(null));
                } else if (element.deploymentId !== null) {
                    // spread process starts
                    let cron =
                        refreshTime === '*'
                            ? refreshTime
                            : (Math.round((refreshTime / this.elements.length) * index) as unknown as string) + '/' + refreshTime;
                    cron += ' * * * * *';
                    scheduleArray.push(
                        this.processSchedulerService.createSchedule({
                            created_by: this.widgetId,
                            process_deployment_id: element.deploymentId,
                            cron,
                            id: '',
                        }),
                    );
                }
            }
        });
        return scheduleArray;
    }

    private saveWidget() {
        this.widgetNew.name = this.widgetName;
        this.widgetNew.properties = {};
        this.widgetNew.properties.refreshTime = (this.formGroup.get('refreshTime') as FormControl).value;
        this.widgetNew.properties.elements = this.elements;
        this.widgetNew.properties.convertRules = this.convertRulesControl.value;
        this.dashboardService.updateWidget(this.dashboardId, this.widgetNew).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widgetNew);
            }
        });
    }

    private cleanExportModel(exportModel: ExportModel, exportValue: ExportValueCharacteristicModel) {
        const relevantIndex = exportModel.Values.findIndex((value) => value.Path === exportValue.Path);
        if (relevantIndex !== -1) {
            exportModel.Values = [exportModel.Values[relevantIndex]];
            exportModel.Values[0].Name = exportValue.Name; // only one value per export --> name is unique
        } else {
            console.error('Did not find relevant index while preparing export.');
        }
        exportModel.Name = 'generatedByProcessStatusWidget';
        exportModel.Description = 'generatedByProcessStatusWidget';
    }

    private getAspects(): void {
        this.deviceTypeService.getAspectsWithMeasuringFunction().subscribe((aspects: DeviceTypeAspectModel[]) => {
            this.aspects = aspects;
        });
    }

    private setElement(element: DeviceStatusElementModel): FormGroup {
        return this.fb.group({
            name: [element.name, Validators.required],
            aspectId: [element.aspectId, Validators.required],
            function: [element.function, Validators.required],
            selectable: [element.selectable, Validators.required],
            service: [element.service, Validators.required],
            deploymentId: [element.deploymentId],
            exportId: [element.exportId],
            exportValues: [element.exportValues, Validators.required],
            requestDevice: [element.requestDevice || false],
            scheduleId: [element.scheduleId],
        });
    }

    private setConvertRule(convertRule: DeviceStatusConfigConvertRuleModel): FormGroup {
        return this.fb.group({
            status: [convertRule.status],
            icon: [convertRule.icon],
            color: [convertRule.color],
        });
    }

    get elementsControl(): FormArray {
        return this.formGroup.get('elements') as FormArray;
    }

    get convertRulesControl(): FormArray {
        return this.formGroup.get('convertRules') as FormArray;
    }

    get elements(): DeviceStatusElementModel[] {
        return this.elementsControl.value as DeviceStatusElementModel[];
    }

    get widgetName(): string {
        return (this.formGroup.get('name') as FormControl).value;
    }

    private getAspectId(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('aspectId') as FormControl;
    }

    private getFunctionControl(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('function') as FormControl;
    }

    private getFunction(elementIndex: number): DeviceTypeFunctionModel {
        return this.getFunctionControl(elementIndex).value as DeviceTypeFunctionModel;
    }

    private getSelectable(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('selectable') as FormControl;
    }

    private getSelectableServices(elementIndex: number): DeviceTypeServiceModel[] {
        return this.getSelectable(elementIndex).value.services;
    }

    private getDeploymentId(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('deploymentId') as FormControl;
    }

    private getExportId(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('exportId') as FormControl;
    }

    private getExportValuesControl(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('exportValues') as FormControl;
    }

    private getServiceControl(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('service') as FormControl;
    }

    private getService(elementIndex: number): DeviceTypeServiceModel {
        return this.getServiceControl(elementIndex).value as DeviceTypeServiceModel;
    }

    private getExportValues(elementIndex: number): ExportValueCharacteristicModel {
        return this.getExportValuesControl(elementIndex).value as ExportValueCharacteristicModel;
    }

    private getScheduleId(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('scheduleId') as FormControl;
    }
}
