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
import {ComponentFixture, fakeAsync, flush, TestBed, tick, waitForAsync} from '@angular/core/testing';
import { DeviceStatusEditDialogComponent } from './device-status-edit-dialog.component';
import { CoreModule } from '../../../core/core.module';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { EMPTY, of, Subject } from 'rxjs';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DeviceStatusElementModel } from '../shared/device-status-properties.model';
import {
    DeviceTypeAspectNodeModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel,
    DeviceTypeServiceModel,
} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import { AutomationEngineService } from '../../../core/services/automation-engine.service';
import { EngineDeployment, EngineSchedule } from '../../../core/model/automation-engine.model';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ExportModel, ExportValueCharacteristicModel } from '../../../modules/exports/shared/export.model';
import {v4 as uuid} from 'uuid';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { environment } from '../../../../environments/environment';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceSelectablesModel } from '../../../modules/devices/device-instances/shared/device-instances.model';
import {provideRouter} from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { GENERATED_RESOURCE_STORAGE, PENDING_GENERATED_RESOURCES_KEY, PendingGeneratedResource } from '../../shared/generated-resource-janitor';
import { DELETE_RETRY_NOTE } from '../../shared/generated-resources';
import { MemoryStorage } from '../../shared/memory-storage.mock';

describe('DeviceStatusEditDialogComponent', () => {
    let component: DeviceStatusEditDialogComponent;
    let fixture: ComponentFixture<DeviceStatusEditDialogComponent>;

    const exportServiceSpy: Spy<ExportService> = createSpyFromClass(ExportService);
    let engineSpy: Spy<AutomationEngineService>;
    const deviceInstanceServiceSpy: Spy<DeviceInstancesService> = createSpyFromClass<DeviceInstancesService>(DeviceInstancesService);
    const matDialogRefSpy: Spy<MatDialogRef<DeviceStatusEditDialogComponent>> =
        createSpyFromClass<MatDialogRef<DeviceStatusEditDialogComponent>>(MatDialogRef);
    const dashboardServiceSpy: Spy<DashboardService> = createSpyFromClass<DashboardService>(DashboardService);
    const deviceTypeServiceeSpy: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    let storage: MemoryStorage;
    const pending = (): PendingGeneratedResource[] => JSON.parse(storage.data.get(PENDING_GENERATED_RESOURCES_KEY) || '[]');
    const pendingIds = () => pending().map((e) => e.resource.id).sort();

    beforeEach(
        waitForAsync(() => {
            exportServiceSpy.startPipeline.and.returnValue(of({ ID: 'export_id_123' } as ExportModel));
            const exampleExport: ExportModel = {
                Name: 'device_service_1',
                Values: [
                    {
                        Name: 'Time',
                        Path: 'value.struct.Time',
                        Type: 'string',
                        InstanceID: '0',
                    },
                ],
                TimePath: 'struct.path',
            } as ExportModel;
            exportServiceSpy.prepareDeviceServiceExport.and.returnValue([exampleExport]);
            const exampleExportValueCharacteristicModel: ExportValueCharacteristicModel = {
                Name: 'Time',
                Path: 'value.struct.Time',
                Type: 'https://schema.org/Text',
                characteristicId: environment.timeStampCharacteristicId,
            };
            exportServiceSpy.addCharacteristicToDeviceTypeContentVariable.and.returnValue([exampleExportValueCharacteristicModel]);
            exportServiceSpy.getTimePath.and.returnValue({ path: 'value.struct.time' });
            engineSpy = createSpyFromClass<AutomationEngineService>(AutomationEngineService);
            engineSpy.createDeployment.and.returnValue(of({ id: uuid() } as EngineDeployment));
            engineSpy.createSchedule.and.returnValue(of({ id: uuid() } as EngineSchedule));

            deviceInstanceServiceSpy.getDeviceSelections.and.returnValue(
                of([
                    {
                        device: {
                            id: 'device_1',
                            name: 'device',
                            device_type_id: 'deviceTypeId_1',
                            local_id: '',
                            permissions: { read: true, write: false, execute: true, administrate: false },
                            owner_id: '',
                            connection_state: '',
                            device_type_name: '',
                            display_name: '',
                            shared: false,
                        },
                        services: [{ id: 'service_1', name: 'service' }],
                    },
                ] as DeviceSelectablesModel[]),
            );

            // the dialog deletes unsaved resources when the fixture is destroyed after a test
            exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 200 }));
            engineSpy.deleteDeploymentIfExists.and.returnValue(of({ status: 200 }));
            engineSpy.deleteScheduleIfExists.and.returnValue(of({ status: 200 }));
            dashboardServiceSpy.getWidget.and.returnValue(of({ name: 'test', properties: {} } as WidgetModel));
            dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));
            dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'OK' }));

            deviceTypeServiceeSpy.getAspectNodesWithMeasuringFunction.and.returnValue(
                of([
                    {
                        id: 'aspect_1',
                        name: 'Air',
                    },
                ] as DeviceTypeAspectNodeModel[]),
            );
            deviceTypeServiceeSpy.getAspectsMeasuringFunctions.and.returnValue(
                of([
                    {
                        id: 'func_1',
                        concept_id: 'concept_1',
                        name: 'getOnOffFunction',
                    },
                ] as DeviceTypeFunctionModel[]),
            );
            deviceTypeServiceeSpy.getDeviceType.and.returnValue(
                of({
                    services: [
                        {
                            id: 'service_1',
                            outputs: [
                                {
                                    content_variable: {
                                        name: 'struct',
                                        type: 'https://schema.org/StructuredValue',
                                        sub_content_variables: [
                                            {
                                                id: 'urn:infai:ses:content-variable:4fa5515c-147d-4b0f-92fb-a667a6a9270a',
                                                name: 'Time',
                                                type: 'https://schema.org/Text',
                                                characteristic_id: environment.timeStampCharacteristicId,
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    ],
                } as DeviceTypeModel),
            );

            storage = new MemoryStorage();
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                imports: [CoreModule,
                    MatSnackBarModule,
                    MatDialogModule,
                    MatIconModule,
                    MatExpansionModule,
                    MatInputModule,
                    ReactiveFormsModule, DeviceStatusEditDialogComponent],
                providers: [
                    provideRouter([]),
                    { provide: DeviceInstancesService, useValue: deviceInstanceServiceSpy },
                    { provide: DashboardService, useValue: dashboardServiceSpy },
                    { provide: DeviceTypeService, useValue: deviceTypeServiceeSpy },
                    { provide: AutomationEngineService, useValue: engineSpy },
                    { provide: ExportService, useValue: exportServiceSpy },
                    { provide: MatDialogRef, useValue: matDialogRefSpy },
                    { provide: MAT_DIALOG_DATA, useValue: { widgetId: 'widgetId-1', dashboardId: 'dashboardId-1' } },
                    { provide: GENERATED_RESOURCE_STORAGE, useFactory: () => storage },
                    { provide: AuthorizationService, useValue: { getUserId: () => 'user-1' } },
                    provideHttpClient(withInterceptorsFromDi()),
                    provideHttpClientTesting(),
                ],
            }).compileComponents();
            fixture = TestBed.createComponent(DeviceStatusEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        }),
    );

    it(
        'should create the app',
        waitForAsync(() => {
            expect(component).toBeTruthy();
        }),
    );

    it(
        'check the first dialog init',
        waitForAsync(() => {
            expect(component.widgetOld).toEqual({ name: 'test', properties: {} } as WidgetModel);
            expect(component.widgetNew).toEqual({ name: 'test', properties: {} } as WidgetModel);
            expect((component.formGroup.get('name') as FormControl).value).toBe('test');
            expect((component.formGroup.get('refreshTime') as FormControl).value).toBe(0);
            expect(component.elements.length).toBe(0);
            expect(component.funcArray.length).toBe(0);
            expect(component.selectablesArray.length).toBe(0);
            expect(component.generatedProcess.length).toBe(0);
            expect(component.serviceExportValueArray.length).toBe(0);
            expect(component.aspects.length).toBe(1);
            expect(component.aspects[0]).toEqual({ id: 'aspect_1', name: 'Air' } as DeviceTypeAspectNodeModel);
            expect(component.dashboardId).toBe('dashboardId-1');
            expect(component.widgetId).toBe('widgetId-1');
        }),
    );

    it(
        'add empty element',
        waitForAsync(() => {
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
                name: null,
                requestDevice: false,
                scheduleId: null,
            });
            expect(component.funcArray.length).toBe(0);
            expect(component.selectablesArray.length).toBe(0);
            expect(component.generatedProcess.length).toBe(0);
            expect(component.serviceExportValueArray.length).toBe(0);
        }),
    );

    it(
        'select aspect',
        waitForAsync(() => {
            component.addElement({} as DeviceStatusElementModel);
            component.elementsControl.at(0).patchValue({ aspectId: component.aspects[0].id });
            expect(component.funcArray[0].length).toBe(1);
            expect(component.funcArray[0]).toEqual([
                {
                    id: 'func_1',
                    concept_id: 'concept_1',
                    name: 'getOnOffFunction',
                } as DeviceTypeFunctionModel,
            ]);
            expect(component.selectablesArray.length).toBe(0);
            expect(component.generatedProcess.length).toBe(0);
            expect(component.serviceExportValueArray.length).toBe(0);
            expect(component.elements[0]).toEqual({
                exportValues: null,
                exportId: null,
                deploymentId: null,
                service: null,
                selectable: null,
                function: null,
                aspectId: 'aspect_1',
                name: null,
                requestDevice: false,
                scheduleId: null,
            });
        }),
    );

    it(
        'select aspect, function',
        fakeAsync(() => {
            component.addElement({} as DeviceStatusElementModel);
            component.elementsControl.at(0).patchValue({ aspectId: component.aspects[0].id });
            component.elementsControl.at(0).patchValue({ function: component.funcArray[0][0] });

            fixture.detectChanges();
            tick();     // wait for async operations
            flush();    // end delayed timers in subprocesses

            expect(component.selectablesArray.length).toBe(1);
            expect(component.selectablesArray[0]).toEqual([
                {
                    device: {
                        id: 'device_1',
                        name: 'device',
                        device_type_id: 'deviceTypeId_1',
                        local_id: '',
                        permissions: { read: true, write: false, execute: true, administrate: false },
                        owner_id: '',
                        connection_state: '',
                        device_type_name: '',
                        display_name: '',
                        shared: false,
                    },
                    services: [{ id: 'service_1', name: 'service' }],
                },
            ] as DeviceSelectablesModel[]);
            expect(component.generatedProcess.length).toBe(1);
            expect(component.serviceExportValueArray.length).toBe(0);
            expect(component.elements[0]).toEqual({
                exportValues: null,
                exportId: null,
                deploymentId: null,
                service: null,
                selectable: null,
                function: component.funcArray[0][0],
                aspectId: 'aspect_1',
                name: null,
                requestDevice: false,
                scheduleId: null,
            });
        }),
    );

    it(
        'select aspect, function, device',
        waitForAsync(() => {
            component.addElement({} as DeviceStatusElementModel);
            component.elementsControl.at(0).patchValue({ aspectId: component.aspects[0].id });
            component.elementsControl.at(0).patchValue({ function: component.funcArray[0][0] });
            component.elementsControl.at(0).patchValue({ selectable: component.selectablesArray[0][0] });

            expect(component.generatedProcess.length).toBe(1);
            expect(component.serviceExportValueArray.length).toBe(1);
            expect(component.elements[0]).toEqual({
                exportValues: null,
                exportId: null,
                deploymentId: null,
                service: {
                    id: 'service_1',
                    outputs: [
                        {
                            content_variable: {
                                name: 'struct',
                                type: 'https://schema.org/StructuredValue',
                                sub_content_variables: [
                                    {
                                        id: 'urn:infai:ses:content-variable:4fa5515c-147d-4b0f-92fb-a667a6a9270a',
                                        name: 'Time',
                                        type: 'https://schema.org/Text',
                                        characteristic_id: environment.timeStampCharacteristicId,
                                    },
                                ],
                            },
                        },
                    ],
                } as DeviceTypeServiceModel,
                selectable: component.selectablesArray[0][0],
                function: component.funcArray[0][0],
                aspectId: 'aspect_1',
                name: null,
                requestDevice: false,
                scheduleId: null,
            });
        }),
    );

    it(
        'select aspect, function, device, value',
        waitForAsync(() => {
            component.addElement({} as DeviceStatusElementModel);
            component.elementsControl.at(0).patchValue({ aspectId: component.aspects[0].id });
            component.elementsControl.at(0).patchValue({ function: component.funcArray[0][0] });
            component.elementsControl.at(0).patchValue({ selectable: component.selectablesArray[0][0] });
            component.elementsControl.at(0).patchValue({ service: component.serviceExportValueArray[0][0].service });
            component.elementsControl.at(0).patchValue({ exportValues: component.serviceExportValueArray[0][0].exportValues[0] });

            expect(component.generatedProcess.length).toBe(1);
            expect(component.serviceExportValueArray.length).toBe(1);
            expect(component.elements[0]).toEqual({
                exportValues: {
                    Name: 'Time',
                    characteristicId: environment.timeStampCharacteristicId,
                    Path: 'value.struct.Time',
                    Type: 'https://schema.org/Text',
                } as ExportValueCharacteristicModel,
                exportId: null,
                deploymentId: null,
                service: {
                    id: 'service_1',
                    outputs: [
                        {
                            content_variable: {
                                name: 'struct',
                                type: 'https://schema.org/StructuredValue',
                                sub_content_variables: [
                                    {
                                        id: 'urn:infai:ses:content-variable:4fa5515c-147d-4b0f-92fb-a667a6a9270a',
                                        name: 'Time',
                                        type: 'https://schema.org/Text',
                                        characteristic_id: environment.timeStampCharacteristicId,
                                    },
                                ],
                            },
                        },
                    ],
                } as DeviceTypeServiceModel,
                selectable: component.selectablesArray[0][0],
                function: component.funcArray[0][0],
                aspectId: 'aspect_1',
                name: null,
                requestDevice: false,
                scheduleId: null,
            });
        }),
    );

    it(
        'delete element',
        waitForAsync(() => {
            component.addElement({} as DeviceStatusElementModel);
            component.elementsControl.at(0).patchValue({ aspectId: component.aspects[0].id });
            component.elementsControl.at(0).patchValue({ function: component.funcArray[0][0] });
            component.elementsControl.at(0).patchValue({ selectable: component.selectablesArray[0][0] });
            component.elementsControl.at(0).patchValue({ service: component.serviceExportValueArray[0][0].service });
            component.elementsControl.at(0).patchValue({ exportValues: component.serviceExportValueArray[0][0].exportValues[0] });
            component.deleteElement(0);
            expect(component.elements.length).toBe(0);
            expect(component.funcArray.length).toBe(0);
            expect(component.selectablesArray.length).toBe(0);
            expect(component.generatedProcess.length).toBe(0);
            expect(component.serviceExportValueArray.length).toBe(0);
            expect(component.aspects[0]).toEqual({ id: 'aspect_1', name: 'Air' } as DeviceTypeAspectNodeModel);
            expect(component.dashboardId).toBe('dashboardId-1');
            expect(component.widgetId).toBe('widgetId-1');
        }),
    );

    it(
        'save element',
        waitForAsync(() => {
            component.addElement({} as DeviceStatusElementModel);
            component.elementsControl.at(0).patchValue({ aspectId: component.aspects[0].id });
            component.elementsControl.at(0).patchValue({ function: component.funcArray[0][0] });
            component.elementsControl.at(0).patchValue({ selectable: component.selectablesArray[0][0] });
            component.elementsControl.at(0).patchValue({ service: component.serviceExportValueArray[0][0].service });
            component.elementsControl.at(0).patchValue({ exportValues: component.serviceExportValueArray[0][0].exportValues[0] });
            component.elementsControl.at(0).patchValue({ requestDevice: true });
            expect(component.elements[0].exportId).toBeNull();
            expect(component.elements[0].deploymentId).toBeNull();
            exportServiceSpy.startPipeline.calls.reset();
            exportServiceSpy.stopPipelineByIdIfExists.calls.reset();
            engineSpy.createDeployment.calls.reset();
            component.save();
            expect(component.elements[0].exportId).not.toBeNull();
            expect(component.elements[0].deploymentId).not.toBeNull();
            expect(engineSpy.createDeployment.calls.count()).toBe(1);
            expect(exportServiceSpy.startPipeline.calls.count()).toBe(1);
            expect(exportServiceSpy.stopPipelineByIdIfExists.calls.count()).toBe(0);
        }),
    );

    it(
        'save element without process deployment',
        waitForAsync(() => {
            component.addElement({} as DeviceStatusElementModel);
            component.elementsControl.at(0).patchValue({ aspectId: component.aspects[0].id });
            component.elementsControl.at(0).patchValue({ function: component.funcArray[0][0] });
            component.elementsControl.at(0).patchValue({ selectable: component.selectablesArray[0][0] });
            component.elementsControl.at(0).patchValue({ service: component.serviceExportValueArray[0][0].service });
            component.elementsControl.at(0).patchValue({ exportValues: component.serviceExportValueArray[0][0].exportValues[0] });
            component.elementsControl.at(0).patchValue({ requestDevice: false });
            expect(component.elements[0].exportId).toBeNull();
            expect(component.elements[0].deploymentId).toBeNull();
            exportServiceSpy.startPipeline.calls.reset();
            exportServiceSpy.stopPipelineByIdIfExists.calls.reset();
            engineSpy.createDeployment.calls.reset();
            component.save();
            expect(component.elements[0].exportId).not.toBeNull();
            expect(component.elements[0].deploymentId).not.toBeNull();
            expect(engineSpy.createDeployment.calls.count()).toBe(0);
            expect(exportServiceSpy.startPipeline.calls.count()).toBe(1);
            expect(exportServiceSpy.stopPipelineByIdIfExists.calls.count()).toBe(0);
        }),
    );

    it(
        'deploys the generated process with the selected device and a schedule through the engine',
        waitForAsync(() => {
            component.addElement({} as DeviceStatusElementModel);
            component.elementsControl.at(0).patchValue({ aspectId: component.aspects[0].id });
            component.elementsControl.at(0).patchValue({ function: component.funcArray[0][0] });
            component.elementsControl.at(0).patchValue({ selectable: component.selectablesArray[0][0] });
            component.elementsControl.at(0).patchValue({ service: component.serviceExportValueArray[0][0].service });
            component.elementsControl.at(0).patchValue({ exportValues: component.serviceExportValueArray[0][0].exportValues[0] });
            component.elementsControl.at(0).patchValue({ requestDevice: true });
            component.formGroup.get('refreshTime')?.setValue(30);
            engineSpy.createDeployment.and.returnValue(of({ id: 'deployment_1' } as EngineDeployment));

            component.save();

            expect(engineSpy.createDeployment.calls.count()).toBe(1);
            const [input, namespace] = engineSpy.createDeployment.calls.mostRecent().args;
            expect(namespace).toBeUndefined();
            expect(input.source).toBe('generated');
            expect(input.xml).toContain('<bpmn:serviceTask id="Task_0os5tro"');
            expect(input.selections).toEqual({
                Task_0os5tro: { device_id: 'device_1', service_id: component.serviceExportValueArray[0][0].service.id },
            });
            expect(engineSpy.createSchedule.calls.count()).toBe(1);
            expect(engineSpy.createSchedule.calls.mostRecent().args[0]).toEqual({
                created_by: 'widgetId-1',
                deployment_id: 'deployment_1',
                cron: '0/30 * * * * *',
            });
        }),
    );

    describe('save failure paths', () => {
        let snackOpen: jasmine.Spy;

        function prepareElement(requestDevice: boolean, name = 'living room'): void {
            component.userHasUpdatePropertiesAuthorization = true;
            component.addElement({} as DeviceStatusElementModel);
            component.elementsControl.at(0).patchValue({ aspectId: component.aspects[0].id });
            component.elementsControl.at(0).patchValue({ function: component.funcArray[0][0] });
            component.elementsControl.at(0).patchValue({ selectable: component.selectablesArray[0][0] });
            component.elementsControl.at(0).patchValue({ service: component.serviceExportValueArray[0][0].service });
            component.elementsControl.at(0).patchValue({ exportValues: component.serviceExportValueArray[0][0].exportValues[0] });
            component.elementsControl.at(0).patchValue({ requestDevice, name });
            dashboardServiceSpy.updateWidgetProperty.calls.reset();
            dashboardServiceSpy.updateWidgetName.calls.reset();
            matDialogRefSpy.close.calls.reset();
            engineSpy.createDeployment.calls.reset();
        }

        function expectNoWidgetSave(): void {
            expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(0);
            expect(matDialogRefSpy.close.calls.count()).toBe(0);
        }

        beforeEach(() => {
            snackOpen = spyOn(TestBed.inject(MatSnackBar), 'open');
        });

        afterEach(() => {
            exportServiceSpy.startPipeline.and.returnValue(of({ ID: 'export_id_123' } as ExportModel));
            engineSpy.createDeployment.and.returnValue(of({ id: 'deployment_id_1' } as EngineDeployment));
            dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));
        });

        it(
            'saves the widget and closes when every step succeeded',
            waitForAsync(() => {
                prepareElement(true);
                component.save();
                expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
                expect(matDialogRefSpy.close.calls.count()).toBe(1);
                expect(snackOpen).not.toHaveBeenCalled();
            }),
        );

        it(
            'does not save the widget when the export cannot be created',
            waitForAsync(() => {
                prepareElement(true);
                exportServiceSpy.startPipeline.and.returnValue(of(null));
                component.save();
                expectNoWidgetSave();
                expect(engineSpy.createDeployment.calls.count()).toBe(0);
                expect(snackOpen.calls.mostRecent().args[0]).toContain('Could not create the export for living room');
                expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
            }),
        );

        it(
            'does not save the widget when the process deployment cannot be created',
            waitForAsync(() => {
                prepareElement(true);
                engineSpy.createDeployment.and.returnValue(of(null));
                component.save();
                expectNoWidgetSave();
                expect(snackOpen.calls.mostRecent().args[0]).toContain('Could not create the process deployment for living room');
            }),
        );

        it(
            'does not save the widget when the schedule cannot be created',
            waitForAsync(() => {
                prepareElement(true);
                (component.formGroup.get('refreshTime') as FormControl).setValue(5);
                engineSpy.createSchedule.and.returnValue(of(null));
                component.save();
                expectNoWidgetSave();
                expect(snackOpen.calls.mostRecent().args[0]).toContain('Could not create the schedule for living room');
            }),
        );

        it(
            'does not save the widget when a step completes without a value, and accepts a new save',
            waitForAsync(() => {
                prepareElement(true);
                exportServiceSpy.startPipeline.and.returnValue(EMPTY);
                component.save();
                expectNoWidgetSave();
                expect(engineSpy.createDeployment.calls.count()).toBe(0);

                exportServiceSpy.startPipeline.and.returnValue(of({ ID: 'export_id_123' } as ExportModel));
                component.save();
                expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
            }),
        );

        it(
            'does not take a skipped deployment for a failed one',
            waitForAsync(() => {
                prepareElement(false);
                component.save();
                expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
                expect(snackOpen).not.toHaveBeenCalled();
            }),
        );

        describe('cleanup of the old generated resources', () => {
            let order: string[];
            let deleteSchedule: jasmine.Spy;

            function storeOldElement(element: Partial<DeviceStatusElementModel>): void {
                (component as unknown as { persistedElements: Partial<DeviceStatusElementModel>[] }).persistedElements = [element];
            }

            beforeEach(() => {
                order = [];
                dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'OK' }));
                dashboardServiceSpy.updateWidgetProperty.and.callFake(() => {
                    order.push('save');
                    return of({ message: 'OK' });
                });
                exportServiceSpy.stopPipelineByIdIfExists.calls.reset();
                exportServiceSpy.stopPipelineByIdIfExists.and.callFake(() => {
                    order.push('delete export');
                    return of({ status: 200 });
                });
                engineSpy.deleteDeploymentIfExists.calls.reset();
                engineSpy.deleteDeploymentIfExists.and.callFake(() => {
                    order.push('delete deployment');
                    return of({ status: 200 });
                });
                deleteSchedule = engineSpy.deleteScheduleIfExists.and.callFake(() => {
                    order.push('delete schedule');
                    return of({ status: 200 });
                });
            });

            afterEach(() => {
                exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 200 }));
                engineSpy.deleteDeploymentIfExists.and.returnValue(of({ status: 200 }));
            });

            const oldElement = { name: 'old element', exportId: 'old_export', deploymentId: 'old_deployment', scheduleId: 'old_schedule' };
            // no delete was tried for what a property update without OK sent, so the notice claims none
            const KEPT_DEPLOYMENT =
                'Kept the process deployment of living room generated for the unsaved changes, since a save without confirmation may use it. ' +
                'A later clean-up deletes it if no widget does';

            it(
                'deletes nothing when a new resource cannot be created',
                waitForAsync(() => {
                    prepareElement(true);
                    storeOldElement(oldElement);
                    exportServiceSpy.startPipeline.and.returnValue(of(null));
                    component.save();
                    expect(order).toEqual([]);
                    expect(deleteSchedule.calls.count()).toBe(0);
                }),
            );

            it(
                'deletes the old deployment and schedule after the widget was saved and logs the old export for the clean-up',
                waitForAsync(() => {
                    prepareElement(true);
                    storeOldElement(oldElement);
                    component.save();
                    expect(order).toEqual(['save', 'delete deployment', 'delete schedule']);
                    expect(engineSpy.deleteDeploymentIfExists.calls.allArgs()).toEqual([['old_deployment']]);
                    expect(deleteSchedule.calls.allArgs()).toEqual([['old_schedule']]);
                    expect(pending().map((e) => [e.userId, e.dashboardId, e.widgetId, e.resource.kind, e.resource.id])).toEqual([
                        ['user-1', 'dashboardId-1', 'widgetId-1', 'export', 'old_export'],
                    ]);
                    expect(matDialogRefSpy.close.calls.count()).toBe(1);
                }),
            );

            it(
                'neither deletes nor logs a resource the saved widget still uses',
                waitForAsync(() => {
                    prepareElement(true);
                    engineSpy.createDeployment.and.returnValue(of({ id: 'deployment_id_1' } as EngineDeployment));
                    storeOldElement({ ...oldElement, exportId: 'export_id_123', deploymentId: 'deployment_id_1' });
                    component.save();
                    expect(order).toEqual(['save', 'delete schedule']);
                    expect(pendingIds()).toEqual([]);
                }),
            );

            it(
                'deletes the old resources at once when they cannot be logged, except what the saved widget still uses',
                waitForAsync(() => {
                    storage.failWrite = true;
                    prepareElement(true);
                    engineSpy.createDeployment.and.returnValue(of({ id: 'deployment_id_1' } as EngineDeployment));
                    storeOldElement({ ...oldElement, deploymentId: 'deployment_id_1' });
                    component.save();
                    expect(order).toEqual(['save', 'delete export', 'delete schedule']);
                    expect(exportServiceSpy.stopPipelineByIdIfExists.calls.allArgs()).toEqual([['old_export']]);
                    expect(snackOpen).not.toHaveBeenCalled();
                }),
            );

            it(
                'keeps the saved widget and reports a delete that failed when nothing can be logged',
                waitForAsync(() => {
                    storage.failWrite = true;
                    prepareElement(true);
                    storeOldElement(oldElement);
                    exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 500 }));
                    component.save();
                    expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
                    expect(matDialogRefSpy.close.calls.count()).toBe(1);
                    expect(snackOpen.calls.mostRecent().args[0]).toBe('The widget was saved, but the old export of old element could not be deleted');
                    expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
                }),
            );

            it(
                'keeps an old schedule logged whose delete failed after the save and says it is retried',
                waitForAsync(() => {
                    prepareElement(true);
                    storeOldElement(oldElement);
                    deleteSchedule.and.returnValue(of({ status: 500 }));
                    component.save();
                    expect(matDialogRefSpy.close.calls.count()).toBe(1);
                    expect(pendingIds()).toEqual(['old_export', 'old_schedule']);
                    expect(snackOpen.calls.mostRecent().args[0]).toBe(
                        'The widget was saved, but the old schedule of old element could not be deleted' + DELETE_RETRY_NOTE,
                    );
                    expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
                }),
            );

            it(
                'logs the export a failed attempt created once a retry was saved and deletes the old deployment and schedule',
                waitForAsync(() => {
                    prepareElement(true);
                    storeOldElement(oldElement);
                    let n = 0;
                    exportServiceSpy.startPipeline.and.callFake(() => of({ ID: 'export' + ++n } as ExportModel));
                    engineSpy.createDeployment.and.returnValues(of(null), of({ id: 'deployment_retry' } as EngineDeployment));

                    component.save();
                    expect(order).toEqual([]);
                    component.save();

                    expect(order).toEqual(['save', 'delete deployment', 'delete schedule']);
                    expect(engineSpy.deleteDeploymentIfExists.calls.allArgs()).toEqual([['old_deployment']]);
                    expect(pendingIds()).toEqual(['export1', 'old_export']);
                }),
            );

            it(
                'cleans up the old resources although the name update failed',
                waitForAsync(() => {
                    prepareElement(true);
                    component.userHasUpdateNameAuthorization = true;
                    dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'error' }));
                    storeOldElement(oldElement);

                    component.save();

                    expect(order).toEqual(['save', 'delete deployment', 'delete schedule']);
                    expect(pendingIds()).toEqual(['old_export']);
                    expect(matDialogRefSpy.close.calls.count()).toBe(0);
                }),
            );

            it(
                'takes a 404 for a resource that is already gone when nothing can be logged',
                waitForAsync(() => {
                    storage.failWrite = true;
                    prepareElement(true);
                    storeOldElement(oldElement);
                    exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 404 }));

                    component.save();

                    expect(matDialogRefSpy.close.calls.count()).toBe(1);
                    expect(snackOpen).not.toHaveBeenCalled();
                }),
            );

            it(
                'keeps the resources of the element list that was sent when an element is deleted during the request',
                waitForAsync(() => {
                    prepareElement(true);
                    storeOldElement(oldElement);
                    const response = new Subject<{ message: string }>();
                    dashboardServiceSpy.updateWidgetProperty.and.returnValue(response);

                    component.save();
                    component.deleteElement(0);
                    response.next({ message: 'OK' });
                    response.complete();

                    expect(engineSpy.deleteDeploymentIfExists.calls.allArgs()).toEqual([['old_deployment']]);
                    expect(pendingIds()).toEqual(['old_export']);
                }),
            );

            it(
                'ignores a second save while one is running and accepts one afterwards',
                waitForAsync(() => {
                    prepareElement(true);
                    const response = new Subject<{ message: string }>();
                    dashboardServiceSpy.updateWidgetProperty.and.returnValue(response);
                    exportServiceSpy.startPipeline.calls.reset();

                    component.save();
                    component.save();

                    expect(exportServiceSpy.startPipeline.calls.count()).toBe(1);
                    expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);

                    response.next({ message: 'error' });
                    response.complete();
                    component.save();

                    expect(exportServiceSpy.startPipeline.calls.count()).toBe(2);
                }),
            );

            it(
                'accepts a new save after a step failed',
                waitForAsync(() => {
                    prepareElement(true);
                    exportServiceSpy.startPipeline.and.returnValue(of(null));
                    component.save();
                    exportServiceSpy.startPipeline.calls.reset();

                    component.save();

                    expect(exportServiceSpy.startPipeline.calls.count()).toBe(1);
                }),
            );

            describe('resources of an attempt that was not saved', () => {
                let createSchedule: jasmine.Spy;

                beforeEach(() => {
                    createSchedule = engineSpy.createSchedule.and.returnValue(of(null));
                    exportServiceSpy.startPipeline.calls.reset();
                    engineSpy.createDeployment.and.returnValue(of({ id: 'deployment_id_1' } as EngineDeployment));
                });

                function closeDialog(): void {
                    component.close();
                    fixture.destroy();
                }

                // export and deployment are created, the schedule fails
                function failAtSchedule(): void {
                    prepareElement(true);
                    storeOldElement(oldElement);
                    (component.formGroup.get('refreshTime') as FormControl).setValue(5);
                }

                it(
                    'deletes the deployment the failed attempt created when the dialog is closed and keeps its export logged',
                    waitForAsync(() => {
                        failAtSchedule();
                        component.save();
                        expect(order).toEqual([]);

                        closeDialog();

                        expect(order).toEqual(['delete deployment']);
                        expect(engineSpy.deleteDeploymentIfExists.calls.allArgs()).toEqual([['deployment_id_1']]);
                        expect(deleteSchedule.calls.count()).toBe(0);
                        expect(pendingIds()).toEqual(['export_id_123']);
                        expect(snackOpen.calls.count()).toBe(1);
                    }),
                );

                it(
                    'deletes the deployments and schedules no longer used once the retry was saved and logs the exports',
                    waitForAsync(() => {
                        failAtSchedule();
                        let n = 0;
                        exportServiceSpy.startPipeline.and.callFake(() => {
                            order.push('create export');
                            return of({ ID: 'export' + ++n } as ExportModel);
                        });
                        engineSpy.createDeployment.and.returnValues(
                            of({ id: 'deployment_id_1' } as EngineDeployment),
                            of({ id: 'deployment_retry' } as EngineDeployment),
                        );
                        component.save();
                        createSchedule.and.returnValue(of({ id: 'schedule_retry' } as EngineSchedule));

                        component.save();
                        closeDialog();

                        expect(order).toEqual(['create export', 'create export', 'save', 'delete deployment', 'delete schedule', 'delete deployment']);
                        expect(engineSpy.deleteDeploymentIfExists.calls.allArgs()).toEqual([['old_deployment'], ['deployment_id_1']]);
                        expect(deleteSchedule.calls.allArgs()).toEqual([['old_schedule']]);
                        expect(pendingIds()).toEqual(['export1', 'old_export']);
                        expect(component.elements[0]).toEqual(
                            jasmine.objectContaining({ exportId: 'export2', deploymentId: 'deployment_retry', scheduleId: 'schedule_retry' }),
                        );
                    }),
                );

                it(
                    'deletes only the old deployment and schedule after a successful save, nothing more when the dialog closes',
                    waitForAsync(() => {
                        prepareElement(true);
                        storeOldElement(oldElement);

                        component.save();
                        closeDialog();

                        expect(order).toEqual(['save', 'delete deployment', 'delete schedule']);
                        expect(engineSpy.deleteDeploymentIfExists.calls.allArgs()).toEqual([['old_deployment']]);
                    }),
                );

                it(
                    'waits for a running attempt and cleans up only the old resources once it saved',
                    waitForAsync(() => {
                        prepareElement(true);
                        storeOldElement(oldElement);
                        const response = new Subject<{ message: string }>();
                        dashboardServiceSpy.updateWidgetProperty.and.returnValue(response);

                        component.save();
                        closeDialog();
                        expect(order).toEqual([]);
                        response.next({ message: 'OK' });
                        response.complete();

                        expect(order).toEqual(['delete deployment', 'delete schedule']);
                        expect(engineSpy.deleteDeploymentIfExists.calls.allArgs()).toEqual([['old_deployment']]);
                        expect(pendingIds()).toEqual(['old_export']);
                    }),
                );

                it(
                    'logs what a running attempt created once it ended without a save and deletes nothing',
                    waitForAsync(() => {
                        prepareElement(true);
                        storeOldElement(oldElement);
                        const deployment = new Subject<EngineDeployment | null>();
                        engineSpy.createDeployment.and.returnValue(deployment);

                        component.save();
                        closeDialog();
                        expect(order).toEqual([]);
                        deployment.next(null);
                        deployment.complete();

                        expect(order).toEqual([]);
                        expect(pendingIds()).toEqual(['export_id_123']);
                    }),
                );

                it(
                    'keeps what a property update without OK sent logged when the dialog closes and names its deployment',
                    waitForAsync(() => {
                        prepareElement(true);
                        storeOldElement(oldElement);
                        dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'error update' }));
                        dashboardServiceSpy.getWidget.calls.reset();

                        component.save();
                        closeDialog();

                        expect(dashboardServiceSpy.getWidget.calls.count()).toBe(0);
                        expect(order).toEqual([]);
                        expect(pendingIds()).toEqual(['deployment_id_1', 'export_id_123', 'old_deployment', 'old_export', 'old_schedule']);
                        expect(snackOpen.calls.mostRecent().args[0]).toBe(KEPT_DEPLOYMENT);
                    }),
                );

                it(
                    'never deletes what a property update without OK sent, not even after a later save',
                    waitForAsync(() => {
                        prepareElement(true);
                        storeOldElement(oldElement);
                        let n = 0;
                        exportServiceSpy.startPipeline.and.callFake(() => of({ ID: 'export' + ++n } as ExportModel));
                        engineSpy.createDeployment.and.returnValues(
                            of({ id: 'deployment_id_1' } as EngineDeployment),
                            of({ id: 'deployment_retry' } as EngineDeployment),
                        );
                        dashboardServiceSpy.updateWidgetProperty.and.returnValues(of({ message: 'error update' }), of({ message: 'OK' }));

                        component.save();
                        component.save();
                        closeDialog();

                        expect(exportServiceSpy.stopPipelineByIdIfExists.calls.count()).toBe(0);
                        expect(engineSpy.deleteDeploymentIfExists.calls.allArgs()).toEqual([['old_deployment']]);
                        expect(deleteSchedule.calls.allArgs()).toEqual([['old_schedule']]);
                        expect(pendingIds()).toEqual(['deployment_id_1', 'export1', 'old_export']);
                        expect(snackOpen.calls.mostRecent().args[0]).toBe(KEPT_DEPLOYMENT);
                    }),
                );

                it(
                    'logs on close what a later attempt created when an earlier property update had no OK',
                    waitForAsync(() => {
                        prepareElement(true);
                        storeOldElement(oldElement);
                        let n = 0;
                        exportServiceSpy.startPipeline.and.callFake(() => of({ ID: 'export' + ++n } as ExportModel));
                        engineSpy.createDeployment.and.returnValues(
                            of({ id: 'deployment_id_1' } as EngineDeployment),
                            of(null),
                        );
                        dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'error update' }));

                        component.save();
                        component.save();
                        closeDialog();

                        expect(order).toEqual([]);
                        expect(pendingIds()).toEqual(['deployment_id_1', 'export1', 'export2', 'old_deployment', 'old_export', 'old_schedule']);
                        expect(snackOpen.calls.mostRecent().args[0]).toBe(KEPT_DEPLOYMENT);
                    }),
                );

                it(
                    'keeps a resource of a failed attempt that the retry saves again',
                    waitForAsync(() => {
                        prepareElement(true);
                        storeOldElement(oldElement);
                        component.addElement({} as DeviceStatusElementModel);
                        const second = component.elementsControl.at(1);
                        second.patchValue({ aspectId: component.aspects[0].id });
                        second.patchValue({ function: component.funcArray[1][0] });
                        second.patchValue({ selectable: component.selectablesArray[1][0] });
                        second.patchValue({ service: component.serviceExportValueArray[1][0].service });
                        second.patchValue({ exportValues: component.serviceExportValueArray[1][0].exportValues[0] });
                        second.patchValue({ requestDevice: true, name: 'kitchen' });
                        const prepared = () =>
                            ({ Values: [{ Name: 'Time', Path: 'value.struct.Time', Type: 'string', InstanceID: '0' }] }) as ExportModel;
                        let prepares = 0;
                        // the retry gets two prepared exports for the first element, which keeps the export of the failed attempt
                        exportServiceSpy.prepareDeviceServiceExport.and.callFake(() => (++prepares === 3 ? [prepared(), prepared()] : [prepared()]));
                        let n = 0;
                        exportServiceSpy.startPipeline.and.callFake(() => of({ ID: 'export' + ++n } as ExportModel));
                        engineSpy.createDeployment.and.returnValues(
                            of(null),
                            of({ id: 'deployment_b1' } as EngineDeployment),
                            of({ id: 'deployment_a2' } as EngineDeployment),
                            of({ id: 'deployment_b2' } as EngineDeployment),
                        );

                        component.save();
                        component.save();

                        const sent = dashboardServiceSpy.updateWidgetProperty.calls.mostRecent().args[3].elements;
                        expect(sent[0].exportId).toBe('export1');
                        expect(sent[1].exportId).toBe('export3');
                        expect(exportServiceSpy.stopPipelineByIdIfExists.calls.allArgs()).not.toContain(['export1']);
                    }),
                );

                it(
                    'deletes what the failed attempt created at once on close when nothing can be logged',
                    waitForAsync(() => {
                        storage.failWrite = true;
                        failAtSchedule();
                        component.save();

                        closeDialog();

                        expect(exportServiceSpy.stopPipelineByIdIfExists.calls.allArgs()).toEqual([['export_id_123']]);
                        expect(engineSpy.deleteDeploymentIfExists.calls.allArgs()).toEqual([['deployment_id_1']]);
                        expect(deleteSchedule.calls.count()).toBe(0);
                    }),
                );

                it(
                    'reports a delete that failed after the dialog was closed when nothing can be logged',
                    waitForAsync(() => {
                        storage.failWrite = true;
                        failAtSchedule();
                        exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 500 }));
                        component.save();

                        closeDialog();

                        expect(matDialogRefSpy.close.calls.count()).toBe(1);
                        expect(snackOpen.calls.mostRecent().args[0]).toBe('Could not delete the export of living room generated for the unsaved changes');
                        expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
                    }),
                );

                it(
                    'cleans up the unsaved resources when the dialog is closed from the header icon',
                    waitForAsync(() => {
                        failAtSchedule();
                        component.save();

                        (fixture.nativeElement.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();
                        fixture.destroy();

                        expect(matDialogRefSpy.close.calls.mostRecent().args).toEqual([]);
                        expect(engineSpy.deleteDeploymentIfExists.calls.allArgs()).toEqual([['deployment_id_1']]);
                        expect(pendingIds()).toEqual(['export_id_123']);
                    }),
                );

                it(
                    'keeps a deployment logged whose delete failed when the dialog was closed and says it is retried',
                    waitForAsync(() => {
                        failAtSchedule();
                        engineSpy.deleteDeploymentIfExists.and.returnValue(of({ status: 500 }));
                        component.save();

                        closeDialog();

                        expect(pendingIds()).toEqual(['deployment_id_1', 'export_id_123']);
                        expect(snackOpen.calls.mostRecent().args[0]).toBe(
                            'Could not delete the process deployment of living room generated for the unsaved changes' + DELETE_RETRY_NOTE,
                        );
                        expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
                    }),
                );

                it(
                    'logs what a failed attempt created for this widget and keeps its export logged after the close',
                    waitForAsync(() => {
                        failAtSchedule();
                        component.save();

                        expect(pending().map((e) => [e.userId, e.dashboardId, e.widgetId, e.resource.kind, e.resource.id])).toEqual([
                            ['user-1', 'dashboardId-1', 'widgetId-1', 'export', 'export_id_123'],
                            ['user-1', 'dashboardId-1', 'widgetId-1', 'process deployment', 'deployment_id_1'],
                        ]);
                        closeDialog();

                        expect(pendingIds()).toEqual(['export_id_123']);
                    }),
                );

                it(
                    'keeps the old export of a save that answered OK logged when the dialog closes',
                    waitForAsync(() => {
                        prepareElement(true);
                        storeOldElement(oldElement);

                        component.save();
                        closeDialog();

                        expect(pendingIds()).toEqual(['old_export']);
                    }),
                );

                it(
                    'deletes the old resources at once after a save when the log cannot be read',
                    waitForAsync(() => {
                        prepareElement(true);
                        storeOldElement(oldElement);
                        storage.failRead = true;

                        component.save();

                        expect(order).toEqual(['save', 'delete export', 'delete deployment', 'delete schedule']);
                    }),
                );

                it(
                    'logs the resources of the stored state when a property update did not answer OK',
                    waitForAsync(() => {
                        prepareElement(true);
                        storeOldElement(oldElement);
                        dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'error update' }));

                        component.save();

                        expect(pendingIds()).toEqual(['deployment_id_1', 'export_id_123', 'old_deployment', 'old_export', 'old_schedule']);
                    }),
                );

                it(
                    'logs the export and deletes the deployment created when only the name could be saved',
                    waitForAsync(() => {
                        prepareElement(true);
                        component.userHasUpdatePropertiesAuthorization = false;
                        component.userHasUpdateNameAuthorization = true;

                        component.save();
                        expect(matDialogRefSpy.close.calls.count()).toBe(1);
                        fixture.destroy();

                        expect(order).toEqual(['delete deployment']);
                        expect(pendingIds()).toEqual(['export_id_123']);
                    }),
                );
            });
        });
    });

    it(
        'saves a widget without elements and closes the dialog',
        waitForAsync(() => {
            component.userHasUpdateNameAuthorization = true;
            component.userHasUpdatePropertiesAuthorization = true;
            component.formGroup.get('name')?.setValue('renamed');
            expect(component.elements.length).toBe(0);
            dashboardServiceSpy.updateWidgetName.calls.reset();
            dashboardServiceSpy.updateWidgetProperty.calls.reset();
            matDialogRefSpy.close.calls.reset();

            component.save();

            expect(dashboardServiceSpy.updateWidgetName.calls.count()).toBe(1);
            expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
            expect(matDialogRefSpy.close.calls.count()).toBe(1);
        }),
    );

    it(
        'closes the dialog without elements and without update authorization, and accepts a new save',
        waitForAsync(() => {
            component.userHasUpdateNameAuthorization = false;
            component.userHasUpdatePropertiesAuthorization = false;
            dashboardServiceSpy.updateWidgetName.calls.reset();
            dashboardServiceSpy.updateWidgetProperty.calls.reset();
            matDialogRefSpy.close.calls.reset();

            component.save();
            component.save();

            expect(dashboardServiceSpy.updateWidgetName.calls.count()).toBe(0);
            expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(0);
            expect(matDialogRefSpy.close.calls.count()).toBe(2);
        }),
    );

    describe('results of two elements of which the first is skipped', () => {
        const addElementWithService = (index: number, serviceId: string) => {
            component.addElement({} as DeviceStatusElementModel);
            component.elementsControl.at(index).patchValue({ aspectId: component.aspects[0].id });
            component.elementsControl.at(index).patchValue({ function: component.funcArray[index][0] });
            component.elementsControl.at(index).patchValue({ selectable: component.selectablesArray[index][0] });
            component.elementsControl.at(index).patchValue({ service: { ...component.serviceExportValueArray[index][0].service, id: serviceId } });
            component.elementsControl.at(index).patchValue({ exportValues: component.serviceExportValueArray[index][0].exportValues[0] });
        };

        it('gives the export to the element it was started for', waitForAsync(() => {
            addElementWithService(0, 'service_two_outputs');
            addElementWithService(1, 'service_1');
            exportServiceSpy.prepareDeviceServiceExport.and.callFake((_device, service) => {
                const make = () => ({ Name: 'x', Values: [{ Name: 'Time', Path: 'value.struct.Time', Type: 'string', InstanceID: '0' }] } as ExportModel);
                return service.id === 'service_two_outputs' ? [make(), make()] : [make()];
            });
            exportServiceSpy.startPipeline.and.returnValue(of({ ID: 'export_of_b' } as ExportModel));

            component.save();

            expect(component.elements[0].exportId).toBeNull();
            expect(component.elements[1].exportId).toBe('export_of_b');
        }));

        it('gives the deployment to the element it was created for', waitForAsync(() => {
            addElementWithService(0, 'service_1');
            addElementWithService(1, 'service_1');
            component.elementsControl.at(1).patchValue({ requestDevice: true });
            component.elementsControl.at(0).patchValue({ selectable: null });
            engineSpy.createDeployment.and.returnValue(of({ id: 'deployment_of_b' } as EngineDeployment));

            component.save();

            expect(component.elements[0].deploymentId).toBeNull();
            expect(component.elements[1].deploymentId).toBe('deployment_of_b');
        }));

        it('keeps the export and deployment of an element that gets no new one', waitForAsync(() => {
            addElementWithService(0, 'service_1');
            addElementWithService(1, 'service_1');
            component.elementsControl.at(0).patchValue({ selectable: null, exportId: 'old_export', deploymentId: 'old_deployment' });
            exportServiceSpy.startPipeline.and.returnValue(of({ ID: 'export_of_b' } as ExportModel));

            component.save();

            expect(component.elements[0].exportId).toBe('old_export');
            expect(component.elements[0].deploymentId).toBe('old_deployment');
            expect(component.elements[1].exportId).toBe('export_of_b');
        }));

        it('gives the schedule to the element it was created for', waitForAsync(() => {
            addElementWithService(0, 'service_1');
            addElementWithService(1, 'service_1');
            component.elementsControl.at(1).patchValue({ requestDevice: true });
            component.elementsControl.at(0).patchValue({ selectable: null });
            component.formGroup.get('refreshTime')?.setValue(5);
            engineSpy.createDeployment.and.returnValue(of({ id: 'deployment_of_b' } as EngineDeployment));
            engineSpy.createSchedule.and.returnValue(of({ id: 'schedule_of_b' } as EngineSchedule));

            component.save();

            expect(component.elements[0].scheduleId).toBeNull();
            expect(component.elements[1].scheduleId).toBe('schedule_of_b');
        }));
    });

    it(
        'check if header exists',
        waitForAsync(() => {
            const header = fixture.debugElement.query(By.css('h2')).nativeElement as HTMLHeadElement;
            expect(header.innerHTML).toBe('Edit Device Status');
        }),
    );
});
