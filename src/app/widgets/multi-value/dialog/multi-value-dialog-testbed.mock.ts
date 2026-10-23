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
import { MultiValueEditDialogComponent } from './multi-value-edit-dialog.component';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ExportModel, ExportResponseModel } from '../../../modules/exports/shared/export.model';

export interface MultiValueDialogSpies {
    dashboard: Spy<DashboardService>;
    exportService: Spy<ExportService>;
    dialogRef: Spy<MatDialogRef<MultiValueEditDialogComponent>>;
}

/** The exports the dialog offers: two, each with two values. */
export const EXPORTS: ExportModel[] = [
    {
        ID: 'export-1',
        Name: 'Power meter',
        Values: [
            { InstanceID: 'inst-1', Name: 'power', Path: 'value.power', Type: 'float' },
            { InstanceID: 'inst-1', Name: 'state', Path: 'value.state', Type: 'string' },
        ],
    },
    {
        ID: 'export-2',
        Name: 'Heat pump',
        Values: [
            { InstanceID: 'inst-2', Name: 'flow', Path: 'value.flow', Type: 'float' },
            { InstanceID: 'inst-2', Name: 'running', Path: 'value.running', Type: 'bool' },
        ],
    },
] as ExportModel[];

/** Fresh spies and the dialog's test module; call from `beforeEach` so every spec gets its own. */
export function configureMultiValueDialogTestBed(rights = { name: true, properties: true }): MultiValueDialogSpies {
    const dashboard = createSpyFromClass<DashboardService>(DashboardService);
    const exportService = createSpyFromClass<ExportService>(ExportService);
    const dialogRef = createSpyFromClass<MatDialogRef<MultiValueEditDialogComponent>>(MatDialogRef);

    dashboard.updateWidgetName.and.returnValue(of({ message: 'OK' }));
    dashboard.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));
    exportService.getExports.and.returnValue(of({ instances: EXPORTS } as ExportResponseModel));

    TestBed.configureTestingModule({
        schemas: [NO_ERRORS_SCHEMA],
        imports: [MatDialogModule, NoopAnimationsModule, MultiValueEditDialogComponent],
        providers: [
            { provide: DashboardService, useValue: dashboard },
            { provide: ExportService, useValue: exportService },
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
    return { dashboard, exportService, dialogRef };
}
