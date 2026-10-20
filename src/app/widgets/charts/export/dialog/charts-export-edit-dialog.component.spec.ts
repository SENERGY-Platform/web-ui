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
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../../modules/dashboard/shared/dashboard-widget.model';
import { ExportService } from '../../../../modules/exports/shared/export.service';
import { ChartsExportVAxesModel } from '../shared/charts-export-properties.model';
import { ChartsExportEditDialogComponent } from './charts-export-edit-dialog.component';

function axis(valueName: string, extra: Partial<ChartsExportVAxesModel> = {}): ChartsExportVAxesModel {
    return { instanceId: 'export-1', exportName: 'e', valueName, valueType: 'float', math: '', color: '', ...extra };
}

describe('ChartsExportEditDialogComponent', () => {
    let component: ChartsExportEditDialogComponent;
    let dashboardService: jasmine.SpyObj<DashboardService>;

    function open(vAxes: ChartsExportVAxesModel[], chartType = 'LineChart'): void {
        const widget = { id: 'w', name: 'w', type: 'charts_export', properties: { chartType, vAxes, exports: [{ id: 'export-1', name: 'e', values: [] }] } } as unknown as WidgetModel;
        dashboardService.getWidget.and.returnValue(of(widget));
        component = TestBed.runInInjectionContext(() => new ChartsExportEditDialogComponent());
        component.ngOnInit();
    }

    beforeEach(() => {
        dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', ['getWidget', 'updateWidgetProperty', 'updateWidgetName']);
        dashboardService.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));
        TestBed.configureTestingModule({
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { dashboardId: 'd', widgetId: 'w', userHasUpdateNameAuthorization: false, userHasUpdatePropertiesAuthorization: true } },
                { provide: MatDialogRef, useValue: { close: () => undefined } },
                { provide: MatDialog, useValue: {} },
                { provide: DashboardService, useValue: dashboardService },
                { provide: ExportService, useValue: { getExportTags: () => of(new Map()) } },
            ],
        });
    });

    describe('syncing the axes with the selected values', () => {
        it('removes only the axis that is gone, not the axes and copies after it', () => {
            const a = axis('a');
            const b = axis('b');
            const aCopy = axis('a', { isDuplicate: true });
            open([a, b, aCopy]);

            component.formGroupController.controls.properties.controls.vAxes.patchValue([a]);

            expect(component.dataSource.data.map(x => x.valueName + (x.isDuplicate ? '*' : ''))).toEqual(['a', 'a*']);
        });
    });
});
