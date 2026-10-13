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

import { UntypedFormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
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
        dashboardService.updateWidgetProperty.and.returnValue(of({} as never));
        const component = new SingleValueEditDialogComponent(
            createSpyFromClass(MatDialogRef<SingleValueEditDialogComponent>),
            createSpyFromClass(DeploymentsService),
            dashboardService,
            createSpyFromClass(ExportService),
            new UntypedFormBuilder(),
            createSpyFromClass(DeviceTypeService),
            createSpyFromClass(DeviceInstancesService),
            createSpyFromClass(DeviceGroupsService),
            createSpyFromClass(ConceptsService),
            { dashboardId: 'd', widgetId: 'w', userHasUpdateNameAuthorization: true, userHasUpdatePropertiesAuthorization: true },
        );
        component.initForm();
        component.widget = { id: 'w', properties: {} } as unknown as WidgetModel;
        const measurement: ChartsExportMeasurementModel = { id: 'e1', name: 'Export', values: [], exportDatabaseId: 'db1' };
        component.form.patchValue({ measurement });

        component.updateProperties();

        expect(component.widget.properties.measurement?.exportDatabaseId).toBe('db1');
    });
});
