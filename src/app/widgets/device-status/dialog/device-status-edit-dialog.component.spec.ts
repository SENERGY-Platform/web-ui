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

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DeviceStatusEditDialogComponent} from './device-status-edit-dialog.component';
import {CoreModule} from '../../../core/core.module';
import {RouterTestingModule} from '@angular/router/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {of} from 'rxjs';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DeviceStatusElementModel, DeviceStatusExportValuesModel} from '../shared/device-status-properties.model';
import {
    DeviceTypeAspectModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel, DeviceTypeServiceModel
} from '../../../modules/devices/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../modules/devices/device-types-overview/shared/device-type.service';
import {
    DeploymentsPreparedModel,
    DeploymentsPreparedSelectableModel
} from '../../../modules/processes/deployments/shared/deployments-prepared.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {MatIconModule} from '@angular/material/icon';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatInputModule} from '@angular/material/input';
import {By} from '@angular/platform-browser';
import {ExportService} from '../../../modules/data/export/shared/export.service';
import {ExportModel} from '../../../modules/data/export/shared/export.model';
import {util} from 'jointjs';
import uuid = util.uuid;

describe('DeviceStatusEditDialogComponent', () => {
    let component: DeviceStatusEditDialogComponent;
    let fixture: ComponentFixture<DeviceStatusEditDialogComponent>;
    let serviceStub: any;

    let valueServiceSpy: jasmine.SpyObj<ExportService>;

    beforeEach(async(() => {

        const spy = jasmine.createSpyObj('ExportService', ['startPipeline']);
        serviceStub = {
            getWidget: () => of({name: 'test', properties: {}} as WidgetModel),
            getAspectsWithMeasuringFunction: () => of([{id: 'aspect_1', name: 'Air'}] as DeviceTypeAspectModel[]),
            getAspectsMeasuringFunctions: () => of([{
                id: 'func_1',
                concept_id: 'concept_1',
                name: 'getOnOffFunction'
            }] as DeviceTypeFunctionModel[]),
            getPreparedDeploymentsByXml: () => of({
                id: '',
                elements: [{
                    task: {
                        selectables: [{
                            device: {id: 'device_1', name: 'device', device_type_id: 'deviceTypeId_1', local_id: ''},
                            services: [{id: 'service_1', name: 'service'}]
                        }],
                        selection: {
                            device: {},
                            service: {},
                        }
                    }
                }]
            } as DeploymentsPreparedModel),
            getDeviceType: () => of({
                services: [{
                    id: 'service_1', outputs: [{
                        content_variable: {
                            name: 'struct',
                            type: 'https://schema.org/StructuredValue', sub_content_variables: [{
                                id: 'urn:infai:ses:content-variable:4fa5515c-147d-4b0f-92fb-a667a6a9270a',
                                name: 'Time',
                                type: 'https://schema.org/Text',
                                characteristic_id: 'urn:infai:ses:characteristic:6bc41b45-a9f3-4d87-9c51-dd3e11257800',
                            }]
                        }
                    }]
                }]
            } as DeviceTypeModel),
            postDeployments: () => of({status: 200, id: uuid()}),
            updateWidget: () => of({message: 'OK'}),
            close: () => {},
        };

        TestBed.configureTestingModule({
            imports: [CoreModule, RouterTestingModule, HttpClientTestingModule, MatSnackBarModule, MatDialogModule, MatIconModule, MatExpansionModule, MatInputModule, ReactiveFormsModule],
            declarations: [
                DeviceStatusEditDialogComponent
            ],
            providers: [
                {provide: DashboardService, useValue: serviceStub},
                {provide: DeviceTypeService, useValue: serviceStub},
                {provide: DeploymentsService, useValue: serviceStub},
                {provide: ExportService, useValue: spy},
                {provide: MatDialogRef, useValue: serviceStub},
                {provide: MAT_DIALOG_DATA, useValue: {widgetId: 'widgetId-1', dashboardId: 'dashboardId-1'}},
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(DeviceStatusEditDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        valueServiceSpy = TestBed.inject(ExportService) as jasmine.SpyObj<ExportService>;
    }));

    it('should create the app', async(() => {
        expect(component).toBeTruthy();
    }));

    it('check the first dialog init', async(() => {
        expect(component.widgetOld).toEqual({name: 'test', properties: {}} as WidgetModel);
        expect(component.widgetNew).toEqual({name: 'test', properties: {}} as WidgetModel);
        expect((component.formGroup.get('name') as FormControl).value).toBe('test');
        expect((component.formGroup.get('refreshTime') as FormControl).value).toBe(0);
        expect(component.elements.length).toBe(0);
        expect(component.funcArray.length).toBe(0);
        expect(component.selectablesArray.length).toBe(0);
        expect(component.preparedDeployment.length).toBe(0);
        expect(component.exportValues.length).toBe(0);
        expect(component.aspects.length).toBe(1);
        expect(component.aspects[0]).toEqual({id: 'aspect_1', name: 'Air'});
        expect(component.dashboardId).toBe('dashboardId-1');
        expect(component.widgetId).toBe('widgetId-1');
    }));

    it('add empty element', async(() => {
        component.addElement({} as DeviceStatusElementModel);
        expect(component.elements.length).toBe(1);
        expect(component.elements[0]).toEqual({
            exportValues: null,
            exportId: null,
            deploymentId: null,
            service: null,
            selectable: null,
            function: null,
            aspectId: null,
            name: null
        });
        expect(component.funcArray.length).toBe(0);
        expect(component.selectablesArray.length).toBe(0);
        expect(component.preparedDeployment.length).toBe(0);
        expect(component.exportValues.length).toBe(0);
    }));

    it('select aspect', async(() => {
        component.addElement({} as DeviceStatusElementModel);
        component.elementsControl.at(0).patchValue({'aspectId': component.aspects[0].id});
        expect(component.funcArray[0].length).toBe(1);
        expect(component.funcArray[0]).toEqual([{
            id: 'func_1',
            concept_id: 'concept_1',
            name: 'getOnOffFunction'
        } as DeviceTypeFunctionModel]);
        expect(component.selectablesArray.length).toBe(0);
        expect(component.preparedDeployment.length).toBe(0);
        expect(component.exportValues.length).toBe(0);
        expect(component.elements[0]).toEqual({
            exportValues: null,
            exportId: null,
            deploymentId: null,
            service: null,
            selectable: null,
            function: null,
            aspectId: 'aspect_1',
            name: null
        });
    }));

    it('select aspect, function', async(() => {
        component.addElement({} as DeviceStatusElementModel);
        component.elementsControl.at(0).patchValue({'aspectId': component.aspects[0].id});
        component.elementsControl.at(0).patchValue({'function': component.funcArray[0][0]});
        expect(component.selectablesArray.length).toBe(1);
        expect(component.selectablesArray[0]).toEqual([{
            device: {id: 'device_1', name: 'device', device_type_id: 'deviceTypeId_1', local_id: ''},
            services: [{id: 'service_1', name: 'service'}]
        }] as DeploymentsPreparedSelectableModel[]);
        expect(component.preparedDeployment.length).toBe(1);
        expect(component.exportValues.length).toBe(0);
        expect(component.elements[0]).toEqual({
            exportValues: null,
            exportId: null,
            deploymentId: null,
            service: null,
            selectable: null,
            function: component.funcArray[0][0],
            aspectId: 'aspect_1',
            name: null
        });
    }));

    it('select aspect, function, device', async(() => {
        component.addElement({} as DeviceStatusElementModel);
        component.elementsControl.at(0).patchValue({'aspectId': component.aspects[0].id});
        component.elementsControl.at(0).patchValue({'function': component.funcArray[0][0]});
        component.elementsControl.at(0).patchValue({'selectable': component.selectablesArray[0][0]});

        expect(component.preparedDeployment.length).toBe(1);
        expect(component.exportValues.length).toBe(1);
        expect(component.elements[0]).toEqual({
            exportValues: null,
            exportId: null,
            deploymentId: null,
            service: {
                id: 'service_1', outputs: [{
                    content_variable: {
                        name: 'struct',
                        type: 'https://schema.org/StructuredValue', sub_content_variables: [{
                            id: 'urn:infai:ses:content-variable:4fa5515c-147d-4b0f-92fb-a667a6a9270a',
                            name: 'Time',
                            type: 'https://schema.org/Text',
                            characteristic_id: 'urn:infai:ses:characteristic:6bc41b45-a9f3-4d87-9c51-dd3e11257800',
                        }]
                    }
                }]
            } as DeviceTypeServiceModel,
            selectable: component.selectablesArray[0][0],
            function: component.funcArray[0][0],
            aspectId: 'aspect_1',
            name: null
        });
    }));

    it('select aspect, function, device, value', async(() => {
        component.addElement({} as DeviceStatusElementModel);
        component.elementsControl.at(0).patchValue({'aspectId': component.aspects[0].id});
        component.elementsControl.at(0).patchValue({'function': component.funcArray[0][0]});
        component.elementsControl.at(0).patchValue({'selectable': component.selectablesArray[0][0]});
        component.elementsControl.at(0).patchValue({'exportValues': component.exportValues[0][0]});

        expect(component.preparedDeployment.length).toBe(1);
        expect(component.exportValues.length).toBe(1);
        expect(component.elements[0]).toEqual({
            exportValues: {
                name: 'Time',
                characteristicId: 'urn:infai:ses:characteristic:6bc41b45-a9f3-4d87-9c51-dd3e11257800',
                path: 'value.struct.Time',
                type: 'https://schema.org/Text'
            } as DeviceStatusExportValuesModel,
            exportId: null,
            deploymentId: null,
            service: {
                id: 'service_1', outputs: [{
                    content_variable: {
                        name: 'struct',
                        type: 'https://schema.org/StructuredValue', sub_content_variables: [{
                            id: 'urn:infai:ses:content-variable:4fa5515c-147d-4b0f-92fb-a667a6a9270a',
                            name: 'Time',
                            type: 'https://schema.org/Text',
                            characteristic_id: 'urn:infai:ses:characteristic:6bc41b45-a9f3-4d87-9c51-dd3e11257800',
                        }]
                    }
                }]
            } as DeviceTypeServiceModel,
            selectable: component.selectablesArray[0][0],
            function: component.funcArray[0][0],
            aspectId: 'aspect_1',
            name: null
        });
    }));

    it('delete element', async(() => {
        component.addElement({} as DeviceStatusElementModel);
        component.elementsControl.at(0).patchValue({'aspectId': component.aspects[0].id});
        component.elementsControl.at(0).patchValue({'function': component.funcArray[0][0]});
        component.elementsControl.at(0).patchValue({'selectable': component.selectablesArray[0][0]});
        component.elementsControl.at(0).patchValue({'exportValues': component.exportValues[0][0]});
        component.deleteElement(0);
        expect(component.elements.length).toBe(0);
        expect(component.funcArray.length).toBe(0);
        expect(component.selectablesArray.length).toBe(0);
        expect(component.preparedDeployment.length).toBe(0);
        expect(component.exportValues.length).toBe(0);
        expect(component.aspects[0]).toEqual({id: 'aspect_1', name: 'Air'});
        expect(component.dashboardId).toBe('dashboardId-1');
        expect(component.widgetId).toBe('widgetId-1');
    }));

    it('save element', async(() => {
        valueServiceSpy.startPipeline.and.returnValue(of({ID: 'export_id_123'} as ExportModel));
        component.addElement({} as DeviceStatusElementModel);
        component.elementsControl.at(0).patchValue({'aspectId': component.aspects[0].id});
        component.elementsControl.at(0).patchValue({'function': component.funcArray[0][0]});
        component.elementsControl.at(0).patchValue({'selectable': component.selectablesArray[0][0]});
        component.elementsControl.at(0).patchValue({'exportValues': component.exportValues[0][0]});
        expect(component.elements[0].exportId).toBeNull();
        expect(component.elements[0].deploymentId).toBeNull();
        component.save();
        expect(component.elements[0].exportId).toBe('export_id_123');
        expect(component.elements[0].deploymentId).not.toBeNull();
        expect(valueServiceSpy.startPipeline.calls.count()).toBe(1);
    }));

    it('check if header exists', async(() => {
        const header = <HTMLHeadElement>fixture.debugElement.query(By.css('h2')).nativeElement;
        expect(header.innerHTML).toBe('Edit Device Status');
    }));
});
