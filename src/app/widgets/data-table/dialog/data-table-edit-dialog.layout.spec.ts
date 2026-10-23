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
import { of } from 'rxjs';
import { DataTableEditDialogComponent } from './data-table-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DataTableElementModel, DataTableElementTypesEnum, DataTableOrderEnum, ExportValueTypes } from '../shared/data-table.model';
import { configureDataTableDialogTestBed, DataTableDialogSpies } from './data-table-dialog-testbed.mock';

describe('DataTableEditDialogComponent list and detail', () => {
    let fixture: ComponentFixture<DataTableEditDialogComponent>;
    let component: DataTableEditDialogComponent;
    let spies: DataTableDialogSpies;

    const device: DataTableElementModel = {
        id: 'el-device',
        name: 'Temperature',
        valueType: ExportValueTypes.FLOAT,
        exportId: null as unknown as string,
        exportValuePath: 'struct.Time',
        exportValueName: 'Time',
        exportCreatedByWidget: false,
        elementDetails: {
            elementType: DataTableElementTypesEnum.DEVICE,
            device: { aspectId: 'aspectId', functionId: 'functionId', deviceId: 'deviceId', serviceId: 'service_1', requestDevice: false },
        },
    };

    const pipeline: DataTableElementModel = {
        id: 'el-pipeline',
        name: 'Power',
        valueType: ExportValueTypes.FLOAT,
        exportId: 'export-1',
        exportValuePath: 'analytics.opValueName',
        exportValueName: 'opValueName',
        exportCreatedByWidget: false,
        elementDetails: {
            elementType: DataTableElementTypesEnum.PIPELINE,
            pipeline: { pipelineId: 'pipelineId', operatorId: 'operatorId' },
        },
    };

    /** Unnamed and without an aspect, so it is incomplete. */
    const unfinished: DataTableElementModel = {
        ...device,
        id: 'el-unfinished',
        name: '',
        elementDetails: {
            elementType: DataTableElementTypesEnum.DEVICE,
            device: { aspectId: '', functionId: '', deviceId: '', serviceId: '', requestDevice: false },
        },
    };

    function stored(elements: DataTableElementModel[]): WidgetModel {
        return {
            id: 'widgetId-1',
            name: 'Stored table',
            type: 'data_table',
            properties: {
                dataTable: {
                    order: DataTableOrderEnum.Default,
                    valueAlias: 'Reading',
                    refreshTime: 30,
                    valuesPerElement: 1,
                    elements,
                    convertRules: [{ status: 'on', icon: 'power', color: '#00aa00' }],
                },
            },
        } as unknown as WidgetModel;
    }

    beforeEach(() => {
        spies = configureDataTableDialogTestBed();
    });

    function open(elements: DataTableElementModel[] = [device, pipeline, unfinished]): void {
        spies.dashboard.getWidget.and.returnValue(of(stored(elements)));
        fixture = TestBed.createComponent(DataTableEditDialogComponent);
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

    it('starts with the table settings selected and shows the table and status sections', fakeAsync(() => {
        open();

        expect(rows()[0].classList).toContain('selected');
        expect(rows()[0].getAttribute('aria-selected')).toBe('true');
        expect(rows().slice(1).every((row) => row.getAttribute('aria-selected') === 'false')).toBeTrue();
        expect(titles()).toEqual(['Table', 'Status display']);
        expect(root().querySelectorAll('.rule-row').length).toBe(1);
    }));

    it('asks the dialog to focus the widget name first, not a list row', fakeAsync(() => {
        open();

        const focusInitial = Array.from(root().querySelectorAll('[cdkfocusinitial]'));
        expect(focusInitial.length).toBe(1);
        expect(focusInitial[0].getAttribute('formcontrolname')).toBe('name');
    }));

    it('lists the table first, then one row per element with its alias and source type', fakeAsync(() => {
        open();

        expect(labels()).toEqual(['Table', 'Temperature', 'Power', 'Element 3']);
        expect(rows().map((row) => row.querySelector('.entry-sub')?.textContent?.trim())).toEqual(['Stored table', 'Device', 'Pipeline', 'Device']);
    }));

    it('shows the fields of the selected entry only', fakeAsync(() => {
        open();

        click(rows()[1]);
        expect(component.step).toBe(0);
        expect(titles()).toEqual(['Element', 'Source', 'Display and grouping', 'Warnings']);
        const aliases = visible('input[formcontrolname="name"]');
        expect(aliases.length).toBe(1);
        expect(aliases[0].value).toBe('Temperature');

        click(rows()[2]);
        expect(component.step).toBe(1);
        expect(visible('input[formcontrolname="name"]').map((i) => i.value)).toEqual(['Power']);

        click(rows()[0]);
        expect(titles()).toEqual(['Table', 'Status display']);
    }));

    it('keeps the form of an element once shown, with its validators, while another entry is selected', fakeAsync(() => {
        open();
        const valuePath = () => component.getElement(0).get('exportValuePath');

        expect(root().querySelectorAll('input[formcontrolname="name"]').length).toBe(1);
        expect(valuePath()?.validator).toBeNull();

        click(rows()[1]);
        expect(valuePath()?.validator).not.toBeNull();
        click(rows()[0]);

        expect(root().querySelectorAll('input[formcontrolname="name"]').length).toBe(2);
        expect(visible('input[formcontrolname="name"]').length).toBe(1);
        expect(valuePath()?.validator).not.toBeNull();
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

    it('marks incomplete elements and says how many there are', fakeAsync(() => {
        open();

        expect(rows().map((row) => row.querySelector('.entry-warning') !== null)).toEqual([false, false, false, true]);
        const status = () => root().querySelector('.actions-warn')?.textContent?.trim();
        expect(status()).toBe('Widget not configured correctly: 1 element incomplete');

        component.getElement(0).patchValue({ name: '' });
        settle();
        expect(status()).toBe('Widget not configured correctly: 2 elements incomplete');
    }));

    it('marks the table settings when the widget name is missing', fakeAsync(() => {
        open([device]);
        expect(rows()[0].querySelector('.entry-warning')).toBeNull();

        component.formGroup.patchValue({ name: '' });
        settle();

        expect(rows()[0].querySelector('.entry-warning')).not.toBeNull();
        expect(root().querySelector('.actions-warn')?.textContent?.trim()).toBe('Widget not configured correctly');
    }));

    it('adds an element, selects it and focuses its alias', fakeAsync(() => {
        open([device]);

        click(root().querySelector('button[aria-label="Add element"]'));

        expect(component.getElements().length).toBe(2);
        expect(component.step).toBe(1);
        expect(labels()).toEqual(['Table', 'Temperature', 'Element 2']);
        const alias = visible('input[formcontrolname="name"]')[0];
        expect(document.activeElement).toBe(alias);
    }));

    it('offers move, duplicate and delete in the row menu, hiding what is not possible', fakeAsync(() => {
        open();
        const menu = (row: number): string[] => {
            click(rows()[row].querySelector('button.entry-menu'));
            const names = menuItems().map((item) => item.textContent?.replace(/\s+/g, ' ').trim() || '');
            expect(menuItems().find((item) => item.textContent?.includes('Delete'))?.classList).toContain('danger');
            click(document.querySelector('.cdk-overlay-backdrop'));
            return names;
        };

        expect(menu(1)).toEqual(['arrow_downward Move down', 'content_copy Duplicate', 'delete Delete']);
        expect(menu(2)).toEqual(['arrow_upward Move up', 'arrow_downward Move down', 'content_copy Duplicate', 'delete Delete']);
        expect(menu(3)).toEqual(['arrow_upward Move up', 'content_copy Duplicate', 'delete Delete']);
    }));

    it('offers only Duplicate for the single element', fakeAsync(() => {
        open([device]);

        click(rows()[1].querySelector('button.entry-menu'));

        expect(menuItems().map((i) => i.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['content_copy Duplicate']);
    }));

    it('runs the row menu actions on the element of its row', fakeAsync(() => {
        open();
        const choose = (row: number, action: string) => {
            click(rows()[row].querySelector('button.entry-menu'));
            click(menuItems().find((i) => i.textContent?.includes(action)));
        };

        choose(3, 'Move up');
        expect(labels()).toEqual(['Table', 'Temperature', 'Element 2', 'Power']);
        choose(1, 'Duplicate');
        expect(labels()).toEqual(['Table', 'Temperature', 'Element 2', 'Power', 'Temperature']);
        expect(component.step).toBe(3);
        choose(2, 'Delete');
        expect(labels()).toEqual(['Table', 'Temperature', 'Power', 'Temperature']);
    }));

    it('keeps the selection with its element when elements move or go', fakeAsync(() => {
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

    it('adds and deletes status rules in the table detail', fakeAsync(() => {
        open();

        click(Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.includes('Add rule')));
        expect(root().querySelectorAll('.rule-row').length).toBe(2);

        click(root().querySelectorAll('button.rule-delete')[0]);
        expect(root().querySelectorAll('.rule-row').length).toBe(1);
        expect(component.convertRulesControl.length).toBe(1);
    }));

    it('has no button inside the form without type="button", so Enter in a field submits nothing', fakeAsync(() => {
        open();
        const untyped = () => Array.from(root().querySelectorAll('form button')).filter((b) => b.getAttribute('type') !== 'button');

        expect(root().querySelectorAll('form button').length).toBeGreaterThan(0);
        expect(untyped()).toEqual([]);
        click(rows()[1]);
        expect(untyped()).toEqual([]);
        click(rows()[1].querySelector('button.entry-menu'));
        const items = menuItems();
        expect(items.length).toBeGreaterThan(0);
        expect(items.filter((i) => i.getAttribute('type') !== 'button')).toEqual([]);
    }));

    it('shows the table settings alone, without the list, when the user may only rename', fakeAsync(() => {
        TestBed.resetTestingModule();
        spies = configureDataTableDialogTestBed({ name: true, properties: false });
        open();

        expect(rows()).toEqual([]);
        expect(titles()).toEqual(['Table']);
        expect(root().querySelectorAll('input').length).toBe(1);
    }));
});
