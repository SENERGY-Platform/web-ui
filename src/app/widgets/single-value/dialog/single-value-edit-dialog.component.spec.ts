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

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { createSpyFromClass } from 'jasmine-auto-spies';
import { SingleValueEditDialogComponent } from './single-value-edit-dialog.component';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DeviceTypeService } from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceGroupsService } from '../../../modules/devices/device-groups/shared/device-groups.service';
import { ConceptsService } from '../../../modules/metadata/concepts/shared/concepts.service';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportMeasurementModel } from '../../charts/export/shared/charts-export-properties.model';

describe('SingleValueEditDialogComponent', () => {
    it('saves the export database of the selected export', () => {
        const dashboardService = createSpyFromClass(DashboardService);
        dashboardService.updateWidgetProperty.and.returnValue(of({} as any));
        TestBed.configureTestingModule({
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { dashboardId: 'd', widgetId: 'w', userHasUpdateNameAuthorization: true, userHasUpdatePropertiesAuthorization: true } },
                { provide: MatDialogRef, useValue: createSpyFromClass(MatDialogRef) },
                { provide: DashboardService, useValue: dashboardService },
                { provide: DeploymentsService, useValue: createSpyFromClass(DeploymentsService) },
                { provide: ExportService, useValue: createSpyFromClass(ExportService) },
                { provide: DeviceTypeService, useValue: createSpyFromClass(DeviceTypeService) },
                { provide: DeviceInstancesService, useValue: createSpyFromClass(DeviceInstancesService) },
                { provide: DeviceGroupsService, useValue: createSpyFromClass(DeviceGroupsService) },
                { provide: ConceptsService, useValue: createSpyFromClass(ConceptsService) },
            ],
        });
        const component = TestBed.runInInjectionContext(() => new SingleValueEditDialogComponent());
        component.initForm();
        component.widget = { id: 'w', properties: {} } as unknown as WidgetModel;
        const measurement: ChartsExportMeasurementModel = { id: 'e1', name: 'Export', values: [], exportDatabaseId: 'db1' };
        component.form.patchValue({ measurement });

        component.updateProperties();

        expect(component.widget.properties.measurement?.exportDatabaseId).toBe('db1');
    });
});
