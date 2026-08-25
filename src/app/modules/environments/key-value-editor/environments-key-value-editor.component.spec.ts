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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { EnvironmentsKeyValueEditorComponent } from './environments-key-value-editor.component';

describe('EnvironmentsKeyValueEditorComponent', () => {
    let component: EnvironmentsKeyValueEditorComponent;
    let fixture: ComponentFixture<EnvironmentsKeyValueEditorComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsKeyValueEditorComponent],
            imports: [
                FormsModule,
                NoopAnimationsModule,
                MatFormFieldModule,
                MatInputModule,
                MatButtonModule,
                MatIconModule,
                MatTooltipModule,
                MatButtonToggleModule,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsKeyValueEditorComponent);
        component = fixture.componentInstance;
    }));

    function setRecord(record: Record<string, unknown> | undefined): void {
        component.record = record;
        component.ngOnChanges({ record: { currentValue: record, previousValue: undefined, firstChange: true, isFirstChange: () => true } });
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('builds one row per entry of the initial record', () => {
        setRecord({ occupied: true, name: 'Room' } as unknown as Record<string, unknown>);
        expect(component.rows.length).toBe(2);
    });

    it('emits only the entries with a non-empty key, converted per mode', () => {
        component.mode = 'mixed';
        setRecord({});
        component.rows.push({ key: 'power', value: '42', isText: false, readOnly: false });
        component.rows.push({ key: '', value: 'ignored', isText: true, readOnly: false }); // no key: dropped
        component.rows.push({ key: 'label', value: 'Meter 1', isText: true, readOnly: false });

        let emitted: Record<string, unknown> | undefined;
        component.recordChange.subscribe((r) => (emitted = r));
        component.emit();

        expect(emitted).toEqual({ power: 42, label: 'Meter 1' });
    });

    // The bug this pins: a naive "skip rebuild if currentValue matches whatever we last
    // emitted" guard never expires, so returning to an object this component emitted
    // earlier (even for a *different* binding in between) is mistaken for its own echo.
    it('rebuilds rows correctly across an A -> B -> A rebind, even though A ends up holding this component\'s own earlier emission', () => {
        const recordA: Record<string, unknown> = { occupied: 1 };

        // 1. bound to A, user edits it -- this component emits a new object for A
        setRecord(recordA);
        let emittedForA: Record<string, unknown> | undefined;
        component.recordChange.subscribe((r) => (emittedForA = r));
        component.rows[0].value = '0';
        component.emit();
        expect(emittedForA).toBeDefined();
        // the parent aliases the emission straight back onto the same property (as the
        // real templates do: `(recordChange)="zone.initial_states = $event"`)
        const recordAAfterEdit = emittedForA!;

        // 2. selection moves to B, a completely different, untouched object
        const recordB: Record<string, unknown> = { power: 10 };
        setRecord(recordB);
        expect(component.rows.map((r) => r.key)).toEqual(['power']);

        // 3. selection moves back to A -- A's reference is exactly what this component
        // itself emitted in step 1, which a lingering echo-guard would mistake for its own
        // echo of B and skip the rebuild, leaving B's row displayed while bound to A
        setRecord(recordAAfterEdit);
        expect(component.rows.map((r) => r.key)).toEqual(['occupied']);
        expect(component.rows[0].value).toBe('0');
    });

    it('does not rebuild rows (and so does not drop in-progress edits) on its own immediate echo', () => {
        const record: Record<string, unknown> = { a: 1 };
        setRecord(record);
        const rowsBeforeEcho = component.rows;

        let emitted: Record<string, unknown> | undefined;
        component.recordChange.subscribe((r) => (emitted = r));
        component.rows[0].value = '2';
        component.emit();

        // simulate the parent aliasing the emission straight back onto `record`
        setRecord(emitted);

        expect(component.rows).toBe(rowsBeforeEcho); // same row objects, not rebuilt
    });

    describe('non-primitive values', () => {
        it('shows a boolean value as a read-only JSON preview instead of stringifying it lossily', () => {
            setRecord({ occupied: false });
            expect(component.rows[0].readOnly).toBe(true);
            expect(component.rows[0].value).toBe('false');
        });

        it('shows an object value as a read-only JSON preview', () => {
            setRecord({ nested: { a: 1 } });
            expect(component.rows[0].readOnly).toBe(true);
            expect(component.rows[0].value).toBe('{"a":1}');
        });

        it('passes a read-only value through emit unchanged rather than re-stringifying it', () => {
            setRecord({ occupied: false, nested: { a: 1 } });

            let emitted: Record<string, unknown> | undefined;
            component.recordChange.subscribe((r) => (emitted = r));
            component.emit();

            expect(emitted).toEqual({ occupied: false, nested: { a: 1 } });
        });

        it('does not offer the number/text toggle for a read-only row', () => {
            setRecord({ occupied: false });
            expect(component.rows[0].isText).toBe(false);
        });
    });

    describe('number mode', () => {
        it('always writes numbers regardless of the isText flag', () => {
            component.mode = 'number';
            setRecord({});
            component.rows.push({ key: 'temperature', value: '900', isText: true, readOnly: false });

            let emitted: Record<string, unknown> | undefined;
            component.recordChange.subscribe((r) => (emitted = r));
            component.emit();

            expect(emitted).toEqual({ temperature: 900 });
        });
    });
});
