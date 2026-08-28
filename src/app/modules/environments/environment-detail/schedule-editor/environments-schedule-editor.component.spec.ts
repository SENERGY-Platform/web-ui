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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';

import { EnvironmentsScheduleEditorComponent } from './environments-schedule-editor.component';
import { EnvironmentsKeyValueEditorComponent } from '../../key-value-editor/environments-key-value-editor.component';
import { ScheduleSource, ScheduleState } from '../../shared/environments.model';

describe('EnvironmentsScheduleEditorComponent', () => {
    let component: EnvironmentsScheduleEditorComponent;
    let fixture: ComponentFixture<EnvironmentsScheduleEditorComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsScheduleEditorComponent],
            imports: [
                FormsModule,
                NoopAnimationsModule,
                MatFormFieldModule,
                MatInputModule,
                MatIconModule,
                MatTooltipModule,
                MatCheckboxModule,
                MatButtonModule,
                MatDividerModule,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsScheduleEditorComponent);
        component = fixture.componentInstance;
    }));

    function setSchedule(schedule: ScheduleSource | undefined): void {
        component.schedule = schedule;
        component.ngOnChanges({ schedule: { currentValue: schedule, previousValue: undefined, firstChange: true, isFirstChange: () => true } });
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('has no chart before a schedule is bound', () => {
        expect(component.chart).toBeUndefined();
    });

    describe('states: add/remove/move', () => {
        it('addState appends a state with sane defaults, mutates in place and emits', () => {
            const schedule: ScheduleSource = {};
            setSchedule(schedule);
            let emitted = false;
            component.scheduleChange.subscribe(() => (emitted = true));

            component.addState();

            expect(schedule.states!.length).toBe(1);
            expect(schedule.states![0]).toEqual({ name: '', duration_seconds: 60, value: 0 });
            expect(emitted).toBe(true);
        });

        it('removeState drops the state at the given index and emits', () => {
            const schedule: ScheduleSource = {
                states: [
                    { name: 'idle', duration_seconds: 600, value: 0 },
                    { name: 'run', duration_seconds: 300, value: 15 },
                ],
            };
            setSchedule(schedule);
            let emitted = false;
            component.scheduleChange.subscribe(() => (emitted = true));

            component.removeState(0);

            expect(schedule.states!.map((s) => s.name)).toEqual(['run']);
            expect(emitted).toBe(true);
        });

        it('moveStateUp/moveStateDown reorder in place and emit', () => {
            const schedule: ScheduleSource = {
                states: [
                    { name: 'idle', duration_seconds: 600, value: 0 },
                    { name: 'ramp', duration_seconds: 120, value: 8 },
                    { name: 'run', duration_seconds: 1800, value: 15 },
                ],
            };
            setSchedule(schedule);
            let emitted = false;
            component.scheduleChange.subscribe(() => (emitted = true));

            component.moveStateDown(0);
            expect(schedule.states!.map((s) => s.name)).toEqual(['ramp', 'idle', 'run']);

            component.moveStateUp(2);
            expect(schedule.states!.map((s) => s.name)).toEqual(['ramp', 'run', 'idle']);
            expect(emitted).toBe(true);
        });

        it('does not move a state past either end of the list', () => {
            const schedule: ScheduleSource = {
                states: [
                    { name: 'idle', duration_seconds: 600, value: 0 },
                    { name: 'run', duration_seconds: 300, value: 15 },
                ],
            };
            setSchedule(schedule);

            component.moveStateUp(0);
            expect(schedule.states!.map((s) => s.name)).toEqual(['idle', 'run']);

            component.moveStateDown(1);
            expect(schedule.states!.map((s) => s.name)).toEqual(['idle', 'run']);
        });
    });

    describe('gate', () => {
        it('setGateEnabled(true) materialises a gate with defaults', () => {
            const schedule: ScheduleSource = {};
            setSchedule(schedule);

            component.setGateEnabled(true);

            expect(schedule.gate).toEqual({ context_key: '', threshold: 0 });
        });

        it('setGateEnabled(false) removes the gate', () => {
            const schedule: ScheduleSource = { gate: { context_key: 'shift_active', threshold: 0 } };
            setSchedule(schedule);

            component.setGateEnabled(false);

            expect(schedule.gate).toBeUndefined();
        });

        it('setGateEnabled(true) preserves an existing gate instead of resetting it', () => {
            const schedule: ScheduleSource = { gate: { context_key: 'shift_active', threshold: 3 } };
            setSchedule(schedule);

            component.setGateEnabled(true);

            expect(schedule.gate).toEqual({ context_key: 'shift_active', threshold: 3 });
        });
    });

    describe('state_writes', () => {
        it('round-trips a non-empty record onto the state', () => {
            const schedule: ScheduleSource = { states: [{ name: 'run', duration_seconds: 60, value: 15 }] };
            setSchedule(schedule);

            component.setStateWrites(schedule.states![0], { air_demand: 90 });

            expect(schedule.states![0].state_writes).toEqual({ air_demand: 90 });
        });

        // Regression: writing back `undefined` (or a copy) instead of the exact emitted
        // object breaks the key-value editor's reference-equality echo guard -- see the
        // "wired together" suite below for the full parent/child reproduction. Cleanup of
        // an emptied-out record to `undefined` happens on collapse (toggleWrites) instead,
        // where no editor is mid-edit.
        it('writes the emitted record back by the exact same reference, even when it is empty', () => {
            const schedule: ScheduleSource = {
                states: [{ name: 'run', duration_seconds: 60, value: 15, state_writes: { air_demand: 90 } }],
            };
            setSchedule(schedule);

            const emptyRecord = {};
            component.setStateWrites(schedule.states![0], emptyRecord);

            expect(schedule.states![0].state_writes).toBe(emptyRecord);
        });

        it('writeCount reflects the number of entries, 0 for an unset record', () => {
            const state: ScheduleState = { name: 'run', duration_seconds: 60, value: 15 };
            expect(component.writeCount(state)).toBe(0);

            state.state_writes = { air_demand: 90, setpoint: 5 };
            expect(component.writeCount(state)).toBe(2);
        });
    });

    describe('preview chart', () => {
        it('builds a chart once a schedule with a positive-duration state is bound', () => {
            setSchedule({ states: [{ name: 'run', duration_seconds: 60, value: 15 }] });
            expect(component.chart).toBeDefined();
        });

        it('is undefined for a schedule with no usable states', () => {
            setSchedule({ states: [] });
            expect(component.chart).toBeUndefined();
        });

        it('rebuilds the chart on a field change', () => {
            const schedule: ScheduleSource = { states: [{ name: 'run', duration_seconds: 60, value: 15 }] };
            setSchedule(schedule);
            expect(component.chart).toBeDefined();

            schedule.states = [];
            component.onFieldChange();

            expect(component.chart).toBeUndefined();
        });
    });
});

