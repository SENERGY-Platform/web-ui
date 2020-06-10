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
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ExportService} from '../../../modules/data/export/shared/export.service';
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {
    DeviceTypeAspectModel,
    DeviceTypeFunctionModel,
    DeviceTypeServiceModel
} from '../../../modules/devices/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../modules/devices/device-types-overview/shared/device-type.service';
import {DeviceStatusElementModel} from '../shared/device-status-properties.model';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {
    DeploymentsPreparedModel,
    DeploymentsPreparedSelectableModel
} from '../../../modules/processes/deployments/shared/deployments-prepared.model';
import {ExportModel} from '../../../modules/data/export/shared/export.model';
import {DeviceInstancesUpdateModel} from '../../../modules/devices/device-instances/shared/device-instances-update.model';


@Component({
    templateUrl: './device-status-edit-dialog.component.html',
    styleUrls: ['./device-status-edit-dialog.component.css'],
})
export class DeviceStatusEditDialogComponent implements OnInit {

    aspects: DeviceTypeAspectModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    funcArray: DeviceTypeFunctionModel[][] = [];
    selectablesArray: DeploymentsPreparedSelectableModel[][] = [];
    preparedDeployment: DeploymentsPreparedModel[] = [];

    formGroup = this.fb.group({
        name: ['', Validators.required],
        refreshTime: [0],
        elements: this.fb.array([]),
    });


