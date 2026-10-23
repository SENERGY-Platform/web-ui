/*
 * Copyright 2026 InfAI (CC SES)
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

import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { DataTableEditDialogComponent } from './data-table-edit-dialog.component';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { AutomationEngineService } from '../../../core/services/automation-engine.service';
import { EngineDeployment, EngineSchedule } from '../../../core/model/automation-engine.model';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ExportModel } from '../../../modules/exports/shared/export.model';
import { DataTableHelperService } from '../shared/data-table-helper.service';
import { DeviceGroupsService } from '../../../modules/devices/device-groups/shared/device-groups.service';
import { ConceptsService } from '../../../modules/metadata/concepts/shared/concepts.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { CoreModule } from '../../../core/core.module';
import { WidgetModule } from '../../widget.module';
import { DeviceTypeInteractionEnum } from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { ExportValueTypes } from '../shared/data-table.model';
import { GENERATED_RESOURCE_STORAGE } from '../../shared/generated-resource-janitor';
import { MemoryStorage } from '../../shared/memory-storage.mock';

export interface DataTableDialogSpies {
    exportService: Spy<ExportService>;
    engine: Spy<AutomationEngineService>;
    dashboard: Spy<DashboardService>;
    helper: Spy<DataTableHelperService>;
    deviceGroups: Spy<DeviceGroupsService>;
    concepts: Spy<ConceptsService>;
}

/** The service the stored widgets of these specs resolve their device element against: an event service. */
export const EVENT_SERVICE = { id: 'service_1', interaction: DeviceTypeInteractionEnum.Event, outputs: [] };

/** The one device group the specs know, as the dialog offers its criteria. */
export const DEVICE_GROUP_CRITERIA = { interaction: '', function_id: 'f1', aspect_id: 'a1', device_class_id: 'dc1' };

/** Fresh spies and the dialog's test module; call from `beforeEach` so every spec gets its own. */
export function configureDataTableDialogTestBed(rights = { name: true, properties: true }): DataTableDialogSpies {
    const exportService = createSpyFromClass(ExportService);
    const engine = createSpyFromClass<AutomationEngineService>(AutomationEngineService);
    const dashboard = createSpyFromClass<DashboardService>(DashboardService);
    const helper = createSpyFromClass<DataTableHelperService>(DataTableHelperService);
    const deviceGroups = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);
    const concepts = createSpyFromClass<ConceptsService>(ConceptsService);

    exportService.startPipeline.and.returnValue(of({ ID: 'created-export' } as ExportModel));
    exportService.stopPipelineByIdIfExists.and.returnValue(of({ status: 200 }));
    engine.deleteDeploymentIfExists.and.returnValue(of({ status: 200 }));
    engine.deleteScheduleIfExists.and.returnValue(of({ status: 200 }));
    engine.createDeployment.and.returnValue(of({ id: 'deploymentId' } as EngineDeployment));
    engine.createSchedule.and.returnValue(of({ id: 'scheduleId' } as EngineSchedule));
    dashboard.updateWidgetName.and.returnValue(of({ message: 'OK' }));
    dashboard.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));

    helper.initialize.and.returnValue(of(null));
    helper.preloadMeasuringFunctionsOfAspect.and.returnValue(of([{ id: 'functionId' }]));
    helper.preloadDevicesOfFunctionAndAspect.and.returnValue(of([{ id: 'functionId' }]));
    helper.getMeasuringFunctionsOfAspect.and.returnValue([{ id: 'functionId' }]);
    helper.getDevicesOfFunctionAndAspect.and.returnValue([{ device: { id: 'deviceId' }, services: [EVENT_SERVICE] }]);
    helper.getServiceValues.and.returnValue([{ Name: 'Time', Path: 'struct.Time', Type: ExportValueTypes.FLOAT }]);
    helper.getPipelines.and.returnValue([{ id: 'pipelineId', operators: [{ name: 'opName', id: 'operatorId', operatorId: 'operatorId' }] }]);
    helper.preloadOperator.and.returnValue(of({ name: 'opName', outputs: [{ name: 'opValueName', type: 'float' }] }));
    helper.getOperator.and.returnValue({ outputs: [{ name: 'opValueName', type: 'float' }] });
    helper.preloadExportTags.and.returnValue(of(new Map()));
    helper.getExportTags.and.returnValue(of(new Map()));
    helper.getExportsForDeviceAndValue.and.returnValue([]);
    helper.getExportsForPipelineOperatorValue.and.returnValue([{ ID: 'export-1' } as ExportModel]);
    helper.getPreloadedExportById.and.returnValue(undefined);
    helper.preloadFullImportType.and.returnValue(of(undefined));
    helper.getFullImportType.and.returnValue({ name: 'importTypeName' } as never);
    helper.getImportTypeValues.and.returnValue([{ Name: 'v', Path: 'value.v', Type: ExportValueTypes.FLOAT }] as never);
    helper.getImportInstancesOfType.and.returnValue([{ id: 'inst1', kafka_topic: 'topic1' }] as never);
    helper.getExportsOfImportInstance.and.returnValue([]);
    helper.getImportTypes.and.returnValue([]);

    deviceGroups.getDeviceGroups.and.returnValue(
        of({ result: [{ id: 'dg1', name: 'group', criteria: [{ ...DEVICE_GROUP_CRITERIA, interaction: 'request' }] }] } as never),
    );
    deviceGroups.getAspectListByIds.and.returnValue(of([]));
    deviceGroups.getFunctionListByIds.and.returnValue(of([{ id: 'f1', concept_id: 'c1', display_name: 'Temp' }] as never));
    deviceGroups.getDeviceClassListByIds.and.returnValue(of([]));
    concepts.getConceptWithCharacteristics.and.returnValue(
        of({ id: 'c1', characteristics: [{ id: 'ch1', name: 'celsius', display_unit: '°C', type: 'https://schema.org/Float' }] } as never),
    );

    TestBed.configureTestingModule({
        schemas: [NO_ERRORS_SCHEMA],
        imports: [CoreModule, MatSnackBarModule, MatDialogModule, NoopAnimationsModule, WidgetModule, DataTableEditDialogComponent],
        providers: [
            provideRouter([]),
            { provide: DashboardService, useValue: dashboard },
            { provide: AutomationEngineService, useValue: engine },
            { provide: ExportService, useValue: exportService },
            { provide: MatDialogRef, useValue: createSpyFromClass<MatDialogRef<DataTableEditDialogComponent>>(MatDialogRef) },
            { provide: DataTableHelperService, useValue: helper },
            { provide: DeviceGroupsService, useValue: deviceGroups },
            { provide: ConceptsService, useValue: concepts },
            {
                provide: MAT_DIALOG_DATA,
                useValue: {
                    widgetId: 'widgetId-1',
                    dashboardId: 'dashboardId-1',
                    userHasUpdateNameAuthorization: rights.name,
                    userHasUpdatePropertiesAuthorization: rights.properties,
                },
            },
            { provide: GENERATED_RESOURCE_STORAGE, useFactory: () => new MemoryStorage() },
            { provide: AuthorizationService, useValue: { getUserId: () => 'user-1' } },
            provideHttpClient(withInterceptorsFromDi()),
            provideHttpClientTesting(),
        ],
    });
    return { exportService, engine, dashboard, helper, deviceGroups, concepts };
}
