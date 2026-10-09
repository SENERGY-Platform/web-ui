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

import {fakeAsync, flush, TestBed, tick} from '@angular/core/testing';
import { CoreModule } from '../../../core/core.module';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { of } from 'rxjs';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import {
    DeviceTypeInteractionEnum
} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ExportModel } from '../../../modules/exports/shared/export.model';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { environment } from '../../../../environments/environment';
import { DataTableEditDialogComponent } from './data-table-edit-dialog.component';
import {
    V2DeploymentsPreparedDiagramModel,
    V2DeploymentsPreparedModel,
} from '../../../modules/processes/deployments/shared/deployments-prepared-v2.model';
import { DataTableHelperService } from '../shared/data-table-helper.service';
import { WidgetModule } from '../../widget.module';
import { DataTableAggregations, DataTableElementTypesEnum, DataTableOrderEnum, ExportValueTypes } from '../shared/data-table.model';
import { ProcessSchedulerService } from '../../process-scheduler/shared/process-scheduler.service';
import {v4 as uuid} from 'uuid';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { SingleValueAggregations } from '../../single-value/shared/single-value.model';
import {provideRouter} from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

describe('DataTableEditDialogComponent', () => {
    let component: DataTableEditDialogComponent;

    // By assigning the value in beforeEach, call counters get resets before each test
    let exportServiceSpy: Spy<ExportService>;
    let deploymentsServiceSpy: Spy<DeploymentsService>;
    let matDialogRefSpy: Spy<MatDialogRef<DataTableEditDialogComponent>>;
    let dashboardServiceSpy: Spy<DashboardService>;
    let dataTableHelperServiceSpy: Spy<DataTableHelperService>;
    let processSchedulerServiceSpy: Spy<ProcessSchedulerService>;
    let deviceGroupServiceSpy: Spy<DeviceGroupsService>;
    let conceptsServiceSpy: Spy<ConceptsService>;

    const serviceMock = {
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
        interaction: DeviceTypeInteractionEnum.Request,
    };

    beforeEach(
        fakeAsync(() => {
            exportServiceSpy = createSpyFromClass(ExportService);
            deploymentsServiceSpy = createSpyFromClass<DeploymentsService>(DeploymentsService);
            matDialogRefSpy = createSpyFromClass<MatDialogRef<DataTableEditDialogComponent>>(MatDialogRef);
            dashboardServiceSpy = createSpyFromClass<DashboardService>(DashboardService);
            dataTableHelperServiceSpy = createSpyFromClass<DataTableHelperService>(DataTableHelperService);
            processSchedulerServiceSpy = createSpyFromClass<ProcessSchedulerService>(ProcessSchedulerService);
            deviceGroupServiceSpy = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);
            conceptsServiceSpy = createSpyFromClass<ConceptsService>(ConceptsService);

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
            exportServiceSpy.getExportTags.and.returnValue(of({}));

            deploymentsServiceSpy.v2postDeployments.and.returnValue(of({ status: 200, id: uuid() }));
            deploymentsServiceSpy.v2getPreparedDeploymentsByXml.and.returnValue(
                of({
                    id: '0',
                    name: 'unknown',
                    description: '',
                    diagram: {} as V2DeploymentsPreparedDiagramModel,
                    elements: [],
                    executable: true,
                    version: 3
                } as V2DeploymentsPreparedModel),
            );

            dashboardServiceSpy.getWidget.and.returnValue(of({ name: 'test', properties: {} } as WidgetModel));
            dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'OK' }));
            dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));

            dataTableHelperServiceSpy.initialize.and.returnValue(of(null));
            dataTableHelperServiceSpy.preloadExports.and.returnValue(of([]));
            dataTableHelperServiceSpy.getExportsForDeviceAndValue.and.returnValue([]);
            dataTableHelperServiceSpy.getExportsForPipelineOperatorValue.and.returnValue([]);
            dataTableHelperServiceSpy.preloadPipelines.and.returnValue(
                of([
                    {
                        id: 'pipelineId',
                        operators: [{ name: 'opName', id: 'operatorId', operatorId: 'operatorId' }],
                    },
                ]),
            );
            dataTableHelperServiceSpy.getPipelines.and.returnValue([
                {
                    id: 'pipelineId',
                    operators: [{ name: 'opName', id: 'operatorId', operatorId: 'operatorId' }],
                },
            ]);
            dataTableHelperServiceSpy.preloadOperator.and.returnValue(
                of({
                    name: 'opName',
                    outputs: [{ name: 'opValueName', type: 'string' }],
                }),
            );
            dataTableHelperServiceSpy.preloadAllOperators.and.returnValue(
                of([
                    {
                        name: 'opName',
                        outputs: [{ name: 'opValueName', type: 'string' }],
                    },
                ]),
            );
            dataTableHelperServiceSpy.getOperator.and.returnValue({ outputs: [{ name: 'opValueName', type: 'string' }] });
            dataTableHelperServiceSpy.getServiceValues.and.returnValue([]);
            dataTableHelperServiceSpy.preloadExportTags.and.returnValue(of(new Map()));
            dataTableHelperServiceSpy.getExportTags.and.returnValue(of(new Map()));
            dataTableHelperServiceSpy.preloadFullImportType.and.returnValue(of(undefined));

            processSchedulerServiceSpy.createSchedule.and.returnValue(of(null));

            dataTableHelperServiceSpy.preloadMeasuringFunctionsOfAspect.and.returnValue(of([{ id: 'aspectId' }]));
            const m = new Map();
            m.set('aspect', [{ id: 'aspectId' }]);
            dataTableHelperServiceSpy.getAspectsWithMeasuringFunction.and.returnValue(m);
            dataTableHelperServiceSpy.preloadDevicesOfFunctionAndAspect.and.returnValue(of([{ id: 'functionId' }]));
            dataTableHelperServiceSpy.getMeasuringFunctionsOfAspect.and.returnValue([{ id: 'functionId' }]);
            dataTableHelperServiceSpy.getDevicesOfFunctionAndAspect.and.returnValue([
                {
                    device: { id: 'deviceId' },
                    services: [serviceMock],
                },
            ]);
            dataTableHelperServiceSpy.getServiceValues.and.returnValue([
                {
                    Name: 'Time',
                    Path: 'struct.Time',
                    Type: ExportValueTypes.STRING,
                },
            ]);

            deploymentsServiceSpy.v2getPreparedDeploymentsByXml.and.returnValue(
                of({ name: '', elements: [{ task: { selection: { selected_device_id: null, selected_service_id: null } } }] }),
            );
            deploymentsServiceSpy.v2postDeployments.and.returnValue(of({ status: 200, id: 'deploymentId' }));
            processSchedulerServiceSpy.createSchedule.and.returnValue(of({ id: 'scheduleId' }));
            exportServiceSpy.startPipeline.and.returnValue(of({ ID: 'exportId' }));
            deviceGroupServiceSpy.getDeviceGroups.and.returnValue(of({result: []}));
            deviceGroupServiceSpy.getAspectListByIds.and.returnValue(of([]));
            deviceGroupServiceSpy.getFunctionListByIds.and.returnValue(of([]));
            deviceGroupServiceSpy.getDeviceClassListByIds.and.returnValue(of([]));
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                imports: [CoreModule,
                    MatSnackBarModule,
                    MatDialogModule,
                    MatIconModule,
                    MatExpansionModule,
                    MatInputModule,
                    ReactiveFormsModule,
                    NoopAnimationsModule,
                    WidgetModule, DataTableEditDialogComponent],
                providers: [
                    provideRouter([]),
                    { provide: DashboardService, useValue: dashboardServiceSpy },
                    { provide: DeploymentsService, useValue: deploymentsServiceSpy },
                    { provide: ExportService, useValue: exportServiceSpy },
                    { provide: MatDialogRef, useValue: matDialogRefSpy },
                    { provide: DataTableHelperService, useValue: dataTableHelperServiceSpy },
                    { provide: ProcessSchedulerService, useValue: processSchedulerServiceSpy },
                    { provide: DeviceGroupsService, useValue: deviceGroupServiceSpy },
                    { provide: ConceptsService, useValue: conceptsServiceSpy },
                    {
                        provide: MAT_DIALOG_DATA, useValue: {
                            widgetId: 'widgetId-1',
                            dashboardId: 'dashboardId-1',
                            userHasUpdateNameAuthorization: true,
                            userHasUpdatePropertiesAuthorization: true
                        }
                    },
                    provideHttpClient(withXhr(), withInterceptorsFromDi()),
                    provideHttpClientTesting(),
                ],
            }).compileComponents();
        }),
    );

    it(
        'should create the app',
        fakeAsync(() => {
            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            flush();

            expect(component).toBeTruthy();
        }),
    );

    it(
        'check the first dialog init',
        fakeAsync(() => {
            dataTableHelperServiceSpy.getAspectsWithMeasuringFunction.and.returnValue(new Map());
            dataTableHelperServiceSpy.getMeasuringFunctionsOfAspect.and.returnValue([]);
            dataTableHelperServiceSpy.getDevicesOfFunctionAndAspect.and.returnValue([]);
            dataTableHelperServiceSpy.getServiceValues.and.returnValue([]);

            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            flush();

            expect(component.widget).toEqual({ name: 'test', properties: {} } as WidgetModel);
            expect(component.formGroup.get('name')?.value).toBe('test');
            expect(component.formGroup.get('refreshTime')?.value).toBe(60);
            expect(component.formGroup.get('order')?.value).toBe(DataTableOrderEnum.Default);
            expect(component.formGroup.get('elements')?.value.length).toBe(1);
            expect(component.dashboardId).toBe('dashboardId-1');
            expect(component.widgetId).toBe('widgetId-1');

            const element = (component.formGroup.get('elements') as FormArray).at(0);
            expect(element.get('id')?.value.length).toBeGreaterThan(0);
            expect(element.get('name')?.value).toBe(null);
            expect(element.get('valueType')?.value).toBe(null);
            expect(element.get('format')?.value).toBe(null);
            expect(element.get('exportId')?.value).toBe(null);
            expect(element.get('exportValuePath')?.value).toBe(null);
            expect(element.get('exportValueName')?.value).toBe(null);
            expect(element.get('exportCreatedByWidget')?.value).toBe(null);
            expect(element.get('unit')?.value).toBe(null);
            expect(element.get('warning')?.get('enabled')?.value).toBe(false);
            expect(element.get('warning')?.get('lowerBoundary')?.value).toBe(null);
            expect(element.get('warning')?.get('upperBoundary')?.value).toBe(null);
            const elementDetails = element.get('elementDetails');
            expect(elementDetails?.get('elementType')?.value).toBe(DataTableElementTypesEnum.DEVICE);
            const device = elementDetails?.get('device');
            expect(device?.get('aspectId')?.value).toBe(null);
            expect(device?.get('functionId')?.value).toBe(null);
            expect(device?.get('deviceId')?.value).toBe(null);
            expect(device?.get('serviceId')?.value).toBe(null);
            expect(device?.get('deploymentId')?.value).toBe(null);
            expect(device?.get('requestDevice')?.value).toBe(false);
            expect(device?.get('scheduleId')?.value).toBe(null);
            expect(elementDetails?.get('pipeline')?.get('pipelineId')?.value).toBe(null);
            expect(elementDetails?.get('pipeline')?.get('operatorId')?.value).toBe(null);

            expect(element.valid).toBe(false);
            expect(component.formGroup.valid).toBe(false);
        }),
    );

    it(
        'should fill device data, create deployment, create schedule',
        fakeAsync(() => {
            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            flush();

            const element = component.getElements().at(0);
            element?.patchValue({ name: 'name', id: 'known-test-id' });
            component.formGroup.patchValue({ valueAlias: 'alias', order: DataTableOrderEnum.TimeAsc, refreshTime: 10 });
            const elementDetails = element?.get('elementDetails');
            element?.controls.elementDetails.controls.device.patchValue({ aspectId: 'aspectId' });
            expect(elementDetails?.get('device')?.get('aspectId')?.value).toBe('aspectId');

            component.runChangeDetection();
            tick(100);
            flush();

            expect(dataTableHelperServiceSpy.getMeasuringFunctionsOfAspect.calls.count()).toBeGreaterThanOrEqual(1);
            expect(dataTableHelperServiceSpy.getMeasuringFunctionsOfAspect.calls.mostRecent().args).toEqual(['aspectId']);
            expect(elementDetails?.get('device')?.get('functionId')?.value).toBe('functionId');
            expect(dataTableHelperServiceSpy.preloadDevicesOfFunctionAndAspect.calls.count()).toBeGreaterThanOrEqual(1);
            expect(dataTableHelperServiceSpy.preloadDevicesOfFunctionAndAspect.calls.mostRecent().args).toEqual(['aspectId', 'functionId']);
            expect(dataTableHelperServiceSpy.getDevicesOfFunctionAndAspect.calls.mostRecent().args).toEqual(['aspectId', 'functionId']);
            expect(elementDetails?.get('device')?.get('deviceId')?.value).toBe('deviceId');
            expect(elementDetails?.get('device')?.get('serviceId')?.value).toBe('service_1');
            expect(dataTableHelperServiceSpy.getServiceValues.calls.mostRecent().args).toEqual([serviceMock]);
            expect(element?.get('exportValuePath')?.value).toBe('struct.Time');
            expect(element?.get('exportValueName')?.value).toBe('Time');
            expect(element?.get('valueType')?.value).toBe(ExportValueTypes.STRING);
            expect(element?.get('exportCreatedByWidget')?.value).toBe(null);
            expect(element?.get('warning')?.disabled).toBe(true);
            expect(elementDetails?.get('device')?.get('requestDevice')?.value).toBe(true);
            expect(component.formGroup.valid).toBe(true);

            component.save();
            expect(deploymentsServiceSpy.v2getPreparedDeploymentsByXml.calls.count()).toBe(1);
            expect(deploymentsServiceSpy.v2postDeployments.calls.count()).toBe(1);
            expect(elementDetails?.get('device')?.get('requestDevice')?.value).toBe(true);
            expect(elementDetails?.get('device')?.get('deploymentId')?.value).toBe('deploymentId');
            expect(processSchedulerServiceSpy.createSchedule.calls.count()).toBe(1);
            expect(elementDetails?.get('device')?.get('scheduleId')?.value).toBe('scheduleId');
            expect(exportServiceSpy.startPipeline.calls.count()).toBe(0);
            expect(element?.get('exportId')?.value).toBe(null);

            expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
            expect(dashboardServiceSpy.updateWidgetProperty.calls.mostRecent().args).toEqual([
                'dashboardId-1',
                'widgetId-1',
                [],
                {
                    dataTable: {
                        name: 'test',
                        order: DataTableOrderEnum.TimeAsc,
                        valueAlias: 'alias',
                        refreshTime: 10,
                        valuesPerElement: 1,
                        elements: [
                            {
                                id: 'known-test-id',
                                name: 'name',
                                valueType: 'string',
                                exportId: null,
                                exportValuePath: 'struct.Time',
                                exportValueName: 'Time',
                                exportCreatedByWidget: null,
                                exportTagSelection: null,
                                exportDbId: undefined,
                                groupType: null,
                                groupTime: null,
                                unit: null,
                                elementDetails: {
                                    elementType: 0,
                                    device: {
                                        aspectId: 'aspectId',
                                        functionId: 'functionId',
                                        deviceId: 'deviceId',
                                        serviceId: 'service_1',
                                        deploymentId: 'deploymentId',
                                        requestDevice: true,
                                        scheduleId: 'scheduleId',
                                    },
                                    pipeline: {
                                        pipelineId: null,
                                        operatorId: null,
                                    },
                                    import: {
                                        typeId: null,
                                        instanceId: null,
                                    },
                                    deviceGroup: {
                                        deviceGroupId: null,
                                        deviceGroupCriteria: null,
                                        targetCharacteristic: null,
                                        deviceGroupAggregation: SingleValueAggregations.Latest,
                                    },
                                },
                            },
                        ],
                        convertRules: [],
                    }
                }
            ]);
        }),
    );

    it(
        'should enable warnings for int types',
        fakeAsync(() => {
            dataTableHelperServiceSpy.getServiceValues.and.returnValue([
                {
                    Name: 'Time',
                    Path: 'struct.Time',
                    Type: ExportValueTypes.INTEGER,
                },
            ]);
            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            flush();

            const element = component.getElements().at(0);
            expect(element?.get('warning')?.enabled).toBe(true);
        }),
    );

    it(
        'should not always create deployments and schedules',
        fakeAsync(() => {
            const serviceMockEvent = {
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
                interaction: DeviceTypeInteractionEnum.Event,
            };

            dataTableHelperServiceSpy.getDevicesOfFunctionAndAspect.and.returnValue([
                {
                    device: { id: 'deviceId' },
                    services: [serviceMockEvent],
                },
            ]);

            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            flush();

            expect(component.getElements().at(0).get('elementDetails')?.get('device')?.get('requestDevice')?.value).toBe(false);
            component.save();
            expect(deploymentsServiceSpy.v2getPreparedDeploymentsByXml.calls.count()).toBe(0);
            expect(deploymentsServiceSpy.v2postDeployments.calls.count()).toBe(0);
            expect(processSchedulerServiceSpy.createSchedule.calls.count()).toBe(0);
        }),
    );

    it(
        'should not always create exports',
        fakeAsync(() => {
            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            flush();

            expect(component.getElements().at(0).get('exportId')?.value).toBe(null);
            component.save();
            expect(exportServiceSpy.startPipeline.calls.count()).toBe(0);
        }),
    );

    it(
        'should copy, move and delete elements',
        () => {
            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            component.copyTab(0);
            component.copyTab(0);
            expect(component.getElements().length).toBe(3);
            const id0 = component.getElement(0)?.get('id')?.value;
            const id1 = component.getElement(1).get('id')?.value;
            const id2 = component.getElement(2)?.get('id')?.value;
            expect((id0 as string).length).toBeGreaterThan(0);
            expect(id0 !== id1).toBeTrue();
            expect(id1 !== id2).toBeTrue();
            expect(component.step).toBe(2);
            const elementOld = component.getElement(0)?.getRawValue();
            const elementNew = component.getElement(1)?.getRawValue();
            elementOld.id = '';
            elementNew.id = '';
            if (elementNew.exportDbId === undefined) {
                elementNew.exportDbId = null; // is undefined, also fine
            }

            expect(elementNew).toEqual(elementOld);

            component.moveUp(0);
            expect(component.getElement(1)?.get('id')?.value).toBe(id0);
            expect(component.getElement(0)?.get('id')?.value).toBe(id1);
        }
    );

    it(
        'should fill pipeline data and create export',
        () => {
            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            const element = component.getElements().at(0);
            const elementDetails = element.get('elementDetails');

            element.controls.elementDetails.patchValue({ elementType: DataTableElementTypesEnum.PIPELINE });
            element.controls.elementDetails.controls.pipeline.patchValue({ pipelineId: 'pipelineId' });
            component.runChangeDetection();
            expect(elementDetails?.get('pipeline')?.get('operatorId')?.value).toBe('operatorId');
            expect(element?.get('exportValuePath')?.value).toBe('analytics.opValueName');
            expect(element?.get('valueType')?.value).toBe(ExportValueTypes.STRING);

            component.save();
            expect(exportServiceSpy.startPipeline.calls.count()).toBe(1);
            expect(exportServiceSpy.startPipeline.calls.mostRecent().args).toEqual([
                {
                    Name: 'Widget: test',
                    TimePath: 'time',
                    Values: [
                        {
                            Name: 'opValueName',
                            Path: 'analytics.opValueName',
                            Type: 'string',
                        },
                    ],
                    EntityName: 'operatorId',
                    Filter: 'pipelineId:operatorId',
                    FilterType: 'operatorId',
                    ServiceName: 'opName',
                    Topic: 'analytics-opName',
                    Offset: 'largest',
                    Generated: true,
                    Description: 'generated Export',
                    TimestampFormat: '%Y-%m-%dT%H:%M:%S.%fZ',
                    ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
                },
            ]);
        });

    describe('save orchestration', () => {
        function open(): DataTableEditDialogComponent {
            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            flush();
            return component;
        }

        function savedElement(): any {
            return (dashboardServiceSpy.updateWidgetProperty.calls.mostRecent().args[3] as any).dataTable.elements[0];
        }

        it(
            'saves an import element and starts the import export',
            fakeAsync(() => {
                dataTableHelperServiceSpy.getFullImportType.and.returnValue({ name: 'importTypeName' } as any);
                dataTableHelperServiceSpy.getImportTypeValues.and.returnValue([{ Name: 'v', Path: 'value.v', Type: ExportValueTypes.FLOAT }] as any);
                dataTableHelperServiceSpy.getImportInstancesOfType.and.returnValue([{ id: 'inst1', kafka_topic: 'topic1' }] as any);
                dataTableHelperServiceSpy.getExportsOfImportInstance.and.returnValue([]);
                dataTableHelperServiceSpy.getPreloadedExportById.and.returnValue({
                    ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
                } as ExportModel);
                open();

                const element = component.getElements().at(0);
                element.controls.elementDetails.patchValue({ elementType: DataTableElementTypesEnum.IMPORT });
                element.controls.elementDetails.controls.import.patchValue({ typeId: 'type1', instanceId: 'inst1' });
                element.patchValue({ name: 'imp', exportValuePath: 'value.v', exportCreatedByWidget: true });
                expect(element.get('exportValueName')?.value).toBe('v');
                expect(element.get('valueType')?.value).toBe(ExportValueTypes.FLOAT);

                component.save();

                expect(exportServiceSpy.startPipeline.calls.count()).toBe(1);
                expect(exportServiceSpy.startPipeline.calls.mostRecent().args).toEqual([
                    {
                        Name: 'Widget: test',
                        Description: 'generated Export',
                        TimePath: 'time',
                        Values: [{ Name: 'v', Path: 'value.v', Type: ExportValueTypes.FLOAT }],
                        EntityName: 'inst1',
                        Filter: 'inst1',
                        FilterType: 'import_id',
                        ServiceName: 'importTypeName',
                        Topic: 'topic1',
                        Offset: 'smallest',
                        Generated: true,
                        TimestampFormat: '%Y-%m-%dT%H:%M:%SZ',
                        ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
                    } as ExportModel,
                ]);
                expect(deploymentsServiceSpy.v2getPreparedDeploymentsByXml.calls.count()).toBe(0);

                const saved = savedElement();
                expect(saved.exportId).toBe('exportId');
                expect(saved.exportCreatedByWidget).toBe(true);
                expect(saved.exportDbId).toBe(environment.exportDatabaseIdInternalTimescaleDb);
                expect(saved.elementDetails.elementType).toBe(DataTableElementTypesEnum.IMPORT);
                expect(saved.elementDetails.import).toEqual({ typeId: 'type1', instanceId: 'inst1' });
                expect(saved.elementDetails.device).toEqual({});
                expect(matDialogRefSpy.close.calls.mostRecent().args).toEqual([component.widget]);
            }),
        );

        it(
            'does not start an import export when the import type is unknown',
            fakeAsync(() => {
                dataTableHelperServiceSpy.getFullImportType.and.returnValue(undefined);
                dataTableHelperServiceSpy.getImportTypeValues.and.returnValue([]);
                dataTableHelperServiceSpy.getImportInstancesOfType.and.returnValue([{ id: 'inst1', kafka_topic: 'topic1' }] as any);
                dataTableHelperServiceSpy.getExportsOfImportInstance.and.returnValue([]);
                open();

                const element = component.getElements().at(0);
                element.controls.elementDetails.patchValue({ elementType: DataTableElementTypesEnum.IMPORT });
                element.controls.elementDetails.controls.import.patchValue({ typeId: 'type1', instanceId: 'inst1' });
                element.patchValue({ exportCreatedByWidget: true });

                expect(() => component.save()).toThrowError('undefined values');
                expect(exportServiceSpy.startPipeline.calls.count()).toBe(0);
                expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(0);
            }),
        );

        it(
            'saves a device-group element with the criteria, unit and target characteristic it resolved',
            fakeAsync(() => {
                deviceGroupServiceSpy.getDeviceGroups.and.returnValue(of({
                    result: [{
                        id: 'dg1',
                        name: 'group',
                        criteria: [{ interaction: 'request', function_id: 'f1', aspect_id: 'a1', device_class_id: 'dc1' }],
                    }],
                } as any));
                deviceGroupServiceSpy.getFunctionListByIds.and.returnValue(of([{ id: 'f1', concept_id: 'c1', display_name: 'Temp' }] as any));
                conceptsServiceSpy.getConceptWithCharacteristics.and.returnValue(of({
                    id: 'c1',
                    characteristics: [
                        { id: 'ch1', name: 'celsius', display_unit: '\u00b0C', type: 'https://schema.org/Float' },
                        { id: 'ch2', name: 'count', type: 'https://schema.org/Integer' },
                    ],
                } as any));
                open();

                const element = component.getElements().at(0);
                element.controls.elementDetails.patchValue({ elementType: DataTableElementTypesEnum.DEVICE_GROUP });
                const criteria = component.getCriteria(element);
                expect(criteria).toEqual([]);
                element.controls.elementDetails.controls.deviceGroup.patchValue({ deviceGroupId: 'dg1' });
                const offered = component.getCriteria(element);
                expect(offered).toEqual([{ interaction: '', function_id: 'f1', aspect_id: 'a1', device_class_id: 'dc1' }]);

                element.controls.elementDetails.controls.deviceGroup.patchValue({
                    deviceGroupCriteria: offered[0],
                    deviceGroupAggregation: DataTableAggregations.Sum,
                });
                expect(conceptsServiceSpy.getConceptWithCharacteristics.calls.mostRecent().args).toEqual(['c1']);
                expect(component.getConcept(element)?.id).toBe('c1');

                element.patchValue({ name: 'grp', unit: 'count' });
                expect(element.controls.elementDetails.controls.deviceGroup.value.targetCharacteristic).toBe('ch2');
                expect(element.get('valueType')?.value).toBe(ExportValueTypes.INTEGER);

                component.save();

                expect(exportServiceSpy.startPipeline.calls.count()).toBe(0);
                expect(deploymentsServiceSpy.v2postDeployments.calls.count()).toBe(0);
                expect(processSchedulerServiceSpy.createSchedule.calls.count()).toBe(0);
                const saved = savedElement();
                expect(saved.name).toBe('grp');
                expect(saved.unit).toBe('count');
                expect(saved.valueType).toBe(ExportValueTypes.INTEGER);
                expect(saved.elementDetails.elementType).toBe(DataTableElementTypesEnum.DEVICE_GROUP);
                expect(saved.elementDetails.deviceGroup).toEqual({
                    deviceGroupId: 'dg1',
                    deviceGroupCriteria: { interaction: '', function_id: 'f1', aspect_id: 'a1', device_class_id: 'dc1' },
                    targetCharacteristic: 'ch2',
                    deviceGroupAggregation: DataTableAggregations.Sum,
                });
                // disabled controls do not reach the stored value
                expect('exportId' in saved).toBeFalse();
                expect(saved.elementDetails.device).toEqual({});
                expect(matDialogRefSpy.close.calls.count()).toBe(1);
            }),
        );

        function requestElements(count: number): void {
            dataTableHelperServiceSpy.getMeasuringFunctionsOfAspect.and.returnValue([
                { id: 'functionId', name: 'getTemperature', concept_id: 'concept1' },
            ] as any);
            open();
            while (component.getElements().length < count) {
                component.addNewMeasurement();
            }
            component.formGroup.patchValue({ valueAlias: 'alias' });
            component.getElements().controls.forEach((element, i) => {
                element.patchValue({ name: 'name' + i });
                element.controls.elementDetails.controls.device.patchValue({
                    aspectId: 'aspectId',
                    functionId: 'functionId',
                    deviceId: 'deviceId',
                    serviceId: 'service_1',
                    requestDevice: true,
                });
            });
        }

        it(
            'spreads the start second of generated schedules over the refresh time',
            fakeAsync(() => {
                requestElements(3);
                component.formGroup.patchValue({ refreshTime: 10 });

                component.save();

                expect(deploymentsServiceSpy.v2postDeployments.calls.count()).toBe(3);
                expect(processSchedulerServiceSpy.createSchedule.calls.allArgs().map((a) => a[0])).toEqual([
                    { created_by: 'widgetId-1', process_deployment_id: 'deploymentId', cron: '0/10 * * * * *', id: '' },
                    { created_by: 'widgetId-1', process_deployment_id: 'deploymentId', cron: '3/10 * * * * *', id: '' },
                    { created_by: 'widgetId-1', process_deployment_id: 'deploymentId', cron: '7/10 * * * * *', id: '' },
                ]);
            }),
        );

        it(
            'does not spread the schedule when the refresh time is a wildcard',
            fakeAsync(() => {
                requestElements(2);
                component.formGroup.patchValue({ refreshTime: '*' });

                component.save();

                expect(processSchedulerServiceSpy.createSchedule.calls.allArgs().map((a) => a[0].cron)).toEqual([
                    '* * * * * *',
                    '* * * * * *',
                ]);
            }),
        );

        it(
            'creates no deployment when the refresh time is 0',
            fakeAsync(() => {
                requestElements(1);
                component.formGroup.patchValue({ refreshTime: 0 });

                component.save();

                expect(deploymentsServiceSpy.v2getPreparedDeploymentsByXml.calls.count()).toBe(0);
                expect(processSchedulerServiceSpy.createSchedule.calls.count()).toBe(0);
            }),
        );

        it(
            'generates the deployment XML and SVG for a device element',
            fakeAsync(() => {
                requestElements(1);
                component.formGroup.patchValue({ refreshTime: 10 });

                component.save();

                expect(deploymentsServiceSpy.v2getPreparedDeploymentsByXml.calls.count()).toBe(1);
                const [xml, svg] = deploymentsServiceSpy.v2getPreparedDeploymentsByXml.calls.mostRecent().args as [string, string];

                expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<bpmn:definitions ')).toBeTrue();
                expect(xml.endsWith('</bpmn:serviceTask></bpmn:process></bpmn:definitions>')).toBeTrue();
                const doc = new DOMParser().parseFromString(xml, 'application/xml');
                expect(doc.getElementsByTagName('parsererror').length).toBe(0);
                const task = doc.getElementsByTagName('bpmn:serviceTask')[0];
                expect(task.getAttribute('name')).toBe('getTemperature');
                expect(task.getAttribute('camunda:type')).toBe('external');
                expect(task.getAttribute('camunda:topic')).toBe('pessimistic');
                const payload = JSON.parse(doc.getElementsByTagName('camunda:inputParameter')[0].textContent as string);
                expect(payload).toEqual({
                    function: {
                        id: 'functionId',
                        name: 'getTemperature',
                        concept_id: 'concept1',
                        rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction',
                    },
                    device_class: null,
                    aspect: { id: 'aspectId', name: 'aspect', rdf_type: 'https://senergy.infai.org/ontology/Aspect' },
                    label: 'getFunction',
                    input: {},
                    characteristic_id: 'urn:infai:ses:characteristic:7621686a-56bc-402d-b4cc-5b266d39736f',
                    retries: 0,
                });

                expect(svg.startsWith('<?xml version="1.0" encoding="utf-8"?>\n<!-- created with bpmn-js / http://bpmn.io -->\n<!DOCTYPE svg ')).toBeTrue();
                expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="112" height="92" viewBox="254 74 112 92" version="1.1">');
                expect(svg).toContain('<tspan x="11.4375" y="43.599999999999994">GENERATED!</tspan>');
                expect(svg.endsWith('</g></g></svg>')).toBeTrue();

                const posted = deploymentsServiceSpy.v2postDeployments.calls.mostRecent().args as any[];
                expect(posted[1]).toBe('generated');
                expect(posted[0].name).toBe('test');
                expect(posted[0].elements[0].task.selection).toEqual({ selected_device_id: 'deviceId', selected_service_id: 'service_1' });
            }),
        );

        it(
            'saves only the name when the user may not update the properties',
            fakeAsync(() => {
                TestBed.overrideProvider(MAT_DIALOG_DATA, {
                    useValue: {
                        widgetId: 'widgetId-1',
                        dashboardId: 'dashboardId-1',
                        userHasUpdateNameAuthorization: true,
                        userHasUpdatePropertiesAuthorization: false,
                    },
                });
                open();
                component.formGroup.patchValue({ name: 'renamed' });

                component.save();

                expect(dashboardServiceSpy.updateWidgetName.calls.allArgs()).toEqual([['dashboardId-1', 'widgetId-1', 'renamed']]);
                expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(0);
                expect(exportServiceSpy.startPipeline.calls.count()).toBe(0);
                expect(deploymentsServiceSpy.v2getPreparedDeploymentsByXml.calls.count()).toBe(0);
                expect(matDialogRefSpy.close.calls.allArgs()).toEqual([[component.widget]]);
                expect(component.widget.name).toBe('renamed');
            }),
        );

        it(
            'keeps the dialog open when the property update reports an error',
            fakeAsync(() => {
                dashboardServiceSpy.updateWidgetProperty.and.returnValue(of({ message: 'error' }));
                open();

                component.save();

                expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
                expect(matDialogRefSpy.close.calls.count()).toBe(0);
                expect(component.saving).toBeFalse();
            }),
        );

        it(
            'keeps the dialog open when the name update reports an error',
            fakeAsync(() => {
                dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'error' }));
                open();

                component.save();

                expect(matDialogRefSpy.close.calls.count()).toBe(0);
                expect(component.saving).toBeFalse();
            }),
        );

        describe('failed generated resources', () => {
            let snackOpen: jasmine.Spy;

            beforeEach(() => {
                snackOpen = spyOn(TestBed.inject(MatSnackBar), 'open');
            });

            function expectAborted(text: string): void {
                expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(0);
                expect(matDialogRefSpy.close.calls.count()).toBe(0);
                expect(component.saving).toBeFalse();
                expect(snackOpen.calls.mostRecent().args[0]).toContain(text);
                expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
            }

            it(
                'does not store the widget when the process deployment cannot be created',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    deploymentsServiceSpy.v2postDeployments.and.returnValue(of({ status: 500, id: '' }));

                    component.save();

                    expect(processSchedulerServiceSpy.createSchedule.calls.count()).toBe(0);
                    expectAborted('Could not create the process deployment for name0');
                }),
            );

            it(
                'does not store the widget when the prepared deployment cannot be loaded',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    deploymentsServiceSpy.v2getPreparedDeploymentsByXml.and.returnValue(of(null));

                    component.save();

                    expect(deploymentsServiceSpy.v2postDeployments.calls.count()).toBe(0);
                    expectAborted('Could not create the process deployment for name0');
                }),
            );

            it(
                'does not store the widget when the schedule cannot be created',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    processSchedulerServiceSpy.createSchedule.and.returnValue(of(null));

                    component.save();

                    expectAborted('Could not create the schedule for name0');
                }),
            );

            it(
                'names every failed element',
                fakeAsync(() => {
                    requestElements(2);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    processSchedulerServiceSpy.createSchedule.and.returnValue(of(null));

                    component.save();

                    expectAborted('Could not create the schedule for name0, the schedule for name1');
                }),
            );

            it(
                'does not store the widget when the export cannot be created',
                fakeAsync(() => {
                    dataTableHelperServiceSpy.getFullImportType.and.returnValue({ name: 'importTypeName' } as any);
                    dataTableHelperServiceSpy.getImportTypeValues.and.returnValue([{ Name: 'v', Path: 'value.v', Type: ExportValueTypes.FLOAT }] as any);
                    dataTableHelperServiceSpy.getImportInstancesOfType.and.returnValue([{ id: 'inst1', kafka_topic: 'topic1' }] as any);
                    dataTableHelperServiceSpy.getExportsOfImportInstance.and.returnValue([]);
                    dataTableHelperServiceSpy.getPreloadedExportById.and.returnValue({
                        ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
                    } as ExportModel);
                    open();
                    const element = component.getElements().at(0);
                    element.controls.elementDetails.patchValue({ elementType: DataTableElementTypesEnum.IMPORT });
                    element.controls.elementDetails.controls.import.patchValue({ typeId: 'type1', instanceId: 'inst1' });
                    element.patchValue({ name: 'imp', exportValuePath: 'value.v', exportCreatedByWidget: true });
                    exportServiceSpy.startPipeline.and.returnValue(of(null));

                    component.save();

                    expect(exportServiceSpy.startPipeline.calls.count()).toBe(1);
                    expectAborted('Could not create the export for imp');
                }),
            );

            it(
                'stores the widget when every generated resource was created',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });

                    component.save();

                    expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
                    expect(matDialogRefSpy.close.calls.count()).toBe(1);
                    expect(snackOpen).not.toHaveBeenCalled();
                }),
            );
        });

        describe('cleanup of the old generated resources', () => {
            let snackOpen: jasmine.Spy;
            let order: string[];

            beforeEach(() => {
                snackOpen = spyOn(TestBed.inject(MatSnackBar), 'open');
                order = [];
                dashboardServiceSpy.updateWidgetProperty.and.callFake(() => {
                    order.push('save');
                    return of({ message: 'OK' });
                });
                exportServiceSpy.stopPipelineByIdIfExists.and.callFake(() => {
                    order.push('delete export');
                    return of({ status: 200 });
                });
                deploymentsServiceSpy.v2deleteDeploymentIfExists.and.callFake(() => {
                    order.push('delete deployment');
                    return of({ status: 200 });
                });
                processSchedulerServiceSpy.deleteScheduleIfExists.and.callFake(() => {
                    order.push('delete schedule');
                    return of({ status: 200 });
                });
            });

            function storeOldElement(deploymentId: string, scheduleId: string): void {
                component.widget.properties.dataTable = {
                    elements: [
                        {
                            id: 'old',
                            name: 'old element',
                            exportId: 'old_export',
                            exportCreatedByWidget: true,
                            elementDetails: { elementType: DataTableElementTypesEnum.DEVICE, device: { deploymentId, scheduleId } },
                        },
                    ],
                } as any;
            }

            it(
                'deletes nothing when a new resource cannot be created',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    storeOldElement('old_deployment', 'old_schedule');
                    processSchedulerServiceSpy.createSchedule.and.returnValue(of(null));

                    component.save();

                    expect(order).toEqual([]);
                    expect(snackOpen.calls.mostRecent().args[0]).toContain('Could not create the schedule for name0');
                }),
            );

            it(
                'deletes the old resources after the widget properties were saved',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    storeOldElement('old_deployment', 'old_schedule');

                    component.save();

                    expect(order).toEqual(['save', 'delete export', 'delete deployment', 'delete schedule']);
                    expect(exportServiceSpy.stopPipelineByIdIfExists.calls.mostRecent().args[0]).toBe('old_export');
                    expect(deploymentsServiceSpy.v2deleteDeploymentIfExists.calls.allArgs()).toEqual([['old_deployment']]);
                    expect(processSchedulerServiceSpy.deleteScheduleIfExists.calls.allArgs()).toEqual([['old_schedule']]);
                    expect(snackOpen).not.toHaveBeenCalled();
                }),
            );

            it(
                'does not delete a resource the saved widget still uses',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    storeOldElement('deploymentId', 'scheduleId');

                    component.save();

                    expect(order).toEqual(['save', 'delete export']);
                }),
            );

            it(
                'keeps the saved widget and reports a delete that failed',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    storeOldElement('old_deployment', 'old_schedule');
                    exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 500 }));

                    component.save();

                    expect(dashboardServiceSpy.updateWidgetProperty.calls.count()).toBe(1);
                    expect(matDialogRefSpy.close.calls.count()).toBe(1);
                    expect(snackOpen.calls.mostRecent().args[0]).toContain('old export of old element could not be deleted');
                    expect(snackOpen.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ panelClass: 'snack-bar-error' }));
                }),
            );

            function oldElement(id: string, deploymentId: string, scheduleId: string): any {
                return {
                    id,
                    name: 'old ' + id,
                    exportId: 'old_export_' + id,
                    exportCreatedByWidget: true,
                    elementDetails: { elementType: DataTableElementTypesEnum.DEVICE, device: { deploymentId, scheduleId } },
                };
            }

            function keepOldIdsInForm(): void {
                component.getElements().at(0).controls.elementDetails.controls.device.patchValue({
                    deploymentId: 'old_deployment',
                    scheduleId: 'old_schedule',
                });
            }

            it(
                'clears and deletes the deployment and schedule of an element that no longer refreshes',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 0 });
                    component.widget.properties.dataTable = { elements: [oldElement('old', 'old_deployment', 'old_schedule')] } as any;
                    keepOldIdsInForm();

                    component.save();

                    expect(order).toEqual(['save', 'delete export', 'delete deployment', 'delete schedule']);
                    const device = (dashboardServiceSpy.updateWidgetProperty.calls.mostRecent().args[3] as any).dataTable.elements[0].elementDetails.device;
                    expect(device.deploymentId).toBeFalsy();
                    expect(device.scheduleId).toBeFalsy();
                }),
            );

            it(
                'clears and deletes the deployment and schedule of an element that no longer requests the device',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    component.getElements().at(0).controls.elementDetails.controls.device.patchValue({ requestDevice: false });
                    component.widget.properties.dataTable = { elements: [oldElement('old', 'old_deployment', 'old_schedule')] } as any;
                    keepOldIdsInForm();

                    component.save();

                    expect(deploymentsServiceSpy.v2deleteDeploymentIfExists.calls.allArgs()).toEqual([['old_deployment']]);
                    expect(processSchedulerServiceSpy.deleteScheduleIfExists.calls.allArgs()).toEqual([['old_schedule']]);
                    expect(deploymentsServiceSpy.v2postDeployments.calls.count()).toBe(0);
                }),
            );

            it(
                'keeps the persisted widget as the base of the clean-up while a save attempt fails',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    const persisted = { elements: [oldElement('old', 'old_deployment', 'old_schedule')] } as any;
                    component.widget.properties.dataTable = persisted;
                    let n = 0;
                    deploymentsServiceSpy.v2postDeployments.and.callFake(() => of({ status: 200, id: 'deployment' + ++n }));
                    let m = 0;
                    processSchedulerServiceSpy.createSchedule.and.callFake(() => of({ id: 'schedule' + ++m }) as any);
                    dashboardServiceSpy.updateWidgetProperty.and.callFake(() => {
                        order.push('save');
                        return of({ message: order.filter((o) => o === 'save').length === 1 ? 'error' : 'OK' });
                    });

                    component.save();
                    expect(component.widget.properties.dataTable).toBe(persisted);
                    expect(order).toEqual(['save']);

                    component.save();

                    expect(deploymentsServiceSpy.v2deleteDeploymentIfExists.calls.allArgs()).toEqual([['old_deployment'], ['deployment1']]);
                    expect(processSchedulerServiceSpy.deleteScheduleIfExists.calls.allArgs()).toEqual([['old_schedule'], ['schedule1']]);
                    expect(component.widget.properties.dataTable).not.toBe(persisted);
                }),
            );

            it(
                'deletes the old resources although the name update failed',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    storeOldElement('old_deployment', 'old_schedule');
                    dashboardServiceSpy.updateWidgetName.and.returnValue(of({ message: 'error' }));

                    component.save();

                    expect(order).toEqual(['save', 'delete export', 'delete deployment', 'delete schedule']);
                    expect(matDialogRefSpy.close.calls.count()).toBe(0);
                }),
            );

            it(
                'deletes a resource listed by several elements once',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    component.widget.properties.dataTable = {
                        elements: [oldElement('a', 'shared_deployment', 'shared_schedule'), oldElement('b', 'shared_deployment', 'shared_schedule')],
                    } as any;

                    component.save();

                    expect(deploymentsServiceSpy.v2deleteDeploymentIfExists.calls.allArgs()).toEqual([['shared_deployment']]);
                    expect(processSchedulerServiceSpy.deleteScheduleIfExists.calls.allArgs()).toEqual([['shared_schedule']]);
                }),
            );

            it(
                'takes a 404 for a resource that is already gone',
                fakeAsync(() => {
                    requestElements(1);
                    component.formGroup.patchValue({ refreshTime: 10 });
                    storeOldElement('old_deployment', 'old_schedule');
                    exportServiceSpy.stopPipelineByIdIfExists.and.returnValue(of({ status: 404 }));
                    deploymentsServiceSpy.v2deleteDeploymentIfExists.and.returnValue(of({ status: 404 }));

                    component.save();

                    expect(matDialogRefSpy.close.calls.count()).toBe(1);
                    expect(snackOpen).not.toHaveBeenCalled();
                }),
            );
        });
    });
});
