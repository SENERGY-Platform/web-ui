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
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { MultiValueEditDialogComponent } from './multi-value-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { MultiValueMeasurement, MultiValueOrderEnum } from '../shared/multi-value.model';
import { configureMultiValueDialogTestBed, EXPORTS, MultiValueDialogSpies } from './multi-value-dialog-testbed.mock';

describe('MultiValueEditDialogComponent list and detail', () => {
    let fixture: ComponentFixture<MultiValueEditDialogComponent>;
    let component: MultiValueEditDialogComponent;
    let spies: MultiValueDialogSpies;

    const power = { id: 'export-1', name: 'Power meter', values: EXPORTS[0].Values };

    const numeric: MultiValueMeasurement = {
        name: 'Power',
        type: 'Number',
        format: '',
        export: power,
        column: power.values[0],
        unit: 'W',
        math: '',
        lowerBoundary: Number.MIN_VALUE,
        upperBoundary: Number.MAX_VALUE,
        warning_enabled: false,
    };
    const text: MultiValueMeasurement = { ...numeric, name: 'State', type: 'String', column: power.values[1], unit: '' };
    /** No alias and no value, so it is incomplete. */
    const unfinished: MultiValueMeasurement = { ...numeric, name: '', column: {} as never };

    function stored(measurements: MultiValueMeasurement[]): WidgetModel {
        return {
            id: 'widgetId-1',
            name: 'Stored values',
            type: 'multi_value',
            properties: { multivaluemeasurements: structuredClone(measurements), order: MultiValueOrderEnum.Default, valueAlias: 'Reading' },
        } as unknown as WidgetModel;
    }

    beforeEach(() => {
        spies = configureMultiValueDialogTestBed();
    });

    function open(measurements: MultiValueMeasurement[] = [numeric, text, unfinished]): void {
        spies.dashboard.getWidget.and.returnValue(of(stored(measurements)));
        fixture = TestBed.createComponent(MultiValueEditDialogComponent);
        component = fixture.componentInstance;
        settle();
    }

    function settle(): void {
        fixture.detectChanges();
        flush();
        fixture.detectChanges();
        TestBed.inject(ApplicationRef).tick();
    }

    const root = () => fixture.nativeElement as HTMLElement;
    const rows = () => Array.from(root().querySelectorAll<HTMLElement>('.entry-row'));
    const labels = () => rows().map((row) => row.querySelector('.entry-label')?.textContent?.trim());
    /** What the user sees: forms of entries that are not selected stay in the DOM, hidden. */
    const visible = (selector: string) => Array.from(root().querySelectorAll<HTMLInputElement>(selector)).filter((e) => e.closest('.ly-hidden') === null);
    const titles = () => visible('senergy-form-section .section-title').map((t) => t.textContent?.trim());
    const click = (element: Element | null | undefined) => {
        (element as HTMLElement).click();
        settle();
    };
    const menuItems = () => Array.from(document.querySelectorAll('[role="menuitem"]'));
    const key = (element: Element, name: string) => {
        element.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
        settle();
    };

    it('starts with the settings selected and shows the settings section', fakeAsync(() => {
        open();

        expect(rows()[0].classList).toContain('selected');
        expect(rows()[0].getAttribute('aria-selected')).toBe('true');
        expect(rows().slice(1).every((row) => row.getAttribute('aria-selected') === 'false')).toBeTrue();
        expect(titles()).toEqual(['Settings']);
        expect(visible('input[formcontrolname]').map((i) => i.getAttribute('formcontrolname'))).toEqual(['name', 'valueAlias']);
    }));

    it('asks the dialog to focus the widget name first, not a list row', fakeAsync(() => {
        open();

        const focusInitial = Array.from(root().querySelectorAll('[cdkfocusinitial]'));
        expect(focusInitial.length).toBe(1);
        expect(focusInitial[0].getAttribute('formcontrolname')).toBe('name');
    }));

    it('lists the settings first, then one row per measurement with its alias and export', fakeAsync(() => {
        open();

        expect(labels()).toEqual(['Settings', 'Power', 'State', 'Measurement 3']);
        expect(rows().map((row) => row.querySelector('.entry-sub')?.textContent?.trim())).toEqual(['Stored values', 'Power meter', 'Power meter', 'Power meter']);
    }));

    it('shows the fields of the selected entry only', fakeAsync(() => {
        open();

        click(rows()[1]);
        expect(component.step).toBe(0);
        expect(titles()).toEqual(['Measurement', 'Source', 'Display', 'Warnings']);
        const aliases = visible('input[formcontrolname="name"]');
        expect(aliases.length).toBe(1);
        expect(aliases[0].value).toBe('Power');

        click(rows()[2]);
        expect(component.step).toBe(1);
        expect(visible('input[formcontrolname="name"]').map((i) => i.value)).toEqual(['State']);

        click(rows()[0]);
        expect(titles()).toEqual(['Settings']);
    }));

    it('keeps the form of a measurement once shown while another entry is selected', fakeAsync(() => {
        open();

        expect(root().querySelectorAll('input[formcontrolname="name"]').length).toBe(1);
        click(rows()[1]);
        click(rows()[0]);

        expect(root().querySelectorAll('input[formcontrolname="name"]').length).toBe(2);
        expect(visible('input[formcontrolname="name"]').length).toBe(1);
    }));

    it('selects a row with Enter and Space, but not when the key goes to its menu button', fakeAsync(() => {
        open();

        key(rows()[2], 'Enter');
        expect(component.step).toBe(1);
        expect(rows()[2].getAttribute('aria-selected')).toBe('true');

        key(rows()[1], ' ');
        expect(component.step).toBe(0);

        key(rows()[3].querySelector('button.entry-menu') as HTMLElement, 'Enter');
        expect(component.step).toBe(0);
        key(rows()[0], 'Enter');
        expect(component.step).toBe(-1);
    }));

    it('marks incomplete measurements and says how many there are', fakeAsync(() => {
        open();

        expect(rows().map((row) => row.querySelector('.entry-warning') !== null)).toEqual([false, false, false, true]);
        const status = () => root().querySelector('.actions-warn')?.textContent?.trim();
        expect(status()).toBe('Widget not configured correctly: 1 measurement incomplete');

        component.getMeasurement(0).patchValue({ name: '' });
        settle();
        expect(status()).toBe('Widget not configured correctly: 2 measurements incomplete');
    }));

    it('marks the settings when the widget name is missing', fakeAsync(() => {
        open([numeric]);
        expect(rows()[0].querySelector('.entry-warning')).toBeNull();

        component.formGroup.patchValue({ name: '' });
        settle();

        expect(rows()[0].querySelector('.entry-warning')).not.toBeNull();
        expect(root().querySelector('.actions-warn')?.textContent?.trim()).toBe('Widget not configured correctly');
    }));

    it('adds a measurement, selects it and focuses its alias', fakeAsync(() => {
        open([numeric]);

        click(root().querySelector('button[aria-label="Add measurement"]'));

        expect(component.getMeasurements().length).toBe(2);
        expect(component.step).toBe(1);
        expect(labels()).toEqual(['Settings', 'Power', 'Measurement 2']);
        expect(document.activeElement).toBe(visible('input[formcontrolname="name"]')[0]);
    }));

    it('offers move and delete in the row menu, hiding what is not possible', fakeAsync(() => {
        open();
        const menu = (row: number): string[] => {
            click(rows()[row].querySelector('button.entry-menu'));
            const names = menuItems().map((item) => item.textContent?.replace(/\s+/g, ' ').trim() || '');
            expect(menuItems().find((item) => item.textContent?.includes('Delete'))?.classList).toContain('danger');
            click(document.querySelector('.cdk-overlay-backdrop'));
            return names;
        };

        expect(menu(1)).toEqual(['arrow_downward Move down', 'delete Delete']);
        expect(menu(2)).toEqual(['arrow_upward Move up', 'arrow_downward Move down', 'delete Delete']);
        expect(menu(3)).toEqual(['arrow_upward Move up', 'delete Delete']);
    }));

    it('has no row menu for the single measurement', fakeAsync(() => {
        open([numeric]);

        expect(rows()[1].querySelector('button.entry-menu')).toBeNull();
    }));

    it('runs the row menu actions on the measurement of its row', fakeAsync(() => {
        open();
        const choose = (row: number, action: string) => {
            click(rows()[row].querySelector('button.entry-menu'));
            click(menuItems().find((i) => i.textContent?.includes(action)));
        };

        choose(3, 'Move up');
        expect(labels()).toEqual(['Settings', 'Power', 'Measurement 2', 'State']);
        choose(1, 'Delete');
        expect(labels()).toEqual(['Settings', 'Measurement 1', 'State']);
    }));

    it('keeps the selection with its measurement when measurements move or go', fakeAsync(() => {
        open();
        component.select(2);

        component.moveUp(2);
        expect(component.step).toBe(1);
        component.moveUp(2);
        expect(component.step).toBe(2);
        component.removeTab(0);
        expect(component.step).toBe(1);
        component.removeTab(2);
        expect(component.step).toBe(1);
        component.removeTab(1);
        expect(component.step).toBe(0);
        component.removeTab(0);
        expect(component.step).toBe(-1);
    }));

    it('has no button inside the form without type="button", so Enter in a field submits nothing', fakeAsync(() => {
        open();
        const untyped = () => Array.from(root().querySelectorAll('form button')).filter((b) => b.getAttribute('type') !== 'button');

        expect(root().querySelectorAll('form button').length).toBeGreaterThan(0);
        expect(untyped()).toEqual([]);
        click(rows()[1]);
        expect(untyped()).toEqual([]);
        click(rows()[1].querySelector('button.entry-menu'));
        expect(menuItems().length).toBeGreaterThan(0);
        expect(menuItems().filter((i) => i.getAttribute('type') !== 'button')).toEqual([]);
    }));

    it('shows the settings alone, without the list, when the user may only rename', fakeAsync(() => {
        TestBed.resetTestingModule();
        spies = configureMultiValueDialogTestBed({ name: true, properties: false });
        open();

        expect(rows()).toEqual([]);
        expect(titles()).toEqual(['Settings']);
        expect(root().querySelectorAll('input').length).toBe(1);
    }));
});

describe('MultiValueEditDialogComponent initial focus', () => {
    let ref: MatDialogRef<MultiValueEditDialogComponent>;
    let spies: MultiValueDialogSpies;

    beforeEach(() => {
        spies = configureMultiValueDialogTestBed();
    });

    afterEach(() => ref?.close());

    it('focuses the widget name, not the settings row, when opened as a dialog', fakeAsync(() => {
        spies.dashboard.getWidget.and.returnValue(new Subject<WidgetModel>());
        ref = TestBed.inject(MatDialog).open(MultiValueEditDialogComponent, {
            data: { widgetId: 'widgetId-1', dashboardId: 'dashboardId-1', userHasUpdateNameAuthorization: true, userHasUpdatePropertiesAuthorization: true },
        });
        flush();
        TestBed.inject(ApplicationRef).tick();
        flush();

        expect(document.activeElement?.getAttribute('formcontrolname')).toBe('name');
    }));
});
