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

import { ApplicationRef } from '@angular/core';
import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { DataTableEditDialogComponent } from './data-table-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DataTableOrderEnum } from '../shared/data-table.model';
import { configureDataTableDialogTestBed, DataTableDialogSpies } from './data-table-dialog-testbed.mock';

describe('DataTableEditDialogComponent initial focus', () => {
    let spies: DataTableDialogSpies;
    let ref: MatDialogRef<DataTableEditDialogComponent>;

    const widget = {
        id: 'widgetId-1',
        name: 'Stored table',
        type: 'data_table',
        properties: { dataTable: { order: DataTableOrderEnum.Default, valueAlias: '', refreshTime: 30, valuesPerElement: 1, elements: [], convertRules: [] } },
    } as unknown as WidgetModel;

    beforeEach(() => {
        spies = configureDataTableDialogTestBed();
    });

    afterEach(() => ref?.close());

    function openDialog(): void {
        ref = TestBed.inject(MatDialog).open(DataTableEditDialogComponent, {
            data: { widgetId: 'widgetId-1', dashboardId: 'dashboardId-1', userHasUpdateNameAuthorization: true, userHasUpdatePropertiesAuthorization: true },
        });
    }

    function settle(): void {
        flush();
        TestBed.inject(ApplicationRef).tick();
        flush();
        TestBed.inject(ApplicationRef).tick();
    }

    const focused = () => document.activeElement as HTMLElement | null;

    it('focuses the widget name when the widget is there as the dialog opens', fakeAsync(() => {
        spies.dashboard.getWidget.and.returnValue(of(widget));

        openDialog();
        settle();

        expect(focused()?.getAttribute('formcontrolname')).toBe('name');
    }));

    it('focuses the widget name when the widget arrives after the dialog opened', fakeAsync(() => {
        const response = new Subject<WidgetModel>();
        spies.dashboard.getWidget.and.returnValue(response);

        openDialog();
        settle();
        response.next(widget);
        settle();

        expect(focused()?.getAttribute('formcontrolname')).toBe('name');
    }));
});
