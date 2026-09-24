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
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MtxSelect, MtxSelectModule } from '@ng-matero/extensions/select';

import { EnvironmentsDatasetEditorComponent } from './environments-dataset-editor.component';
import { DatasetMeta, DatasetSource } from '../../shared/environments.model';
import { ExportModel } from '../../../exports/shared/export.model';

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
                MtxSelectModule,
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

    describe('export origin', () => {
        const exports: ExportModel[] = [
            {
                ID: 'ex-1', Name: 'Power export',
                Values: [
                    { Name: 'power', Type: 'https://schema.org/Float' },
                    { Name: 'energy', Type: 'https://schema.org/Float' },
                ],
            } as ExportModel,
            { ID: 'ex-2', Name: 'Temp export', Values: [{ Name: 'temp', Type: 'https://schema.org/Float' }] } as ExportModel,
        ];

        it('looks up the columns of the currently selected export by id', () => {
            component.exports = exports;
            expect(component.columnsForExport('ex-1').map((c) => c.Name)).toEqual(['power', 'energy']);
            expect(component.columnsForExport('ex-2').map((c) => c.Name)).toEqual(['temp']);
        });

        it('returns an empty array for an unset or unknown export id', () => {
            component.exports = exports;
            expect(component.columnsForExport(undefined)).toEqual([]);
            expect(component.columnsForExport('missing')).toEqual([]);
        });

        it('offers the exports and the columns of the selected export in the template', () => {
            component.exports = exports;
            component.dataset = { origin: 'export', ref: 'ex-1' };
            fixture.detectChanges();

            const exportSelect: MtxSelect = fixture.debugElement.query(By.css('mtx-select[name="dataset-export-ref"]')).componentInstance;
            expect((exportSelect.items as { $ngOptionLabel: string }[]).map((i) => i.$ngOptionLabel)).toEqual(['Power export', 'Temp export']);

            const columnSelect: MtxSelect = fixture.debugElement.query(By.css('mtx-select[name="dataset-export-column"]')).componentInstance;
            expect((columnSelect.items as { $ngOptionLabel: string }[]).map((i) => i.$ngOptionLabel)).toEqual(['power', 'energy']);
        });

        it('excludes tag columns and non-numeric columns: a text or boolean column saves but the wrapper hands back no numbers', () => {
            const mixedExports: ExportModel[] = [
                {
                    ID: 'ex-mixed', Name: 'Mixed export',
                    Values: [
                        { Name: 'power', Type: 'https://schema.org/Float' },
                        { Name: 'count', Type: 'https://schema.org/Integer' },
                        { Name: 'usage', Type: 'https://schema.org/Number' },
                        { Name: 'reading', Type: 'urn:some-aspect/Float' },
                        { Name: 'device_id', Type: 'https://schema.org/Text' },
                        { Name: 'active', Type: 'https://schema.org/Boolean' },
                        { Name: 'zone', Type: 'https://schema.org/Text', Tag: true },
                    ],
                } as ExportModel,
            ];
            component.exports = mixedExports;
            expect(component.columnsForExport('ex-mixed').map((c) => c.Name)).toEqual(['power', 'count', 'usage', 'reading']);
        });
    });

    describe('origin-dependent fields in the template', () => {
        it('shows the window field for platform and export, not for file', () => {
            component.dataset = { origin: 'platform' };
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('input[name="dataset-window"]'))).toBeTruthy();

            component.dataset = { origin: 'export' };
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('input[name="dataset-window"]'))).toBeTruthy();

            component.dataset = { origin: 'file' };
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('input[name="dataset-window"]'))).toBeFalsy();
        });

        it('shows the follow controls for platform and export only', () => {
            component.dataset = { origin: 'file' };
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('mat-checkbox[name="dataset-follow"]'))).toBeFalsy();

            component.dataset = { origin: 'platform' };
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('mat-checkbox[name="dataset-follow"]'))).toBeTruthy();

            component.dataset = { origin: 'export' };
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('mat-checkbox[name="dataset-follow"]'))).toBeTruthy();
        });
    });

    describe('follow problem line', () => {
        it('appears for anchor loop and disappears once anchor is original', () => {
            component.dataset = { origin: 'platform', follow: true, anchor: 'loop' };
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('.follow-problem'))).toBeTruthy();

            component.dataset.anchor = 'original';
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('.follow-problem'))).toBeFalsy();
        });

        it('appears on a file origin too, so a document written by another client can be repaired here', () => {
            component.dataset = { origin: 'file', follow: true };
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.follow-problem'))).toBeTruthy();
            expect(fixture.debugElement.query(By.css('mat-checkbox[name="dataset-follow"]'))).toBeTruthy();
        });
    });

    describe('onOriginChange', () => {
        it('clears every origin-specific field when switching to file, and emits once', () => {
            const dataset: DatasetSource = {
                origin: 'platform', ref: 'device-1', column: 'value', service_ref: 'svc-1',
                window: '7d', follow: true, follow_every: '30m', anchor: 'original',
            };
            component.dataset = dataset;
            let emitCount = 0;
            component.datasetChange.subscribe(() => emitCount++);

            dataset.origin = 'file';
            component.onOriginChange();

            expect(dataset.ref).toBeUndefined();
            expect(dataset.column).toBeUndefined();
            expect(dataset.service_ref).toBeUndefined();
            expect(dataset.window).toBeUndefined();
            expect(dataset.follow).toBeUndefined();
            expect(dataset.follow_every).toBeUndefined();
            expect(emitCount).toBe(1);
        });

        it('also clears ref, column, window, follow and follow_every when switching between two remote origins', () => {
            const dataset: DatasetSource = {
                origin: 'platform', ref: 'device-1', column: 'value', service_ref: 'svc-1',
                window: '7d', follow: true, follow_every: '30m', anchor: 'original',
            };
            component.dataset = dataset;

            dataset.origin = 'export';
            component.onOriginChange();

            expect(dataset.ref).toBeUndefined();
            expect(dataset.column).toBeUndefined();
            expect(dataset.service_ref).toBeUndefined();
            expect(dataset.window).toBeUndefined();
            expect(dataset.follow).toBeUndefined();
            expect(dataset.follow_every).toBeUndefined();
        });

        it('keeps resample, anchor, scale and cumulative across an origin switch', () => {
            const dataset: DatasetSource = { origin: 'platform', resample: 'linear', anchor: 'original', scale: 2, cumulative: true };
            component.dataset = dataset;

            dataset.origin = 'export';
            component.onOriginChange();

            expect(dataset.resample).toBe('linear');
            expect(dataset.anchor).toBe('original');
            expect(dataset.scale).toBe(2);
            expect(dataset.cumulative).toBe(true);
        });
    });

    describe('filters', () => {
        it('hides the filters block for origin file unless filters are already present', () => {
            component.dataset = { origin: 'file' };
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('.filter-row'))).toBeFalsy();

            component.dataset = { origin: 'file', filters: [{ column: 'a', value: '1' }] };
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('.filter-row'))).toBeTruthy();
        });

        it('shows the "Add filter" button for origin export even with no rows yet', () => {
            component.dataset = { origin: 'export' };
            fixture.detectChanges();
            const addButtons = fixture.debugElement.queryAll(By.css('button')).filter((b) => b.nativeElement.textContent.includes('Add filter'));
            expect(addButtons.length).toBe(1);
        });

        it('addFilter appends an empty row in place and emits both signals', () => {
            const dataset: DatasetSource = { origin: 'export' };
            component.dataset = dataset;
            let emitted = false;
            let restructured = false;
            component.datasetChange.subscribe(() => (emitted = true));
            component.datasetRestructured.subscribe(() => (restructured = true));

            component.addFilter();

            expect(dataset.filters).toEqual([{ column: '', value: '' }]);
            expect(component.dataset).toBe(dataset);
            expect(emitted).toBe(true);
            expect(restructured).toBe(true);
        });

        // Regression: a stale index-based problem (e.g. "dataset.filters[0].value") must not
        // keep pointing at a row that shifted or vanished -- see datasetRestructured and
        // onDatasetRestructured/afterStructuralChange in environment-detail.component.ts.
        it('removeFilter mutates in place, emits both signals, and drops the key once the list is empty', () => {
            const dataset: DatasetSource = { origin: 'export', filters: [{ column: 'a', value: '1' }, { column: 'b', value: '2' }] };
            component.dataset = dataset;
            let emitCount = 0;
            let restructuredCount = 0;
            component.datasetChange.subscribe(() => emitCount++);
            component.datasetRestructured.subscribe(() => restructuredCount++);

            component.removeFilter(0);
            expect(dataset.filters).toEqual([{ column: 'b', value: '2' }]);
            expect(emitCount).toBe(1);
            expect(restructuredCount).toBe(1);

            component.removeFilter(0);
            expect(dataset.filters).toBeUndefined();
            expect(emitCount).toBe(2);
            expect(restructuredCount).toBe(2);
        });
    });

    describe('fallback', () => {
        it('the checkbox creates a fallback with one empty filter row, deletes it when unchecked, and emits both signals', () => {
            const dataset: DatasetSource = { origin: 'export' };
            component.dataset = dataset;
            let emitCount = 0;
            let restructuredCount = 0;
            component.datasetChange.subscribe(() => emitCount++);
            component.datasetRestructured.subscribe(() => restructuredCount++);

            component.onFallbackToggle(true);
            expect(dataset.fallback).toEqual({ filters: [{ column: '', value: '' }] });
            expect(emitCount).toBe(1);
            expect(restructuredCount).toBe(1);

            component.onFallbackToggle(false);
            expect(dataset.fallback).toBeUndefined();
            expect(emitCount).toBe(2);
            expect(restructuredCount).toBe(2);
        });

        it('addFallbackFilter/removeFallbackFilter mutate in place, emit both signals, keeping an empty list rather than dropping it', () => {
            const dataset: DatasetSource = { origin: 'export', fallback: { filters: [{ column: 'a', value: '1' }] } };
            component.dataset = dataset;
            let emitCount = 0;
            let restructuredCount = 0;
            component.datasetChange.subscribe(() => emitCount++);
            component.datasetRestructured.subscribe(() => restructuredCount++);

            component.addFallbackFilter();
            expect(dataset.fallback?.filters).toEqual([{ column: 'a', value: '1' }, { column: '', value: '' }]);
            expect(emitCount).toBe(1);
            expect(restructuredCount).toBe(1);

            component.removeFallbackFilter(1);
            component.removeFallbackFilter(0);
            expect(dataset.fallback?.filters).toEqual([]);
            expect(dataset.fallback).toBeDefined();
            expect(emitCount).toBe(3);
            expect(restructuredCount).toBe(3);
        });
    });

    describe('onFollowChange', () => {
        it('clears follow_every when Follow is unchecked, and emits once: the server refuses follow_every without follow', () => {
            const dataset: DatasetSource = { origin: 'platform', anchor: 'original', follow: false, follow_every: '30m' };
            component.dataset = dataset;
            let emitCount = 0;
            component.datasetChange.subscribe(() => emitCount++);

            component.onFollowChange();

            expect(dataset.follow).toBeUndefined();
            expect(dataset.follow_every).toBeUndefined();
            expect(emitCount).toBe(1);
        });

        it('leaves follow_every alone while Follow stays checked', () => {
            const dataset: DatasetSource = { origin: 'platform', anchor: 'original', follow: true, follow_every: '45m' };
            component.dataset = dataset;

            component.onFollowChange();

            expect(dataset.follow).toBe(true);
            expect(dataset.follow_every).toBe('45m');
        });
    });
});