    constructor(private dialogRef: MatDialogRef<DeviceStatusEditDialogComponent>,
                private deploymentsService: DeploymentsService,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                private fb: FormBuilder,
                private deviceTypeService: DeviceTypeService,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.getWidgetData();
        this.getAspects();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.formGroup.patchValue({'name': widget.name});
            this.formGroup.patchValue({'refreshTime': widget.properties.refreshTime || 0});
            if (widget.properties.elements) {
                widget.properties.elements.forEach((element: DeviceStatusElementModel) => {
                    this.addElement(element);
                });
            }
        });
    }

    loadFunctions(aspectId: string, elementIndex: number): void {
        this.deviceTypeService.getAspectsMeasuringFunctions(aspectId).subscribe((resp: DeviceTypeFunctionModel[]) => {
            this.funcArray[elementIndex] = resp;
        });
    }

    loadDevices(elementIndex: number): void {
        if (this.getFunction(elementIndex) !== null) {
            const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn"><bpmn:process id="generatedByProcessStatusWidget" isExecutable="true"><bpmn:startEvent id="StartEvent_1"><bpmn:outgoing>SequenceFlow_1oborg2</bpmn:outgoing></bpmn:startEvent><bpmn:sequenceFlow id="SequenceFlow_1oborg2" sourceRef="StartEvent_1" targetRef="Task_0os5tro" /><bpmn:endEvent id="EndEvent_131n4r3"><bpmn:incoming>SequenceFlow_0lpgosu</bpmn:incoming></bpmn:endEvent><bpmn:sequenceFlow id="SequenceFlow_0lpgosu" sourceRef="Task_0os5tro" targetRef="EndEvent_131n4r3" /><bpmn:serviceTask id="Task_0os5tro" name="Door/Window getOnOffStateFunction" camunda:type="external" camunda:topic="pessimistic"><bpmn:extensionElements><camunda:inputOutput><camunda:inputParameter name="payload">{\n' +
                '    "function": {\n' +
                '        "id": "' + this.getFunction(elementIndex).id + '",\n' +
                '        "name": "func",\n' +
                '        "concept_id": "' + this.getFunction(elementIndex).concept_id + '",\n' +
                '        "rdf_type": "https://senergy.infai.org/ontology/MeasuringFunction"\n' +
                '    },\n' +
                '    "device_class": null,\n' +
                '    "aspect": {\n' +
                '        "id": "' + this.getAspectId(elementIndex).value + '",\n' +
                '        "name": "aspect",\n' +
                '        "rdf_type": "https://senergy.infai.org/ontology/Aspect"\n' +
                '    },\n' +
                '    "label": "getFunction",\n' +
                '    "input": {},\n' +
                '    "characteristic_id": "urn:infai:ses:characteristic:7621686a-56bc-402d-b4cc-5b266d39736f",\n' +
                '    "retries": 0\n' +
                '}</camunda:inputParameter><camunda:outputParameter name="outputs">${result}</camunda:outputParameter></camunda:inputOutput></bpmn:extensionElements><bpmn:incoming>SequenceFlow_1oborg2</bpmn:incoming><bpmn:outgoing>SequenceFlow_0lpgosu</bpmn:outgoing></bpmn:serviceTask></bpmn:process></bpmn:definitions>';

            const svg = '<?xml version="1.0" encoding="utf-8"?>\n' +
                '<!-- created with bpmn-js / http://bpmn.io -->\n' +
                '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
                '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="112" height="92" viewBox="254 74 112 92" version="1.1"><defs><marker id="sequenceflow-end-white-black-8shwih7rrgzkmm4pwfqg6rb2a" viewBox="0 0 20 20" refX="11" refY="10" markerWidth="10" markerHeight="10" orient="auto"><path d="M 1 5 L 11 10 L 1 15 Z" style="fill: black; stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1; stroke: black;"/></marker></defs><g class="djs-group"><g class="djs-element djs-shape" data-element-id="Task_10z5wf9" style="display: block;" transform="matrix(1 0 0 1 260 80)"><g class="djs-visual"><rect x="0" y="0" width="100" height="80" rx="10" ry="10" style="stroke: black; stroke-width: 2px; fill: white; fill-opacity: 0.95;"/><text lineHeight="1.2" class="djs-label" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: normal; fill: black;"><tspan x="11.4375" y="43.599999999999994">GENERATED!</tspan></text></g><rect x="0" y="0" width="100" height="80" class="djs-hit" style="fill: none; stroke-opacity: 0; stroke: white; stroke-width: 15px;"/><rect x="-6" y="-6" width="112" height="92" class="djs-outline" style="fill: none;"/></g></g></svg>';
            this.deploymentsService.getPreparedDeploymentsByXml(xml, svg).subscribe((resp: DeploymentsPreparedModel | null) => {
                if (resp !== null) {
                    this.selectablesArray[elementIndex] = resp.elements[0].task.selectables;
                    this.preparedDeployment[elementIndex] = resp;
                }
            });
        }
    }

    deploy(elementIndex: number): void {
        const pD = this.preparedDeployment[elementIndex];
        pD.elements[0].task.selection.device = this.getSelectableDevice(elementIndex);
        pD.elements[0].task.selection.service = this.getSelectableService(elementIndex);
        this.deploymentsService.postDeployments(pD).subscribe((resp: { id: string }) => {
            this.getDeploymentId(elementIndex).setValue(resp.id);
        });

    }

    addElement(element: DeviceStatusElementModel) {
        this.elements.push(this.setElement(element));
        const index = this.elements.length - 1;
        this.loadFunctions(element.aspectId, index);
        this.loadDevices(index);
        this.getAspectId(index).valueChanges.subscribe((aspectId) => {
                this.getFunctionControl(index).reset();
                this.loadFunctions(aspectId, index);
            }
        );
        this.getFunctionControl(index).valueChanges.subscribe((func) => {
            this.getSelectable(index).reset();
            if (func !== null) {
                this.loadDevices(index);
            }
        });
        this.getSelectable(index).valueChanges.subscribe((selectables) => {
            if (selectables !== null) {
                if (this.getDeploymentId(index).value !== null) {
                    this.deploymentsService.deleteDeployment(this.getDeploymentId(index).value).subscribe(() => {
                        this.getDeploymentId(index).reset();
                        this.deploy(index);
                    });
                } else {
                    this.deploy(index);
                }
                if (this.getExportId(index).value !== null) {
                    this.exportService.stopPipeline({ID: this.getExportId(index).value} as ExportModel).subscribe(() => {
                        this.getExportId(index).reset();
                        this.createExport(index);
                    });
                } else {
                    this.createExport(index);
                }
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    deleteElement(elementIndex: number): void {
        this.exportService.stopPipeline({ID: this.getExportId(elementIndex).value} as ExportModel).subscribe(() => {
        });
        this.deploymentsService.deleteDeployment(this.getDeploymentId(elementIndex).value).subscribe(() => {
        });
        this.funcArray.splice(elementIndex, 1);
        this.elements.removeAt(elementIndex);
    }

    save(): void {
        this.widget.name = (this.formGroup.get('name') as FormControl).value;
        this.widget.properties = {};
        this.widget.properties.refreshTime = (this.formGroup.get('refreshTime') as FormControl).value;
        this.widget.properties.elements = this.elements.value;
        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }

    addNewMeasurement() {
        this.addElement({} as DeviceStatusElementModel);
    }

    compareFunc(a: DeviceTypeFunctionModel, b: DeviceTypeFunctionModel) {
        return a && b && a.id === b.id;
    }

    compareSelectables(a: DeploymentsPreparedSelectableModel, b: DeploymentsPreparedSelectableModel) {
        return a && b && a.device.id === b.device.id;
    }

    private createExport(elementIndex: number): void {
        const exp: ExportModel = {
            Name: 'generatedByProcessStatusWidget',
            Description: 'generatedByProcessStatusWidget',
            TimePath: 'value.openCloseState.updateTime',
            Values: [{
                Name: 'level',
                Type: 'string',
                Path: 'value.openCloseState.level',
            }],
            EntityName: this.getSelectableDevice(elementIndex).name,
            Filter: this.getSelectableDevice(elementIndex).id,
            FilterType: 'deviceId',
            ServiceName: this.getSelectableService(elementIndex).name,
            Topic: this.getSelectableService(elementIndex).id.replace(/#/g, '_').replace(/:/g, '_'), // this.getSelectableService(elementIndex)
            Offset: 'smallest'
        } as ExportModel;
        this.exportService.startPipeline(exp).subscribe((resp: ExportModel) => {
            this.getExportId(elementIndex).setValue(resp.ID);
        });
    }

    private getAspects(): void {
        this.deviceTypeService.getAspectsWithMeasuringFunction().subscribe(
            (aspects: DeviceTypeAspectModel[]) => {
                this.aspects = aspects;
            });
    }

    private setElement(element: DeviceStatusElementModel): FormGroup {
        return this.fb.group({
            name: [element.name, Validators.required],
            aspectId: [element.aspectId, Validators.required],
            function: [element.function, Validators.required],
            selectable: [element.selectable, Validators.required],
            deploymentId: [element.deploymentId, Validators.required],
            exportId: [element.exportId, Validators.required],
        });
    }

    get elements(): FormArray {
        return this.formGroup.get('elements') as FormArray;
    }

    private getAspectId(elementIndex: number): FormControl {
        return this.elements.at(elementIndex).get('aspectId') as FormControl;
    }

    private getFunctionControl(elementIndex: number): FormControl {
        return this.elements.at(elementIndex).get('function') as FormControl;
    }

    private getFunction(elementIndex: number): DeviceTypeFunctionModel {
        return <DeviceTypeFunctionModel>(this.getFunctionControl(elementIndex)).value;
    }

    private getSelectable(elementIndex: number): FormControl {
        return this.elements.at(elementIndex).get('selectable') as FormControl;
    }

    private getSelectableDevice(elementIndex: number): DeviceInstancesUpdateModel {
        return <DeviceInstancesUpdateModel>(this.getSelectable(elementIndex).value).device;
    }

    private getSelectableService(elementIndex: number): DeviceTypeServiceModel {
        return <DeviceTypeServiceModel>(this.getSelectable(elementIndex).value).services[0];
    }

    private getDeploymentId(elementIndex: number): FormControl {
        return this.elements.at(elementIndex).get('deploymentId') as FormControl;
    }

    private getExportId(elementIndex: number): FormControl {
        return this.elements.at(elementIndex).get('exportId') as FormControl;
    }

}
