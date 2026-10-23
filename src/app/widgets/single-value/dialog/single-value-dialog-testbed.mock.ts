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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { SingleValueEditDialogComponent } from './single-value-edit-dialog.component';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ExportModel, ExportResponseModel } from '../../../modules/exports/shared/export.model';
import { DeviceTypeService } from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import { DeviceTypeModel } from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceInstanceModel } from '../../../modules/devices/device-instances/shared/device-instances.model';
import { DeviceGroupsService } from '../../../modules/devices/device-groups/shared/device-groups.service';
import { DeviceGroupModel } from '../../../modules/devices/device-groups/shared/device-groups.model';
import { ConceptsService } from '../../../modules/metadata/concepts/shared/concepts.service';
import { ConceptsCharacteristicsModel } from '../../../modules/metadata/concepts/shared/concepts-characteristics.model';

export interface SingleValueDialogSpies {
    dashboard: Spy<DashboardService>;
    exportService: Spy<ExportService>;
    deviceTypes: Spy<DeviceTypeService>;
    devices: Spy<DeviceInstancesService>;
    deviceGroups: Spy<DeviceGroupsService>;
    concepts: Spy<ConceptsService>;
    dialogRef: Spy<MatDialogRef<SingleValueEditDialogComponent>>;
}

/** The exports the dialog offers: two, each with two values. */
export const EXPORTS = [
    {
        ID: 'export-1',
        Name: 'Power meter',
        ExportDatabaseID: 'db-1',
        Values: [
            { InstanceID: 'inst-1', Name: 'power', Path: 'value.power', Type: 'float' },
            { InstanceID: 'inst-1', Name: 'state', Path: 'value.state', Type: 'string' },
        ],
    },
    {
        ID: 'export-2',
        Name: 'Heat pump',
        ExportDatabaseID: 'db-2',
        Values: [{ InstanceID: 'inst-2', Name: 'flow', Path: 'value.flow', Type: 'float' }],
    },
] as ExportModel[];

/** Two devices of one device type; the type has two services with one output each and one with two. */
export const DEVICES = [
    { id: 'device-1', display_name: 'Boiler', device_type_id: 'dt-1' },
    { id: 'device-2', display_name: 'Chiller', device_type_id: 'dt-1' },
] as DeviceInstanceModel[];

const output = (name: string) => ({ content_variable: { id: 'cv-' + name, name, type: 'https://schema.org/Float' } });
export const DEVICE_TYPE = {
    id: 'dt-1',
    services: [
        { id: 'service-1', name: 'Get power', outputs: [output('power')] },
        { id: 'service-2', name: 'Get status', outputs: [output('status')] },
        { id: 'service-3', name: 'Get both', outputs: [output('a'), output('b')] },
    ],
} as unknown as DeviceTypeModel;

export const DEVICE_GROUP = {
    id: 'group-1',
    name: 'All pumps',
    device_ids: [],
    criteria: [{ interaction: '', function_id: 'function-1', aspect_id: 'aspect-1', device_class_id: 'class-1' }],
} as unknown as DeviceGroupModel;

export const CONCEPT = {
    id: 'concept-1',
    name: 'Power',
    characteristics: [
        { id: 'char-w', name: 'Watt', display_unit: 'W' },
        { id: 'char-kw', name: 'Kilowatt', display_unit: 'kW' },
    ],
} as unknown as ConceptsCharacteristicsModel;

/** Fresh spies and the dialog's test module; call from `beforeEach` so every spec gets its own. */
export function configureSingleValueDialogTestBed(rights = { name: true, properties: true }): SingleValueDialogSpies {
    const dashboard = createSpyFromClass<DashboardService>(DashboardService);
    const exportService = createSpyFromClass<ExportService>(ExportService);
    const deviceTypes = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    const devices = createSpyFromClass<DeviceInstancesService>(DeviceInstancesService);
    const deviceGroups = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);
    const concepts = createSpyFromClass<ConceptsService>(ConceptsService);
    const dialogRef = createSpyFromClass<MatDialogRef<SingleValueEditDialogComponent>>(MatDialogRef);

    dashboard.updateWidgetName.and.returnValue(of({ message: 'OK' }));
    dashboard.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));
    exportService.getExports.and.returnValue(of({ instances: EXPORTS } as ExportResponseModel));
    devices.getDeviceInstances.and.returnValue(of({ result: DEVICES, total: DEVICES.length }));
    deviceTypes.getDeviceType.and.returnValue(of(DEVICE_TYPE));
    deviceTypes.getValuePaths.and.callFake((variable) => ['value.' + variable.name, 'value.' + variable.name + '.unit']);
    deviceGroups.getDeviceGroups.and.returnValue(of({ result: [DEVICE_GROUP], total: 1 }));
    deviceGroups.getAspectListByIds.and.returnValue(of([{ id: 'aspect-1', name: 'Air' }]));
    deviceGroups.getFunctionListByIds.and.returnValue(of([{ id: 'function-1', display_name: 'Get power', concept_id: 'concept-1' }] as never));
    deviceGroups.getDeviceClassListByIds.and.returnValue(of([{ id: 'class-1', name: 'Pump' }] as never));
    concepts.getConceptWithCharacteristics.and.returnValue(of(CONCEPT));

    TestBed.configureTestingModule({
        schemas: [NO_ERRORS_SCHEMA],
        imports: [MatDialogModule, NoopAnimationsModule, SingleValueEditDialogComponent],
        providers: [
            { provide: DashboardService, useValue: dashboard },
            { provide: ExportService, useValue: exportService },
            { provide: DeviceTypeService, useValue: deviceTypes },
            { provide: DeviceInstancesService, useValue: devices },
            { provide: DeviceGroupsService, useValue: deviceGroups },
            { provide: ConceptsService, useValue: concepts },
            { provide: DeploymentsService, useValue: createSpyFromClass(DeploymentsService) },
            { provide: MatDialogRef, useValue: dialogRef },
            {
                provide: MAT_DIALOG_DATA,
                useValue: {
                    widgetId: 'widgetId-1',
                    dashboardId: 'dashboardId-1',
                    userHasUpdateNameAuthorization: rights.name,
                    userHasUpdatePropertiesAuthorization: rights.properties,
                },
            },
        ],
    });
    return { dashboard, exportService, deviceTypes, devices, deviceGroups, concepts, dialogRef };
}
