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
import { MtxSelectModule } from '@ng-matero/extensions/select';

import {
    EnvironmentsTimelineEditorComponent,
    toLocalDateTimeInput,
    toRfc3339Seconds,
} from './environments-timeline-editor.component';
import { DatedChange } from '../../shared/environments.model';

describe('EnvironmentsTimelineEditorComponent', () => {
    let component: EnvironmentsTimelineEditorComponent;
    let fixture: ComponentFixture<EnvironmentsTimelineEditorComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsTimelineEditorComponent],
            imports: [
                FormsModule,
                NoopAnimationsModule,
                MatFormFieldModule,
                MatInputModule,
                MatIconModule,
                MatTooltipModule,
                MatButtonModule,
                MtxSelectModule,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsTimelineEditorComponent);
        component = fixture.componentInstance;
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('rows: add/remove/reorder', () => {
        it('addRow appends a row with sane defaults, mutates in place and emits', () => {
            const timeline: DatedChange[] = [];
            component.timeline = timeline;
            let emitted = false;
            component.timelineChange.subscribe(() => (emitted = true));

            component.addRow();

            expect(timeline.length).toBe(1);
            expect(timeline[0]).toEqual({ at: '', target: '', value: 0 });
            expect(emitted).toBe(true);
        });

        it('does nothing when timeline is not bound yet', () => {
            component.timeline = undefined;
            expect(() => component.addRow()).not.toThrow();
        });

        it('removeRow drops the row at the given index and emits', () => {
            const timeline: DatedChange[] = [
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
                { at: '2026-01-02T00:00:00Z', target: 'context.b', value: 2 },
            ];
            component.timeline = timeline;
            let emitted = false;
            component.timelineChange.subscribe(() => (emitted = true));

            component.removeRow(0);

            expect(timeline.map((r) => r.target)).toEqual(['context.b']);
            expect(emitted).toBe(true);
        });

        it('moveRowUp/moveRowDown reorder in place and emit', () => {
            const timeline: DatedChange[] = [
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
                { at: '2026-01-02T00:00:00Z', target: 'context.b', value: 2 },
                { at: '2026-01-03T00:00:00Z', target: 'context.c', value: 3 },
            ];
            component.timeline = timeline;
            let emitted = false;
            component.timelineChange.subscribe(() => (emitted = true));

            component.moveRowDown(0);
            expect(timeline.map((r) => r.target)).toEqual(['context.b', 'context.a', 'context.c']);

            component.moveRowUp(2);
            expect(timeline.map((r) => r.target)).toEqual(['context.b', 'context.c', 'context.a']);
            expect(emitted).toBe(true);
        });

        it('does not move a row past either end of the list', () => {
            const timeline: DatedChange[] = [
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
                { at: '2026-01-02T00:00:00Z', target: 'context.b', value: 2 },
            ];
            component.timeline = timeline;

            component.moveRowUp(0);
            expect(timeline.map((r) => r.target)).toEqual(['context.a', 'context.b']);

            component.moveRowDown(1);
            expect(timeline.map((r) => r.target)).toEqual(['context.a', 'context.b']);
        });
    });

    describe('at: datetime-local <-> RFC3339 whole seconds', () => {
        it('localValue is empty for an unset at', () => {
            expect(component.localValue({})).toBe('');
        });

        it('setAt converts a local datetime-local value to RFC3339 with a trailing Z and emits', () => {
            const row: DatedChange = {};
            component.timeline = [row];
            let emitted = false;
            component.timelineChange.subscribe(() => (emitted = true));

            component.setAt(row, '2026-06-15T08:30:45');

            expect(row.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
            expect(emitted).toBe(true);
        });

        it('setAt with an empty value clears at', () => {
            const row: DatedChange = { at: '2026-06-15T08:30:45Z' };
            component.setAt(row, '');
            expect(row.at).toBe('');
        });

        // Boundary: a datetime-local value round-trips through toRfc3339Seconds and back to the
        // exact same local wall-clock string, whole seconds included -- both conversions run
        // against the same local timezone (whatever the test runner uses), so this holds
        // regardless of which zone that is.
        it('round-trips a local datetime-local value through toRfc3339Seconds and toLocalDateTimeInput unchanged', () => {
            const local = '2026-06-15T08:30:45';
            const rfc = toRfc3339Seconds(local);
            expect(toLocalDateTimeInput(rfc)).toBe(local);
        });

        it('round-trips the last second of a minute and of a day (boundary values)', () => {
            const localMinuteBoundary = '2026-06-15T08:30:59';
            expect(toLocalDateTimeInput(toRfc3339Seconds(localMinuteBoundary))).toBe(localMinuteBoundary);

            const localDayBoundary = '2026-06-15T23:59:59';
            expect(toLocalDateTimeInput(toRfc3339Seconds(localDayBoundary))).toBe(localDayBoundary);
        });

        it('localValue formats an RFC3339 at back into the same local datetime-local string setAt produced', () => {
            const row: DatedChange = {};
            component.setAt(row, '2026-06-15T08:30:45');
            expect(component.localValue(row)).toBe('2026-06-15T08:30:45');
        });
    });

    it('renders one row per timeline entry', () => {
        component.timeline = [
            { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
            { at: '2026-01-02T00:00:00Z', target: 'context.b', value: 2 },
        ];
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.timeline-row').length).toBe(2);
    });

    it('shows the empty hint when there are no entries', () => {
        component.timeline = [];
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.empty-hint')).toBeTruthy();
    });
});
