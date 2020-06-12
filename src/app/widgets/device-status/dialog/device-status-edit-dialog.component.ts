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
    DeviceTypeAspectModel, DeviceTypeContentVariableModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel, DeviceTypeServiceModel
} from '../../../modules/devices/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../modules/devices/device-types-overview/shared/device-type.service';
import {DeviceStatusElementModel, DeviceStatusExportValuesModel} from '../shared/device-status-properties.model';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {
    DeploymentsPreparedModel,
    DeploymentsPreparedSelectableModel
} from '../../../modules/processes/deployments/shared/deployments-prepared.model';
import {ExportModel} from '../../../modules/data/export/shared/export.model';
import {forkJoin, Observable} from 'rxjs';


@Component({
    templateUrl: './device-status-edit-dialog.component.html',
    styleUrls: ['./device-status-edit-dialog.component.css'],
})
export class DeviceStatusEditDialogComponent implements OnInit {

    aspects: DeviceTypeAspectModel[] = [];
    dashboardId: string;
    widgetId: string;
    widgetNew: WidgetModel = {} as WidgetModel;
    widgetOld: WidgetModel = {} as WidgetModel;
    funcArray: DeviceTypeFunctionModel[][] = [];
    selectablesArray: DeploymentsPreparedSelectableModel[][] = [];
    preparedDeployment: DeploymentsPreparedModel[] = [];
    exportValues: DeviceStatusExportValuesModel[][] = [];

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
            this.widgetOld = widget;
            this.widgetNew = widget;
            this.formGroup.patchValue({'name': widget.name});
            this.formGroup.patchValue({'refreshTime': widget.properties.refreshTime || 0});
            if (widget.properties.elements) {
                widget.properties.elements.forEach((element: DeviceStatusElementModel) => {
                    this.addElement(element);
                });
            }
        });
    }

    loadFunctions(elementIndex: number): void {
        this.deviceTypeService.getAspectsMeasuringFunctions(this.getAspectId(elementIndex).value).subscribe((resp: DeviceTypeFunctionModel[]) => {
            this.funcArray[elementIndex] = resp;
        });
    }


    loadDeviceType(elementIndex: number): void {
        if (this.getSelectable(elementIndex).value) {
            this.deviceTypeService.getDeviceType(this.getSelectable(elementIndex).value.device.device_type_id).subscribe((deviceType: (DeviceTypeModel | null)) => {
                if (deviceType) {
                    deviceType.services.forEach((service: DeviceTypeServiceModel) => {
                        if (service.id === this.getSelectable(elementIndex).value.services[0].id) {
                            this.exportValues.push(this.traverseDataStructure('value', service.outputs[0].content_variable, []));
                            this.traverseDataStructure('value', service.outputs[0].content_variable, []);
                        }
                    });
                }
            });
        }
    }

    private traverseDataStructure(pathString: string, field: DeviceTypeContentVariableModel, array: DeviceStatusExportValuesModel[]): DeviceStatusExportValuesModel[] {
        if (field.type === 'https://schema.org/StructuredValue' && field.type !== undefined && field.type !== null) {
            pathString += '.' + field.name;
            if (field.sub_content_variables !== undefined) {
                field.sub_content_variables.forEach((innerField: DeviceTypeContentVariableModel) => {
                    this.traverseDataStructure(pathString, innerField, array);
                });
            }
        } else {
            array.push({
                name: field.name || '',
                path: pathString + '.' + field.name,
                type: field.type || '',
                timestamp: field.characteristic_id === 'urn:infai:ses:characteristic:6bc41b45-a9f3-4d87-9c51-dd3e11257800'
            });
        }
        return array;
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

    createdDeployment(selectable: DeploymentsPreparedSelectableModel, index: number): Observable<{ status: number, id: string }> {
        const pD = this.preparedDeployment[index];
        pD.elements[0].task.selection.device = selectable.device;
        pD.elements[0].task.selection.service = selectable.services[0];
        return this.deploymentsService.postDeployments(pD);
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
            }
        );
        this.getFunctionControl(index).valueChanges.subscribe((func) => {
            this.getSelectable(index).reset();
            if (func !== null) {
                this.loadDevices(index);
            }
        });
        this.getSelectable(index).valueChanges.subscribe((selectable) => {
            this.getExportValues(index).reset();
            if (selectable !== null) {
                this.loadDevices(index);
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    deleteElement(elementIndex: number): void {
        this.funcArray.splice(elementIndex, 1);
        this.selectablesArray.splice(elementIndex, 1);
        this.elementsControl.removeAt(elementIndex);
    }

    save(): void {
        this.deleteOldExportsAndDeployments(this.widgetOld.properties.elements);

        forkJoin(this.getExportArray()).subscribe((respExport: ExportModel[]) => {

            respExport.forEach((exp: ExportModel, exportIndex: number) => {
                this.getExportId(exportIndex).setValue(exp.ID);
            });

            forkJoin(this.getDeploymentArray()).subscribe((respDeployment: { status: number, id: string }[]) => {
                respDeployment.forEach((deployment: { status: number, id: string }, deploymentIndex: number) => {
                    this.getDeploymentId(deploymentIndex).setValue(deployment.id);
                });
                this.saveWidget();
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

    compareValues(a: DeviceStatusExportValuesModel, b: DeviceStatusExportValuesModel) {
        return a && b && a.name === b.name && a.path === b.path;
    }

    private getDeploymentArray(): Observable<{ status: number, id: string }>[] {
        const deploymentArray: Observable<{ status: number, id: string }>[] = [];
        this.elements.forEach((element: DeviceStatusElementModel, index: number) => {
            if (element.selectable) {
                deploymentArray.push(this.createdDeployment(element.selectable, index));
            }
        });
        return deploymentArray;
    }

    private getExportArray(): Observable<ExportModel>[] {
        const exportArray: Observable<ExportModel>[] = [];
        this.elements.forEach((element: DeviceStatusElementModel) => {
            if (element.selectable) {
                exportArray.push(this.createExport(element.selectable));
            }
        });
        return exportArray;
    }

    private deleteOldExportsAndDeployments(elements: DeviceStatusElementModel[] | undefined): void {
        if (elements) {
            elements.forEach((element: DeviceStatusElementModel) => {
                if (element.exportId) {
                    this.exportService.stopPipeline({ID: element.exportId} as ExportModel).subscribe();
                }
                if (element.deploymentId) {
                    this.deploymentsService.deleteDeployment(element.deploymentId).subscribe();
                }
            });
        }
    }

    private saveWidget() {
        this.widgetNew.name = (this.formGroup.get('name') as FormControl).value;
        this.widgetNew.properties = {};
        this.widgetNew.properties.refreshTime = (this.formGroup.get('refreshTime') as FormControl).value;
        this.widgetNew.properties.elements = this.elements;
        this.dashboardService.updateWidget(this.dashboardId, this.widgetNew).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widgetNew);
            }
        });
    }

    private createExport(selectable: DeploymentsPreparedSelectableModel): Observable<ExportModel> {
        const exp: ExportModel = {
            Name: 'generatedByProcessStatusWidget',
            Description: 'generatedByProcessStatusWidget',
            TimePath: 'value.openCloseState.updateTime',
            Values: [{
                Name: 'level',
                Type: 'string',
                Path: 'value.openCloseState.level',
            }],
            EntityName: selectable.device.name,
            Filter: selectable.device.id,
            FilterType: 'deviceId',
            ServiceName: selectable.services[0].name,
            Topic: selectable.services[0].id.replace(/#/g, '_').replace(/:/g, '_'), // this.getSelectableService(elementIndex)
            Offset: 'smallest'
        } as ExportModel;
        return this.exportService.startPipeline(exp);
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
            deploymentId: [element.deploymentId],
            exportId: [element.exportId],
            exportValues: [element.exportValues, Validators.required],
        });
    }

    get elementsControl(): FormArray {
        return this.formGroup.get('elements') as FormArray;
    }

    get elements(): DeviceStatusElementModel[] {
        return <DeviceStatusElementModel[]>this.elementsControl.value;
    }

    private getAspectId(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('aspectId') as FormControl;
    }

    private getFunctionControl(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('function') as FormControl;
    }

    private getFunction(elementIndex: number): DeviceTypeFunctionModel {
        return <DeviceTypeFunctionModel>(this.getFunctionControl(elementIndex)).value;
    }

    private getSelectable(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('selectable') as FormControl;
    }

    private getDeploymentId(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('deploymentId') as FormControl;
    }

    private getExportId(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('exportId') as FormControl;
    }

    private getExportValues(elementIndex: number): FormControl {
        return this.elementsControl.at(elementIndex).get('exportValues') as FormControl;
    }

}
