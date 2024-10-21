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

import { TestBed, waitForAsync } from '@angular/core/testing';
import { CoreModule } from '../../../core/core.module';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { of } from 'rxjs';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import {
    DeviceTypeAspectNodeModel,
    DeviceTypeInteractionEnum
} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ExportModel } from '../../../modules/exports/shared/export.model';
import { util } from 'jointjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { environment } from '../../../../environments/environment';
import { DataTableEditDialogComponent } from './data-table-edit-dialog.component';
import {
    V2DeploymentsPreparedDiagramModel,
    V2DeploymentsPreparedModel,
} from '../../../modules/processes/deployments/shared/deployments-prepared-v2.model';
import { DataTableHelperService } from '../shared/data-table-helper.service';
import { WidgetModule } from '../../widget.module';
import { DataTableElementTypesEnum, DataTableOrderEnum, ExportValueTypes } from '../shared/data-table.model';
import { ProcessSchedulerService } from '../../process-scheduler/shared/process-scheduler.service';
import uuid = util.uuid;
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { SingleValueAggregations } from '../../single-value/shared/single-value.model';

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
        waitForAsync(() => {
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
                imports: [
                    CoreModule,
                    RouterTestingModule,
                    HttpClientTestingModule,
                    MatSnackBarModule,
                    MatDialogModule,
                    MatIconModule,
                    MatExpansionModule,
                    MatInputModule,
                    ReactiveFormsModule,
                    WidgetModule,
                ],
                declarations: [DataTableEditDialogComponent],
                providers: [
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
                ],
            }).compileComponents();
        }),
    );

    it(
        'should create the app',
        waitForAsync(() => {
            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            expect(component).toBeTruthy();
        }),
    );

    it(
        'check the first dialog init',
        waitForAsync(() => {
            dataTableHelperServiceSpy.getAspectsWithMeasuringFunction.and.returnValue(new Map());
            dataTableHelperServiceSpy.getMeasuringFunctionsOfAspect.and.returnValue([]);
            dataTableHelperServiceSpy.getDevicesOfFunctionAndAspect.and.returnValue([]);
            dataTableHelperServiceSpy.getServiceValues.and.returnValue([]);

            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

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
        waitForAsync(() => {
            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            const element = component.getElements().at(0);
            element?.patchValue({ name: 'name', id: 'known-test-id' });
            component.formGroup.patchValue({ valueAlias: 'alias', order: DataTableOrderEnum.TimeAsc, refreshTime: 10 });
            const elementDetails = element?.get('elementDetails');
            elementDetails?.get('device')?.patchValue({ aspectId: 'aspectId' });
            expect(elementDetails?.get('device')?.get('aspectId')?.value).toBe('aspectId');
            component.runChangeDetection();
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
        waitForAsync(() => {
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

            const element = component.getElements().at(0);
            expect(element?.get('warning')?.enabled).toBe(true);
        }),
    );

    it(
        'should not always create deployments and schedules',
        waitForAsync(() => {
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

            expect(component.getElements().at(0).get('elementDetails')?.get('device')?.get('requestDevice')?.value).toBe(false);
            component.save();
            expect(deploymentsServiceSpy.v2getPreparedDeploymentsByXml.calls.count()).toBe(0);
            expect(deploymentsServiceSpy.v2postDeployments.calls.count()).toBe(0);
            expect(processSchedulerServiceSpy.createSchedule.calls.count()).toBe(0);
        }),
    );

    it(
        'should not always create exports',
        waitForAsync(() => {
            const fixture = TestBed.createComponent(DataTableEditDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

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
            expect(id0.length).toBeGreaterThan(0);
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

            elementDetails?.patchValue({ elementType: DataTableElementTypesEnum.PIPELINE });
            elementDetails?.get('pipeline')?.patchValue({ pipelineId: 'pipelineId' });
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
});
