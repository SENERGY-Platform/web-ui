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

    describe('grouping per axis', () => {
        it('keeps the own grouping of an axis when the properties are saved', () => {
            open([axis('a'), axis('a', { isDuplicate: true, ownGroup: { type: 'median', time: '1h' } }), axis('b', { ownGroup: { type: '', time: '' } })]);

            component.updateProperties().subscribe();

            const properties = dashboardService.updateWidgetProperty.calls.mostRecent().args[3] as { vAxes: ChartsExportVAxesModel[] };
            expect(properties.vAxes.map(x => x.ownGroup)).toEqual([undefined, { type: 'median', time: '1h' }, { type: '', time: '' }]);
        });

        it('clears Math on the switch to a difference widget group only on axes that follow it', () => {
            open([axis('a', { math: '*2' }), axis('b', { math: '*2', ownGroup: { type: 'median', time: '1h' } }), axis('c', { math: '*2', ownGroup: { type: '', time: '' } })]);

            component.formGroupController.get('properties.group.type')?.setValue('difference-last');

            expect(component.dataSource.data.map(x => x.math)).toEqual(['', '*2', '*2']);
        });

        it('clears the Math of an own difference group when the chart type is a line chart again', () => {
            open([axis('a', { math: '*2', ownGroup: { type: 'difference-last', time: '1d' } }), axis('b', { math: '*2' })], 'ColumnChart');

            component.chartType.setValue('LineChart');

            expect(component.dataSource.data.map(x => x.math)).toEqual(['', '*2']);
        });

        it('offers the field on line charts only', () => {
            open([axis('a')]);
            expect(component.axisGroupAllowed).toBeTrue();
            component.chartType.setValue('ColumnChart');
            expect(component.axisGroupAllowed).toBeFalse();
        });

        it('holds back a type without a valid time, but only while the field applies', () => {
            open([axis('a', { ownGroup: { type: 'median', time: '' } })]);
            expect(component.axisGroupsValid).toBeFalse();
            component.dataSource.data[0].ownGroup = { type: 'median', time: '1months' };
            expect(component.axisGroupsValid).toBeTrue();
            component.dataSource.data[0].ownGroup = { type: 'median', time: '1x' };
            component.chartType.setValue('ColumnChart');
            expect(component.axisGroupsValid).toBeTrue();
        });

        it('offers the time weighted types for non-Influx exports only', () => {
            open([axis('a')]);
            const types = (a: ChartsExportVAxesModel) => component.axisGroupTypes(a).map(o => o.value);
            expect(types(axis('a', { instanceId: 'export-1' }))).not.toContain('time-weighted-mean-linear');
            expect(types(axis('a', { instanceId: undefined, deviceId: 'dev' }))).toContain('time-weighted-mean-linear');
        });
    });
});
