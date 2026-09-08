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
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MtxSelectModule } from '@ng-matero/extensions/select';

import { EnvironmentsFaultsEditorComponent } from './environments-faults-editor.component';
import { Fault } from '../../shared/environments.model';
import { NodeProblem } from '../../shared/environments-path';

describe('EnvironmentsFaultsEditorComponent', () => {
    let component: EnvironmentsFaultsEditorComponent;
    let fixture: ComponentFixture<EnvironmentsFaultsEditorComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsFaultsEditorComponent],
            imports: [
                FormsModule,
                NoopAnimationsModule,
                MatFormFieldModule,
                MatInputModule,
                MatIconModule,
                MatTooltipModule,
                MatButtonModule,
                MatButtonToggleModule,
                MtxSelectModule,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsFaultsEditorComponent);
        component = fixture.componentInstance;
    }));

    /** Assigns `problems` and drives ngOnChanges the way a real parent binding would, since a direct property assignment on a fixture created without a host template does not. */
    function setProblems(problems: NodeProblem[]): void {
        component.problems = problems;
        component.ngOnChanges({ problems: { currentValue: problems, previousValue: undefined, firstChange: true, isFirstChange: () => true } });
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('add/remove', () => {
        beforeEach(() => jasmine.clock().install());
        afterEach(() => jasmine.clock().uninstall());

        it('addFault appends a fault with a defined default kind and a seeded one-hour window, mutates in place and emits both signals', () => {
            jasmine.clock().mockDate(new Date('2026-03-02T10:30:45.123Z'));
            const faults: Fault[] = [];
            component.faults = faults;
            let emitted = false;
            let restructured = false;
            component.faultsChange.subscribe(() => (emitted = true));
            component.faultsRestructured.subscribe(() => (restructured = true));

            component.addFault();

            expect(faults.length).toBe(1);
            expect(faults[0]).toEqual({ kind: 'outage', from: '2026-03-02T09:30:45Z', to: '2026-03-02T10:30:45Z' });
            expect(emitted).toBe(true);
            expect(restructured).toBe(true);
        });

        it('removeFault drops the fault at the given index and emits both signals', () => {
            const faults: Fault[] = [{ kind: 'outage' }, { kind: 'frozen' }];
            component.faults = faults;
            let emitted = false;
            let restructured = false;
            component.faultsChange.subscribe(() => (emitted = true));
            component.faultsRestructured.subscribe(() => (restructured = true));

            component.removeFault(0);

            expect(faults.map((f) => f.kind)).toEqual(['frozen']);
            expect(emitted).toBe(true);
            expect(restructured).toBe(true);
        });

        it('does not add past the 8-fault cap', () => {
            const faults: Fault[] = [];
            component.faults = faults;

            for (let i = 0; i < 9; i++) {
                component.addFault();
            }

            expect(faults.length).toBe(8);
        });
    });

    describe('mode', () => {
        it('a fresh fault (no rate fields set) is a window', () => {
            expect(component.mode({ kind: 'outage' })).toBe('window');
        });

        it('is rate once a rate field is present', () => {
            expect(component.mode({ kind: 'outage', per_hour: 1, duration_seconds: 60 })).toBe('rate');
        });

        it('onModeChange to rate clears from/to and seeds usable defaults', () => {
            const fault: Fault = { kind: 'outage', from: '2026-01-01T00:00:00Z', to: '2026-01-01T01:00:00Z' };
            let emitted = false;
            component.faultsChange.subscribe(() => (emitted = true));

            component.onModeChange(fault, 'rate');

            expect(fault.from).toBeUndefined();
            expect(fault.to).toBeUndefined();
            expect(fault.per_hour).toBe(1);
            expect(fault.duration_seconds).toBe(60);
            expect(emitted).toBe(true);
        });

        it('onModeChange to window clears per_hour/duration_seconds', () => {
            const fault: Fault = { kind: 'outage', per_hour: 2, duration_seconds: 300 };

            component.onModeChange(fault, 'window');

            expect(fault.per_hour).toBeUndefined();
            expect(fault.duration_seconds).toBeUndefined();
        });
    });

    describe('kind', () => {
        it('switching to spike sets a usable factor and drops it again when switching away', () => {
            const fault: Fault = { kind: 'outage' };

            component.onKindChange(fault, 'spike');
            expect(fault.factor).toBe(2);

            component.onKindChange(fault, 'outage');
            expect(fault.factor).toBeUndefined();
        });

        it('does not overwrite an existing factor when re-selecting spike', () => {
            const fault: Fault = { kind: 'spike', factor: 5 };

            component.onKindChange(fault, 'spike');

            expect(fault.factor).toBe(5);
        });

        it('switching to meter_exchange clears the rate fields and to, and sets a usable reset_to', () => {
            const fault: Fault = { kind: 'outage', per_hour: 1, duration_seconds: 60 };

            component.onKindChange(fault, 'meter_exchange');

            expect(fault.per_hour).toBeUndefined();
            expect(fault.duration_seconds).toBeUndefined();
            expect(fault.to).toBeUndefined();
            expect(fault.reset_to).toBe(0);
        });

        it('meter_exchange keeps from but drops to and the rate fields, coming from a dated window', () => {
            const fault: Fault = { kind: 'outage', from: '2026-01-01T00:00:00Z', to: '2026-01-01T01:00:00Z' };

            component.onKindChange(fault, 'meter_exchange');

            expect(fault.from).toBe('2026-01-01T00:00:00Z');
            expect(fault.to).toBeUndefined();
            expect(fault.per_hour).toBeUndefined();
            expect(fault.duration_seconds).toBeUndefined();
        });

        it('switching away from meter_exchange drops reset_to', () => {
            const fault: Fault = { kind: 'meter_exchange', from: '2026-01-01T00:00:00Z', reset_to: 5 };

            component.onKindChange(fault, 'outage');

            expect(fault.reset_to).toBeUndefined();
        });
    });

    describe('from/to converters', () => {
        // Both conversions run against the same local timezone (whatever the test runner
        // uses), so a round trip holds regardless of which zone that is -- see the identical
        // reasoning in the timeline editor's own spec for `at`.
        it('setFrom converts a datetime-local value to RFC3339 seconds, and localFrom is its inverse', () => {
            const fault: Fault = { kind: 'outage' };
            const local = '2026-03-02T06:00:00';

            component.setFrom(fault, local);

            expect(fault.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
            expect(component.localFrom(fault)).toBe(local);
        });

        it('setFrom deletes the property when cleared, rather than storing an empty string', () => {
            const fault: Fault = { kind: 'outage', from: '2026-03-02T06:00:00Z' };

            component.setFrom(fault, '');

            expect(fault.from).toBeUndefined();
        });

        it('setTo converts and clears the same way', () => {
            const fault: Fault = { kind: 'outage', to: '2026-03-02T09:00:00Z' };
            const local = '2026-03-02T10:00:00';

            component.setTo(fault, local);
            expect(fault.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
            expect(component.localTo(fault)).toBe(local);

            component.setTo(fault, '');
            expect(fault.to).toBeUndefined();
        });
    });

    describe('problems', () => {
        it('listProblem returns the message for a problem on the faults list itself', () => {
            setProblems([{ message: 'a channel may carry at most 8 faults, got 9', suffix: 'faults' }]);

            expect(component.listProblem()).toBe('a channel may carry at most 8 faults, got 9');
        });

        it('rowProblems matches a suffix to its row and only that row', () => {
            setProblems([
                { message: 'must lie after from', suffix: 'faults[1].to' },
                { message: 'kind problem', suffix: 'faults[0].kind' },
            ]);

            expect(component.rowProblems(1)).toEqual([{ field: 'to', message: 'must lie after from' }]);
            expect(component.rowProblems(0)).toEqual([{ field: 'kind', message: 'kind problem' }]);
            expect(component.hasRowProblem(2)).toBe(false);
        });

        it('rowProblems also matches a problem naming the whole fault, without a field suffix', () => {
            setProblems([{ message: 'carries both a window and a rate', suffix: 'faults[0]' }]);

            expect(component.rowProblems(0)).toEqual([{ field: undefined, message: 'carries both a window and a rate' }]);
        });
    });

    describe('row highlight in the DOM', () => {
        it('applies problem-row and shows the message only on the row a problem names', () => {
            component.faults = [
                { kind: 'outage', from: '2026-01-01T00:00:00Z', to: '2026-01-01T01:00:00Z' },
                { kind: 'frozen', from: '2026-01-01T00:00:00Z', to: '2026-01-01T01:00:00Z' },
            ];
            setProblems([{ message: 'must lie after from', suffix: 'faults[1].to' }]);
            fixture.detectChanges();

            const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.fault-row'));
            expect(rows.length).toBe(2);
            expect(rows[0].classList.contains('problem-row')).toBe(false);
            expect(rows[1].classList.contains('problem-row')).toBe(true);
            expect(rows[1].textContent).toContain('must lie after from');
            expect(rows[0].textContent).not.toContain('must lie after from');
        });
    });

    describe('setNumber (per_hour, duration_seconds, factor, reset_to)', () => {
        (['per_hour', 'duration_seconds', 'factor', 'reset_to'] as const).forEach((field) => {
            it(field + ': clearing the input deletes the property rather than storing null', () => {
                const fault: Fault = { kind: 'outage', [field]: 5 };

                component.setNumber(fault, field, null);

                expect(fault[field]).toBeUndefined();
            });

            it(field + ': an out-of-range value (1e999, i.e. Infinity) deletes the property', () => {
                const fault: Fault = { kind: 'outage' };

                component.setNumber(fault, field, 1e999);

                expect(fault[field]).toBeUndefined();
            });

            it(field + ': a normal value is assigned and emits', () => {
                const fault: Fault = { kind: 'outage' };
                let emitted = false;
                component.faultsChange.subscribe(() => (emitted = true));

                component.setNumber(fault, field, 2);

                expect(fault[field]).toBe(2);
                expect(emitted).toBe(true);
            });
        });
    });

    describe('clientProblems (client-side pre-checks, advisory only)', () => {
        it('flags a spike factor of exactly 1 as invisible in the series', () => {
            expect(component.clientProblems({ kind: 'spike', factor: 1 }, 0)).toEqual([
                'will be refused: a factor of 1 leaves the reading as it is, so the spike would be invisible in the series',
            ]);
            expect(component.clientProblems({ kind: 'spike', factor: 0 }, 0)).toEqual([]);
        });

        it('flags a meter_exchange reset_to below 0', () => {
            expect(component.clientProblems({ kind: 'meter_exchange', reset_to: -1 }, 0)).toEqual([
                'will be refused: reset_to must not be negative, a meter does not count below zero',
            ]);
            expect(component.clientProblems({ kind: 'meter_exchange', reset_to: 0 }, 0)).toEqual([]);
        });

        it('flags two meter_exchange faults of the same channel sharing a from', () => {
            const faults: Fault[] = [
                { kind: 'meter_exchange', from: '2026-01-01T00:00:00Z' },
                { kind: 'meter_exchange', from: '2026-01-01T00:00:00Z' },
            ];
            component.faults = faults;

            expect(component.clientProblems(faults[0], 0)).toEqual([
                'will be refused: another meter exchange on this channel already starts at the same instant',
            ]);
            expect(component.clientProblems(faults[1], 1)).toEqual([
                'will be refused: another meter exchange on this channel already starts at the same instant',
            ]);
        });

        it('does not flag a shared from against itself, or two meter exchanges at different instants', () => {
            const faults: Fault[] = [
                { kind: 'meter_exchange', from: '2026-01-01T00:00:00Z' },
                { kind: 'meter_exchange', from: '2026-01-01T01:00:00Z' },
            ];
            component.faults = faults;

            expect(component.clientProblems(faults[0], 0)).toEqual([]);
            expect(component.clientProblems(faults[1], 1)).toEqual([]);
        });

        it('flags a rate that would draw more than one occurrence per evaluation step', () => {
            component.stepSeconds = 60;

            // 61 per hour at a 60s step: 61 * 60 / 3600 = 1.0166... > 1.
            expect(component.clientProblems({ kind: 'outage', per_hour: 61, duration_seconds: 60 }, 0)).toEqual([
                'will be refused: at this rate and evaluation interval, more than one occurrence would begin per step',
            ]);
            // Boundary: exactly one occurrence per step is fine.
            expect(component.clientProblems({ kind: 'outage', per_hour: 60, duration_seconds: 60 }, 0)).toEqual([]);
        });

        it('flags a duration spanning more than 64 evaluation steps', () => {
            component.stepSeconds = 60;

            // Boundary: exactly 64 steps is fine, 64 steps and one second is not.
            expect(component.clientProblems({ kind: 'outage', per_hour: 1, duration_seconds: 64 * 60 }, 0)).toEqual([]);
            expect(component.clientProblems({ kind: 'outage', per_hour: 1, duration_seconds: 64 * 60 + 1 }, 0)).toEqual([
                'will be refused: the occurrence spans more than 64 evaluation steps',
            ]);
        });

        it('skips the rate and duration checks when stepSeconds is not set', () => {
            expect(component.clientProblems({ kind: 'outage', per_hour: 1000, duration_seconds: 100000 }, 0)).toEqual([]);
        });
    });
});
