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

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { of } from 'rxjs';

import { FilterDialogComponent } from './filter-dialog.component';
import { FilterDialogResultModel } from './shared/filter-dialog.model';

describe('FilterDialogComponent', () => {
    let component: FilterDialogComponent;
    let fixture: ComponentFixture<FilterDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [FilterDialogComponent],
            imports: [MatDialogModule, MatCheckboxModule, MatFormFieldModule, MtxSelectModule, NoopAnimationsModule, ReactiveFormsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(FilterDialogComponent);
        component = fixture.componentInstance;
        component.config = {
            fields: [
                {
                    key: 'network', label: 'Network', type: 'select', section: 'Device',
                    items$: of([{ id: 'hub-1', name: 'Hub One' }]), bindLabel: 'name', bindValue: 'id',
                    value: 'hub-1',
                },
                {
                    key: 'attributeKeys', label: 'Attribute Key', type: 'multiselect', section: 'Attributes',
                    items$: of(['inactive']), allowNewValues: true, value: ['inactive', 'unknown-key'],
                },
                { key: 'onlyActive', label: 'Only Active', type: 'checkbox', section: 'Attributes' },
            ]
        };
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('groups the fields by section', () => {
        expect(component.sections.map(s => s.title)).toEqual(['Device', 'Attributes']);
        expect(component.sections[1].fields.length).toBe(2);
    });

    it('offers preselected values that are no known option', () => {
        expect(component.items['attributeKeys']).toEqual(['inactive', 'unknown-key']);
    });

    it('emits values and the labels of the selected options', () => {
        let result: FilterDialogResultModel | undefined;
        component.filterEvent.subscribe(r => result = r);
        component.filter();
        expect(result?.values['network']).toBe('hub-1');
        expect(result?.labels['network']).toEqual(['Hub One']);
        expect(result?.labels['attributeKeys']).toEqual(['inactive', 'unknown-key']);
        expect(result?.values['onlyActive']).toBe(false);
    });

    it('resets all fields to their empty value', () => {
        expect(component.hasActiveFilter()).toBeTrue();
        component.resetAllFilters();
        expect(component.hasActiveFilter()).toBeFalse();
        expect(component.form.controls['attributeKeys'].value).toEqual([]);
    });
});
