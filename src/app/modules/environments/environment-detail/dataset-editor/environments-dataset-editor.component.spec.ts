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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

import { EnvironmentsDatasetEditorComponent } from './environments-dataset-editor.component';
import { DatasetMeta, DatasetSource } from '../../shared/environments.model';

describe('EnvironmentsDatasetEditorComponent', () => {
    let component: EnvironmentsDatasetEditorComponent;
    let fixture: ComponentFixture<EnvironmentsDatasetEditorComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsDatasetEditorComponent],
            imports: [
                FormsModule,
                NoopAnimationsModule,
                MatFormFieldModule,
                MatInputModule,
                MatIconModule,
                MatTooltipModule,
                MatCheckboxModule,
                MatButtonModule,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsDatasetEditorComponent);
        component = fixture.componentInstance;
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('emits datasetChange on a field change, without replacing the bound object', () => {
        const dataset: DatasetSource = { origin: 'file' };
        component.dataset = dataset;
        let emitted = false;
        component.datasetChange.subscribe(() => (emitted = true));

        dataset.ref = 'ds-1';
        component.onFieldChange();

        expect(emitted).toBe(true);
        expect(component.dataset).toBe(dataset); // mutated in place, not swapped
    });

    it('looks up the columns of the currently selected dataset by id', () => {
        const datasets: DatasetMeta[] = [
            { id: 'ds-1', name: 'A', columns: [{ name: 'power' }, { name: 'energy' }] },
            { id: 'ds-2', name: 'B', columns: [{ name: 'temp' }] },
        ];
        component.datasets = datasets;
        expect(component.columnsForDataset('ds-1').map((c) => c.name)).toEqual(['power', 'energy']);
        expect(component.columnsForDataset('ds-2').map((c) => c.name)).toEqual(['temp']);
    });

    it('returns an empty array for an unset or unknown dataset id', () => {
        component.datasets = [{ id: 'ds-1', name: 'A', columns: [{ name: 'power' }] }];
        expect(component.columnsForDataset(undefined)).toEqual([]);
        expect(component.columnsForDataset('missing')).toEqual([]);
    });

    it('emits selectDevice without mutating the source itself (the caller owns the picker)', () => {
        let emitted = false;
        component.selectDevice.subscribe(() => (emitted = true));
        component.selectDevice.emit();
        expect(emitted).toBe(true);
    });
});
