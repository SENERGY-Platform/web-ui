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
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MtxSelectModule } from '@ng-matero/extensions/select';

import { EnvironmentsMeterParentsEditorComponent } from './environments-meter-parents-editor.component';
import { MeterParent } from '../../shared/environments.model';
import { NodeProblem } from '../../shared/environments-path';
import { SubmeteringOption } from '../../shared/environments-submetering';

describe('EnvironmentsMeterParentsEditorComponent', () => {
    let component: EnvironmentsMeterParentsEditorComponent;
    let fixture: ComponentFixture<EnvironmentsMeterParentsEditorComponent>;
    let emitted: MeterParent[][];
    let restructured: number;

    const options: SubmeteringOption[] = [
        { id: 'a1', label: 'Main meter (Site A)' },
        { id: 'g1', label: 'Meter group: Feeders' },
    ];

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [
                FormsModule,
                NoopAnimationsModule,
                MatFormFieldModule,
                MatInputModule,
                MatIconModule,
                MatTooltipModule,
                MatButtonModule,
                MatCheckboxModule,
                MtxSelectModule,
                EnvironmentsMeterParentsEditorComponent,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsMeterParentsEditorComponent);
        component = fixture.componentInstance;
        emitted = [];
        restructured = 0;
        component.parentsChange.subscribe((list) => emitted.push(list));
        component.parentsRestructured.subscribe(() => restructured++);
    }));

    /** Assigns inputs and drives ngOnChanges the way a real parent binding would, since a direct assignment on a fixture without a host template does not. */
    function bind(inputs: Partial<Pick<EnvironmentsMeterParentsEditorComponent, 'parents' | 'options' | 'problems' | 'problemPrefix'>>): void {
        Object.assign(component, inputs);
        const changes: Record<string, SimpleChange> = {};
        Object.keys(inputs).forEach((key) => (changes[key] = new SimpleChange(undefined, (inputs as Record<string, unknown>)[key], true)));
        component.ngOnChanges(changes);
        fixture.detectChanges();
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('add and remove', () => {
        it('adds a row without a target as a new list, from nothing as well, and signals the restructure', () => {
            bind({ parents: undefined, options });
            component.add();
            expect(emitted).toEqual([[{ id: '' }]]);
            expect(restructured).toBe(1);

            const existing: MeterParent[] = [{ id: 'a1', weight: 100 }];
            bind({ parents: existing, options });
            component.add();
            expect(emitted[1]).toEqual([{ id: 'a1', weight: 100 }, { id: '' }]);
            expect(emitted[1]).not.toBe(existing);
        });

        it('removes the row at the index as a new list and signals the restructure', () => {
            bind({ parents: [{ id: 'a1' }, { id: 'g1', conversion: true }], options });
            component.remove(0);
            expect(emitted).toEqual([[{ id: 'g1', conversion: true }]]);
            expect(restructured).toBe(1);
        });

        it('emits an empty list when the last row goes, for the parent to drop the field', () => {
            bind({ parents: [{ id: 'a1' }], options });
            component.remove(0);
            expect(emitted).toEqual([[]]);
        });

        it('wires the add button and the remove button of a row', () => {
            bind({ parents: [{ id: 'a1' }], options });
            const element: HTMLElement = fixture.nativeElement;
            const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
            buttons.find((b) => b.textContent?.includes('Add parent'))!.click();
            expect(emitted).toEqual([[{ id: 'a1' }, { id: '' }]]);

            bind({ parents: [{ id: 'a1' }], options });
            element.querySelector<HTMLButtonElement>('.meter-parent-row-actions button')!.click();
            expect(emitted[1]).toEqual([]);
        });
    });

    describe('editing a row writes the JSON the server expects', () => {
        it('writes the picked target id, and an empty pick as an empty id', () => {
            const row: MeterParent = { id: '' };
            bind({ parents: [row], options });
            component.setTarget(row, 'g1');
            expect(row).toEqual({ id: 'g1' });
            component.setTarget(row, null);
            expect(row).toEqual({ id: '' });
            expect(restructured).toBe(0);
        });

        it('writes a weight as a number and omits the key again when the field is emptied', () => {
            const row: MeterParent = { id: 'a1' };
            bind({ parents: [row], options });
            component.setWeight(row, '40');
            expect(row.weight).toBe(40);
            component.setWeight(row, null);
            expect(Object.prototype.hasOwnProperty.call(row, 'weight')).toBe(false);
            component.setWeight(row, 25);
            component.setWeight(row, '');
            expect(Object.prototype.hasOwnProperty.call(row, 'weight')).toBe(false);
            expect(JSON.stringify(row)).toBe('{"id":"a1"}');
        });

        it('keeps a weight of 0 or a negative one in the document instead of silently dropping it', () => {
            const row: MeterParent = { id: 'a1' };
            bind({ parents: [row], options });
            component.setWeight(row, 0);
            expect(row.weight).toBe(0);
            component.setWeight(row, '-4');
            expect(row.weight).toBe(-4);
        });

        it('keeps a weight that is not a plain positive number out of the document instead of writing NaN', () => {
            const row: MeterParent = { id: 'a1' };
            bind({ parents: [row], options });
            component.setWeight(row, 'abc');
            expect(JSON.stringify(row)).toBe('{"id":"a1"}');
        });

        it('writes conversion only when checked and omits the key when unchecked, not false', () => {
            const row: MeterParent = { id: 'a1' };
            bind({ parents: [row], options });
            component.setConversion(row, true);
            expect(JSON.stringify(row)).toBe('{"id":"a1","conversion":true}');
            component.setConversion(row, false);
            expect(JSON.stringify(row)).toBe('{"id":"a1"}');
        });

        it('emits the edited list after every row edit', () => {
            const parents: MeterParent[] = [{ id: 'a1' }];
            bind({ parents, options });
            component.setWeight(parents[0], 100);
            component.setConversion(parents[0], true);
            expect(emitted.length).toBe(2);
            expect(emitted[1]).toBe(parents);
            expect(emitted[1]).toEqual([{ id: 'a1', weight: 100, conversion: true }]);
        });
    });

    describe('weight hint', () => {
        const hint = (): string | null => fixture.nativeElement.querySelector('.weight-hint')?.textContent?.trim() ?? null;

        it('is not shown without weights or with weights that add up to 100', () => {
            bind({ parents: [{ id: 'a1' }, { id: 'g1' }], options });
            expect(hint()).toBeNull();
            bind({ parents: [{ id: 'a1', weight: 60 }, { id: 'g1', weight: 40 }], options });
            expect(hint()).toBeNull();
        });

        it('is shown, without blocking anything, for partial weights and for a wrong sum', () => {
            bind({ parents: [{ id: 'a1', weight: 60 }, { id: 'g1' }], options });
            expect(hint()).toContain('every parent or on none');
            bind({ parents: [{ id: 'a1', weight: 60 }, { id: 'g1', weight: 30 }], options });
            expect(hint()).toContain('add up to 90');
        });
    });

    describe('row weight problems', () => {
        const rowMessages = (): string[] =>
            Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.meter-parent-row')).map((row) => row.querySelector('.meter-parent-row-problem')?.textContent?.trim() ?? '');

        it('marks a weight of 0, one above 100 and a fraction on their own rows, and leaves a valid one alone', () => {
            bind({ parents: [{ id: 'a1', weight: 0 }, { id: 'g1', weight: 101 }, { id: 'a1', weight: 33.5 }, { id: 'g1', weight: 50 }], options });
            const messages = rowMessages();
            expect(messages[0]).toContain('0 counts as no weight');
            expect(messages[1]).toContain('from 1 to 100');
            expect(messages[2]).toContain('whole number');
            expect(messages[3]).toBe('');
            const rows = fixture.nativeElement.querySelectorAll('.meter-parent-row');
            expect(Array.from<HTMLElement>(rows).map((r) => r.classList.contains('problem-row'))).toEqual([true, true, true, false]);
        });
    });

    describe('options', () => {
        it('shows a stored id that the options lack by its id instead of an empty select', () => {
            bind({ parents: [{ id: 'elsewhere' }, { id: 'a1' }], options });
            expect(component.displayOptions).toEqual([...options, { id: 'elsewhere', label: 'elsewhere' }]);
        });

        it('hands the select the same array on an unrelated change-detection pass', () => {
            bind({ parents: [{ id: 'a1' }], options });
            const first = component.displayOptions;
            fixture.detectChanges();
            expect(component.displayOptions).toBe(first);
        });

        it('renders one row per parent with the target, weight and medium change controls', () => {
            bind({ parents: [{ id: 'a1', weight: 50, conversion: true }, { id: 'g1', weight: 50 }], options });
            const rows = fixture.nativeElement.querySelectorAll('.meter-parent-row');
            expect(rows.length).toBe(2);
            expect(rows[0].querySelector('mtx-select')).not.toBeNull();
            expect(rows[0].textContent).toContain('Medium change');
        });
    });

    describe('server problems', () => {
        const problems: NodeProblem[] = [
            { suffix: 'meter_parents[1]', message: 'weights must add up to 100' },
            { suffix: 'meter_parents[0].id', message: 'unknown parent' },
            { suffix: 'meter_parents', message: 'at most one conversion' },
            { suffix: 'submetered_by', message: 'not mine' },
            { suffix: 'meter_groups[0].parents[0]', message: 'another list' },
        ];

        it('marks and explains the row a problem path names, and shows a list-level one above the rows', () => {
            bind({ parents: [{ id: 'a1' }, { id: 'g1' }], options, problems, problemPrefix: 'meter_parents' });
            const rows = fixture.nativeElement.querySelectorAll('.meter-parent-row');
            expect(rows[0].classList.contains('problem-row')).toBe(true);
            expect(rows[1].classList.contains('problem-row')).toBe(true);
            expect(rows[0].textContent).toContain('id: unknown parent');
            expect(rows[1].textContent).toContain('weights must add up to 100');
            expect(fixture.nativeElement.querySelector('.list-problem').textContent).toContain('at most one conversion');
            expect(fixture.nativeElement.textContent).not.toContain('not mine');
            expect(fixture.nativeElement.textContent).not.toContain('another list');
        });

        it('reads the rows of a group\'s list under that group\'s prefix only', () => {
            bind({ parents: [{ id: 'a1' }], options, problems, problemPrefix: 'meter_groups[0].parents' });
            const rows = fixture.nativeElement.querySelectorAll('.meter-parent-row');
            expect(rows[0].classList.contains('problem-row')).toBe(true);
            expect(rows[0].textContent).toContain('another list');
            expect(fixture.nativeElement.querySelector('.list-problem')).toBeNull();
        });
    });
});
