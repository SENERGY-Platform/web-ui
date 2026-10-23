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
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { AirQualityEditDialogComponent } from './air-quality-edit-dialog.component';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ExportModel, ExportResponseModel } from '../../../modules/exports/shared/export.model';
import { ImportInstancesService } from '../../../modules/imports/import-instances/shared/import-instances.service';
import { ImportInstancesModel } from '../../../modules/imports/import-instances/shared/import-instances.model';
import { ImportTypesService } from '../../../modules/imports/import-types/shared/import-types.service';
import { ImportTypeModel } from '../../../modules/imports/import-types/shared/import-types.model';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { GENERATED_RESOURCE_STORAGE } from '../../shared/generated-resource-janitor';
import { MemoryStorage } from '../../shared/memory-storage.mock';
import { UBAService } from '../shared/uba.service';
import { GeonamesService } from '../shared/geonames.service';

export interface AirQualityDialogSpies {
    dashboard: Spy<DashboardService>;
    exportService: Spy<ExportService>;
    importInstances: Spy<ImportInstancesService>;
    importTypes: Spy<ImportTypesService>;
    dialogRef: Spy<MatDialogRef<AirQualityEditDialogComponent>>;
}

/** The exports the dialog offers: one with two values. */
export const EXPORTS: ExportModel[] = [
    {
        ID: 'export-1',
        Name: 'Room sensor',
        Values: [
            { InstanceID: 'inst-1', Name: 'co2', Path: 'value.co2', Type: 'float' },
            { InstanceID: 'inst-1', Name: 'pm10', Path: 'value.pm10', Type: 'float' },
        ],
    },
] as ExportModel[];

/**
 * Fresh spies and the dialog's test module; call from `beforeEach` so every spec gets its own. Saving creates an
 * import instance and an export per provider, named after the import type so a spec can tell them apart.
 */
export function configureAirQualityDialogTestBed(rights = { name: true, properties: true }): AirQualityDialogSpies {
    const dashboard = createSpyFromClass<DashboardService>(DashboardService);
    const exportService = createSpyFromClass<ExportService>(ExportService);
    const importInstances = createSpyFromClass<ImportInstancesService>(ImportInstancesService);
    const importTypes = createSpyFromClass<ImportTypesService>(ImportTypesService);
    const dialogRef = createSpyFromClass<MatDialogRef<AirQualityEditDialogComponent>>(MatDialogRef);
    const devices = createSpyFromClass<DeviceInstancesService>(DeviceInstancesService);
    const uba = createSpyFromClass<UBAService>(UBAService);

    dashboard.updateWidgetName.and.returnValue(of({ message: 'OK' }));
    dashboard.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));
    exportService.getExports.and.returnValue(of({ instances: EXPORTS } as ExportResponseModel));
    exportService.stopPipelineByIdIfExists.and.returnValue(of({ status: 200 }));
    exportService.startPipeline.and.callFake((exp: ExportModel) =>
        of({ ID: 'export-of-' + exp.Filter, ExportDatabaseID: 'database', Values: exp.Values } as unknown as ExportModel));
    importInstances.listImportInstances.and.returnValue(of([]));
    importInstances.saveImportInstance.and.callFake((instance: ImportInstancesModel) =>
        of({ ...instance, id: 'instance-' + instance.import_type_id, kafka_topic: 'topic-' + instance.import_type_id } as ImportInstancesModel));
    importTypes.getImportType.and.callFake((id: string) => of({ id, name: 'type ' + id } as ImportTypeModel));
    importTypes.parseImportTypeExportValues.and.returnValue([]);
    devices.getDeviceInstances.and.returnValue(of({ result: [], total: 0 } as never));
    uba.getUBAStations.and.returnValue(of([]));
    uba.getUBAStationCapabilities.and.returnValue(of([]));

    TestBed.configureTestingModule({
        schemas: [NO_ERRORS_SCHEMA],
        imports: [MatDialogModule, NoopAnimationsModule, AirQualityEditDialogComponent],
        providers: [
            { provide: GENERATED_RESOURCE_STORAGE, useFactory: () => new MemoryStorage() },
            { provide: AuthorizationService, useValue: { getUserId: () => 'user-1' } },
            { provide: DashboardService, useValue: dashboard },
            { provide: ExportService, useValue: exportService },
            { provide: ImportInstancesService, useValue: importInstances },
            { provide: ImportTypesService, useValue: importTypes },
            { provide: DeviceInstancesService, useValue: devices },
            { provide: DeviceTypeService, useValue: createSpyFromClass(DeviceTypeService) },
            { provide: UBAService, useValue: uba },
            { provide: GeonamesService, useValue: createSpyFromClass(GeonamesService) },
            { provide: DeploymentsService, useValue: createSpyFromClass(DeploymentsService) },
            { provide: MatSnackBar, useValue: createSpyFromClass(MatSnackBar) },
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
    return { dashboard, exportService, importInstances, importTypes, dialogRef };
}