/**
 * Regression coverage for a real bug: setStateWrites used to write `undefined` back for an
 * emptied-out record instead of the exact object the key-value editor just emitted. That
 * broke the key-value editor's one-shot echo guard (it skips rebuilding its rows only when
 * the incoming `record` is reference-equal to what it itself last emitted) -- rows got
 * rebuilt from `undefined`, and the row the user was still typing in vanished from under
 * the cursor. Exercising this needs the *real* parent/child wiring (a real template
 * binding, not a mocked child), so this suite declares both components together instead of
 * using NO_ERRORS_SCHEMA for the key-value editor the way the suite above does.
 */
describe('EnvironmentsScheduleEditorComponent + the real key-value editor (state_writes echo guard)', () => {
    let fixture: ComponentFixture<EnvironmentsScheduleEditorComponent>;
    let component: EnvironmentsScheduleEditorComponent;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            // mtx-select and apx-chart are still unresolved here (irrelevant to this suite);
            // only the schedule editor and the key-value editor need to be the real thing.
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsScheduleEditorComponent, EnvironmentsKeyValueEditorComponent],
            imports: [
                FormsModule,
                NoopAnimationsModule,
                MatFormFieldModule,
                MatInputModule,
                MatIconModule,
                MatTooltipModule,
                MatCheckboxModule,
                MatButtonModule,
                MatButtonToggleModule,
                MatDividerModule,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsScheduleEditorComponent);
        component = fixture.componentInstance;
    }));

    function setSchedule(schedule: ScheduleSource): void {
        component.schedule = schedule;
        component.ngOnChanges({ schedule: { currentValue: schedule, previousValue: undefined, firstChange: true, isFirstChange: () => true } });
        fixture.detectChanges();
    }

    function keyValueRows(): HTMLElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('.state-writes .key-value-row'));
    }

    /** The real child instance, queried instead of relying on MatInput's native `.value` sync
     * timing (unrelated to what this suite is regression-testing and finicky in this harness). */
    function keyValueEditor(): EnvironmentsKeyValueEditorComponent {
        return fixture.debugElement.query(By.directive(EnvironmentsKeyValueEditorComponent)).componentInstance;
    }

    it('keeps the row and its untouched value visible when the last key is cleared to empty', () => {
        const schedule: ScheduleSource = {
            states: [{ name: 'run', duration_seconds: 60, value: 15, state_writes: { air_demand: 90 } }],
        };
        setSchedule(schedule);

        component.toggleWrites(schedule.states![0]); // open the writes panel
        fixture.detectChanges();

        const editorBefore = keyValueEditor();
        expect(editorBefore.rows.length).toBe(1);
        expect(editorBefore.rows[0].key).toBe('air_demand');
        expect(editorBefore.rows[0].value).toBe('90');

        // Ctrl+A/Backspace on the key field: clear it to empty and let ngModel report the change
        const keyInput: HTMLInputElement = keyValueRows()[0].querySelectorAll('input')[0];
        keyInput.value = '';
        keyInput.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        // the emitted (now empty) record must have landed back on the document by the exact
        // reference the editor emitted it with -- not undefined -- so the echo guard matches
        expect(schedule.states![0].state_writes).toEqual({});

        // the echo guard must have matched: the editor's own `rows` (the state that actually
        // drives what is rendered) is the SAME array instance as before, not rebuilt from the
        // now-empty record -- a rebuild would have produced zero rows, wiping the row (and the
        // value the user never touched) out from under the cursor
        const editorAfter = keyValueEditor();
        expect(editorAfter.rows).toBe(editorBefore.rows);
        expect(editorAfter.rows.length).toBe(1);
        expect(editorAfter.rows[0].key).toBe(''); // the key the user just cleared
        expect(editorAfter.rows[0].value).toBe('90'); // the value column, untouched, is still there too
    });

    it('drops an emptied-out state_writes back to undefined once the panel is collapsed', () => {
        const schedule: ScheduleSource = {
            states: [{ name: 'run', duration_seconds: 60, value: 15, state_writes: { air_demand: 90 } }],
        };
        setSchedule(schedule);
        const state = schedule.states![0];

        component.toggleWrites(state); // open
        fixture.detectChanges();
        const keyInput: HTMLInputElement = keyValueRows()[0].querySelectorAll('input')[0];
        keyInput.value = '';
        keyInput.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(state.state_writes).toEqual({});

        let emitted = false;
        component.scheduleChange.subscribe(() => (emitted = true));
        component.toggleWrites(state); // close
        fixture.detectChanges();

        expect(state.state_writes).toBeUndefined();
        expect(emitted).toBe(true);
    });

    it('leaves a non-empty state_writes alone on collapse, without emitting', () => {
        const schedule: ScheduleSource = {
            states: [{ name: 'run', duration_seconds: 60, value: 15, state_writes: { air_demand: 90 } }],
        };
        setSchedule(schedule);
        const state = schedule.states![0];

        component.toggleWrites(state); // open, untouched
        fixture.detectChanges();
        let emitted = false;
        component.scheduleChange.subscribe(() => (emitted = true));
        component.toggleWrites(state); // close

        expect(state.state_writes).toEqual({ air_demand: 90 });
        expect(emitted).toBe(false);
    });
});
