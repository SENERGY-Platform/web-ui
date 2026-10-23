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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SingleValueEditDialogComponent } from './single-value-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { configureSingleValueDialogTestBed, EXPORTS, SingleValueDialogSpies } from './single-value-dialog-testbed.mock';

describe('SingleValueEditDialogComponent columns', () => {
    let fixture: ComponentFixture<SingleValueEditDialogComponent>;
    let spies: SingleValueDialogSpies;

    const exportWidget = {
        id: 'widgetId-1',
        name: 'Stored value',
        type: 'single_value',
        properties: {
            sourceType: 'export',
            measurement: { id: 'export-1', name: 'Power meter', values: EXPORTS[0].Values },
            vAxis: EXPORTS[0].Values[0],
            type: 'Number',
        },
    } as unknown as WidgetModel;

    function open(rights = { name: true, properties: true }): void {
        spies = configureSingleValueDialogTestBed(rights);
        spies.dashboard.getWidget.and.returnValue(of(structuredClone(exportWidget)));
        fixture = TestBed.createComponent(SingleValueEditDialogComponent);
        fixture.detectChanges();
        TestBed.inject(ApplicationRef).tick();
    }

    const root = () => fixture.nativeElement as HTMLElement;
    const columns = () => Array.from(root().querySelectorAll('.columns > .column'));
    const titles = (column: Element) => Array.from(column.querySelectorAll('senergy-form-section .section-title')).map((t) => t.textContent?.trim());

    it('puts general and data source on the left, display and timestamp on the right', () => {
        open();

        expect(columns().length).toBe(2);
        expect(titles(columns()[0])).toEqual(['General', 'Data source']);
        expect(titles(columns()[1])).toEqual(['Display', 'Timestamp and highlighting']);
    });

    it('lays short fields out in rows of two', () => {
        open();

        const rows = Array.from(columns()[1].querySelectorAll('.one-line-form-container')).map((row) => Array.from(row.querySelectorAll('mat-label')).map((l) => l.textContent?.trim()));
        expect(rows).toEqual([['Type', 'Format'], ['Group Type', 'Group Time'], ['Math', 'Max. Font Size (px)']]);
    });

    it('shows one column with the name only when the user may not update properties', () => {
        open({ name: true, properties: false });

        expect(root().querySelector('.columns')?.classList).toContain('single-column');
        expect(columns().length).toBe(1);
        expect(titles(columns()[0])).toEqual(['General']);
    });
});
