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

import { Component } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { DashboardManipulationEnum } from './dashboard-manipulation.enum';
import { WidgetModel } from './dashboard-widget.model';
import { DashboardService } from './dashboard.service';
import { openWidgetEditDialog } from './open-widget-edit-dialog';

@Component({ selector: 'senergy-test-edit', template: '' })
class TestEditComponent {}

describe('openWidgetEditDialog', () => {
    let dialog: jasmine.SpyObj<MatDialog>;
    let dashboardService: jasmine.SpyObj<DashboardService>;
    let closed: Subject<WidgetModel | undefined>;
    const data = { widgetId: 'w1', dashboardId: 'd1', userHasUpdateNameAuthorization: true };

    function openedConfig(): MatDialogConfig {
        return dialog.open.calls.mostRecent().args[1] as MatDialogConfig;
    }

    beforeEach(() => {
        closed = new Subject();
        dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
        dialog.open.and.returnValue({ afterClosed: () => closed.asObservable() } as never);
        dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', ['manipulateWidget']);
    });

    it('opens the component with the same config as a plain new MatDialogConfig plus disableClose and data', () => {
        openWidgetEditDialog(dialog, dashboardService, TestEditComponent, data);

        expect(dialog.open.calls.mostRecent().args[0]).toBe(TestEditComponent);
        const expected = new MatDialogConfig();
        expected.disableClose = false;
        expected.data = data;
        expect(openedConfig()).toEqual(expected);
        expect(openedConfig().data).toBe(data);
        expect(openedConfig().disableClose).toBe(false);
        expect(openedConfig().autoFocus).toBe(new MatDialogConfig().autoFocus);
        expect(openedConfig().minWidth).toBeUndefined();
        expect(openedConfig().minHeight).toBeUndefined();
        expect(openedConfig().width).toBe(new MatDialogConfig().width);
    });

    it('sets only the size fields that are given', () => {
        openWidgetEditDialog(dialog, dashboardService, TestEditComponent, data, { minWidth: '450px' });
        expect(openedConfig().minWidth).toBe('450px');
        expect(openedConfig().minHeight).toBeUndefined();
        expect(openedConfig().width).toBe(new MatDialogConfig().width);

        openWidgetEditDialog(dialog, dashboardService, TestEditComponent, data, { minHeight: '235px' });
        expect(openedConfig().minWidth).toBeUndefined();
        expect(openedConfig().minHeight).toBe('235px');

        openWidgetEditDialog(dialog, dashboardService, TestEditComponent, data, { width: '75vw', minWidth: '600px', minHeight: '10px' });
        expect(openedConfig().width).toBe('75vw');
        expect(openedConfig().minWidth).toBe('600px');
        expect(openedConfig().minHeight).toBe('10px');
    });

    it('updates the widget the dialog closes with', () => {
        openWidgetEditDialog(dialog, dashboardService, TestEditComponent, data);
        const widget = { id: 'w1', name: 'edited' } as WidgetModel;

        closed.next(widget);

        expect(dashboardService.manipulateWidget).toHaveBeenCalledOnceWith(DashboardManipulationEnum.Update, 'w1', widget);
    });

    it('does not update anything when the dialog closes without a widget', () => {
        openWidgetEditDialog(dialog, dashboardService, TestEditComponent, data);

        closed.next(undefined);

        expect(dashboardService.manipulateWidget).not.toHaveBeenCalled();
    });
});
