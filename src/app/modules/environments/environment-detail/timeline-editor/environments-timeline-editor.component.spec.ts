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
import { MatPaginatorModule } from '@angular/material/paginator';
import { MtxSelectModule } from '@ng-matero/extensions/select';

import { EnvironmentsTimelineEditorComponent } from './environments-timeline-editor.component';
import { toLocalDateTimeInput, toRfc3339Seconds } from '../../shared/environments-datetime';
import { DatedChange } from '../../shared/environments.model';
import { NodeProblem } from '../../shared/environments-path';

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
                MatPaginatorModule,
                MtxSelectModule,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsTimelineEditorComponent);
        component = fixture.componentInstance;
    }));

    /** Assigns `problems` and drives ngOnChanges the way a real parent binding would, since a direct property assignment on a fixture created without a host template does not. */
    function setProblems(problems: NodeProblem[]): void {
        component.problems = problems;
        component.ngOnChanges({ problems: { currentValue: problems, previousValue: undefined, firstChange: true, isFirstChange: () => true } });
    }

    /** Assigns `timeline` and drives ngOnChanges, same rationale as setProblems -- also what (re)builds visibleRows/rowViews for the template. */
    function bindTimeline(rows: DatedChange[]): void {
        component.timeline = rows;
        component.ngOnChanges({ timeline: { currentValue: rows, previousValue: undefined, firstChange: true, isFirstChange: () => true } });
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('rows: add/remove/reorder', () => {
        it('addRow appends a row with sane defaults, mutates in place and emits both signals', () => {
            const timeline: DatedChange[] = [];
            component.timeline = timeline;
            let emitted = false;
            let restructured = false;
            component.timelineChange.subscribe(() => (emitted = true));
            component.timelineRestructured.subscribe(() => (restructured = true));

            component.addRow();

            expect(timeline.length).toBe(1);
            expect(timeline[0]).toEqual({ at: '', target: '', value: 0 });
            expect(emitted).toBe(true);
            expect(restructured).toBe(true);
        });

        it('does nothing when timeline is not bound yet', () => {
            component.timeline = undefined;
            expect(() => component.addRow()).not.toThrow();
        });

        it('removeRow drops the row at the given index and emits both signals', () => {
            const timeline: DatedChange[] = [
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
                { at: '2026-01-02T00:00:00Z', target: 'context.b', value: 2 },
            ];
            component.timeline = timeline;
            let emitted = false;
            let restructured = false;
            component.timelineChange.subscribe(() => (emitted = true));
            component.timelineRestructured.subscribe(() => (restructured = true));

            component.removeRow(0);

            expect(timeline.map((r) => r.target)).toEqual(['context.b']);
            expect(emitted).toBe(true);
            expect(restructured).toBe(true);
        });

        it('moveRowUp/moveRowDown reorder in place and emit both signals', () => {
            const timeline: DatedChange[] = [
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
                { at: '2026-01-02T00:00:00Z', target: 'context.b', value: 2 },
                { at: '2026-01-03T00:00:00Z', target: 'context.c', value: 3 },
            ];
            component.timeline = timeline;
            let emitted = false;
            let restructured = false;
            component.timelineChange.subscribe(() => (emitted = true));
            component.timelineRestructured.subscribe(() => (restructured = true));

            component.moveRowDown(0);
            expect(timeline.map((r) => r.target)).toEqual(['context.b', 'context.a', 'context.c']);

            component.moveRowUp(2);
            expect(timeline.map((r) => r.target)).toEqual(['context.b', 'context.c', 'context.a']);
            expect(emitted).toBe(true);
            expect(restructured).toBe(true);
        });

        it('does not move a row past either end of the list, and does not emit timelineRestructured', () => {
            const timeline: DatedChange[] = [
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
                { at: '2026-01-02T00:00:00Z', target: 'context.b', value: 2 },
            ];
            component.timeline = timeline;
            let restructured = false;
            component.timelineRestructured.subscribe(() => (restructured = true));

            component.moveRowUp(0);
            expect(timeline.map((r) => r.target)).toEqual(['context.a', 'context.b']);

            component.moveRowDown(1);
            expect(timeline.map((r) => r.target)).toEqual(['context.a', 'context.b']);
            expect(restructured).toBe(false);
        });
    });

    describe('at: datetime-local <-> RFC3339 whole seconds', () => {
        it('localValue is empty for an unset at', () => {
            expect(component.localValue({})).toBe('');
        });

        it('setAt converts a local datetime-local value to RFC3339 with a trailing Z, emits timelineChange only', () => {
            const row: DatedChange = {};
            component.timeline = [row];
            let emitted = false;
            let restructured = false;
            component.timelineChange.subscribe(() => (emitted = true));
            component.timelineRestructured.subscribe(() => (restructured = true));

            component.setAt(row, '2026-06-15T08:30:45');

            expect(row.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
            expect(emitted).toBe(true);
            expect(restructured).toBe(false);
        });

        it('onFieldChange (target/value edits) emits timelineChange only', () => {
            let emitted = false;
            let restructured = false;
            component.timelineChange.subscribe(() => (emitted = true));
            component.timelineRestructured.subscribe(() => (restructured = true));

            component.onFieldChange();

            expect(emitted).toBe(true);
            expect(restructured).toBe(false);
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
        bindTimeline([
            { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
            { at: '2026-01-02T00:00:00Z', target: 'context.b', value: 2 },
        ]);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.timeline-row').length).toBe(2);
    });

    it('shows the empty hint when there are no entries', () => {
        component.timeline = [];
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.empty-hint')).toBeTruthy();
    });

    describe('problems', () => {
        it('listProblem returns the message for a problem on the timeline list itself', () => {
            setProblems([{ message: 'a timeline may carry at most 100 entries, got 101', suffix: 'timeline' }]);

            expect(component.listProblem()).toBe('a timeline may carry at most 100 entries, got 101');
        });

        it('rowProblems matches a suffix to its row and only that row', () => {
            setProblems([
                { message: 'a time is required', suffix: 'timeline[1].at' },
                { message: 'target problem', suffix: 'timeline[0].target' },
            ]);

            expect(component.rowProblems(1)).toEqual([{ field: 'at', message: 'a time is required' }]);
            expect(component.rowProblems(0)).toEqual([{ field: 'target', message: 'target problem' }]);
            expect(component.hasRowProblem(2)).toBe(false);
        });

        it('rowProblems also matches a problem naming the whole entry, without a field suffix', () => {
            setProblems([{ message: 'already changes this target at that instant', suffix: 'timeline[0]' }]);

            expect(component.rowProblems(0)).toEqual([{ field: undefined, message: 'already changes this target at that instant' }]);
        });

        it('ignores problems for other suffixes, such as a fault or a zone', () => {
            setProblems([
                { message: 'must lie after from', suffix: 'faults[0].to' },
                { message: 'must not be empty', suffix: 'zones[0].name' },
            ]);

            expect(component.rowProblems(0)).toEqual([]);
            expect(component.listProblem()).toBeUndefined();
        });
    });

    describe('row highlight in the DOM', () => {
        it('applies problem-row and shows the message only on the row a problem names', () => {
            component.timeline = [
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
                { at: '2026-01-02T00:00:00Z', target: 'context.b', value: 2 },
            ];
            setProblems([{ message: 'a time is required', suffix: 'timeline[1].at' }]);
            fixture.detectChanges();

            const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.timeline-row'));
            expect(rows.length).toBe(2);
            expect(rows[0].classList.contains('problem-row')).toBe(false);
            expect(rows[1].classList.contains('problem-row')).toBe(true);
            expect(rows[1].textContent).toContain('a time is required');
            expect(rows[0].textContent).not.toContain('a time is required');
        });
    });

    describe('clientProblems (client-side pre-check, advisory only)', () => {
        it('does not flag a freshly added row, which starts with both at and target empty', () => {
            const timeline: DatedChange[] = [];
            component.timeline = timeline;

            component.addRow();

            expect(component.clientProblems(timeline[0], 0)).toEqual([]);
            expect(component.hasRowProblem(0)).toBe(false);
        });

        it('flags a later row that changes the same target at the same instant as an earlier one, but not the earlier row itself, once onFieldChange has recomputed the cache', () => {
            const timeline: DatedChange[] = [
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 2 },
            ];
            component.timeline = timeline;

            component.onFieldChange();

            expect(component.clientProblems(timeline[0], 0)).toEqual([]);
            expect(component.clientProblems(timeline[1], 1)).toEqual(['will be refused: already changes this target at that instant']);
            expect(component.hasRowProblem(1)).toBe(true);
        });

        it('detects a duplicate introduced through a timeline input change, via ngOnChanges, without a field edit', () => {
            const timeline: DatedChange[] = [
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 2 },
            ];
            component.timeline = timeline;

            component.ngOnChanges({ timeline: { currentValue: timeline, previousValue: undefined, firstChange: true, isFirstChange: () => true } });

            expect(component.clientProblems(timeline[1], 1)).toEqual(['will be refused: already changes this target at that instant']);
        });

        it('does not flag rows with different targets or different instants', () => {
            const timeline: DatedChange[] = [
                { at: '2026-01-01T00:00:00Z', target: 'context.a', value: 1 },
                { at: '2026-01-01T00:00:00Z', target: 'context.b', value: 2 },
                { at: '2026-01-02T00:00:00Z', target: 'context.a', value: 3 },
            ];
            component.timeline = timeline;

            component.onFieldChange();

            expect(component.clientProblems(timeline[1], 1)).toEqual([]);
            expect(component.clientProblems(timeline[2], 2)).toEqual([]);
        });

        it('never flags a row with an empty at or target, even if another row shares the other field', () => {
            const timeline: DatedChange[] = [
                { at: '', target: 'context.a', value: 1 },
                { at: '', target: 'context.a', value: 2 },
            ];
            component.timeline = timeline;

            component.onFieldChange();

            expect(component.clientProblems(timeline[0], 0)).toEqual([]);
            expect(component.clientProblems(timeline[1], 1)).toEqual([]);
        });
    });

    describe('pagination (SNRGY-4739: a large timeline only renders its current page)', () => {
        /** `count` bare rows, each with a distinct at so none of them collide as duplicates. */
        function buildRows(count: number): DatedChange[] {
            const rows: DatedChange[] = [];
            for (let i = 0; i < count; i++) {
                rows.push({ at: '2026-01-01T00:00:' + String(i % 60).padStart(2, '0') + 'Z', target: 'context.k' + i, value: i });
            }
            return rows;
        }

        it('defaults to page size 50 and shows only the first page', () => {
            bindTimeline(buildRows(120));

            expect(component.pageSize).toBe(50);
            expect(component.pageIndex).toBe(0);
            expect(component.visibleRows.length).toBe(50);
            expect(component.visibleRows[0].index).toBe(0);
            expect(component.visibleRows[49].index).toBe(49);
        });

        it('onPage moves to the requested page and slice', () => {
            bindTimeline(buildRows(120));

            component.onPage({ pageIndex: 2, pageSize: 50, length: 120 });

            expect(component.pageIndex).toBe(2);
            expect(component.visibleRows.length).toBe(20); // 120 - 2*50
            expect(component.visibleRows[0].index).toBe(100);
        });

        // pageIndex/pageSize are inputs the parent restores after a save reload (see the
        // component's class comment) -- the *Change outputs are how a UI-driven page/size
        // change reaches the parent to be kept.
        it('emits pageIndexChange and pageSizeChange only when the value actually moves', () => {
            bindTimeline(buildRows(120));
            const indexEvents: number[] = [];
            const sizeEvents: number[] = [];
            component.pageIndexChange.subscribe((i) => indexEvents.push(i));
            component.pageSizeChange.subscribe((s) => sizeEvents.push(s));

            component.onPage({ pageIndex: 1, pageSize: 100, length: 120 });
            component.onPage({ pageIndex: 1, pageSize: 100, length: 120 }); // same values again

            expect(indexEvents).toEqual([1]);
            expect(sizeEvents).toEqual([100]);
        });

        it('keeps the current page across a field edit', () => {
            bindTimeline(buildRows(120));
            component.onPage({ pageIndex: 1, pageSize: 50, length: 120 });

            component.onFieldChange(); // e.g. a target/value ngModelChange elsewhere on the page

            expect(component.pageIndex).toBe(1);
            expect(component.visibleRows[0].index).toBe(50);
        });

        it('a newly added row jumps to the page it lands on', () => {
            bindTimeline(buildRows(50)); // exactly fills page 0

            component.addRow();

            expect(component.timeline!.length).toBe(51);
            expect(component.pageIndex).toBe(1); // index 50 -> page 1 at page size 50
            expect(component.visibleRows.map((rv) => rv.index)).toEqual([50]);
            expect(component.visibleRows[0].row.target).toBe('');
        });

        it('removing the only row on the last page clamps back to the new last page', () => {
            bindTimeline(buildRows(51)); // page 0: 0..49, page 1: just row 50
            component.onPage({ pageIndex: 1, pageSize: 50, length: 51 });

            component.removeRow(50);

            expect(component.pageIndex).toBe(0); // page 1 no longer exists
            expect(component.visibleRows.length).toBe(50);
        });

        it('a problem on a row outside the current page is still counted and reachable via jumpToFirstProblem', () => {
            bindTimeline(buildRows(120));
            setProblems([{ message: 'a time is required', suffix: 'timeline[105].at' }]); // page 2

            expect(component.pageIndex).toBe(0);
            expect(component.problemRowIndexes).toEqual([105]);
            expect(component.visibleRows.some((rv) => rv.index === 105)).toBe(false); // not visible yet

            component.jumpToFirstProblem();

            expect(component.pageIndex).toBe(2);
            expect(component.visibleRows.some((rv) => rv.index === 105)).toBe(true);
            const jumped = component.visibleRows.find((rv) => rv.index === 105)!;
            expect(jumped.hasProblem).toBe(true);
            expect(jumped.problems).toEqual([{ field: 'at', message: 'a time is required' }]);
        });

        it('jumpToFirstProblem does nothing when there is no problem', () => {
            bindTimeline(buildRows(120));

            component.jumpToFirstProblem();

            expect(component.pageIndex).toBe(0);
        });

        // BLOCKING-adjacent regression: a row's absolute `timeline` index (what moveRow/removeRow
        // and the server's index-based problem paths key on) must stay correct once the row has
        // crossed from one page to the next, not just while it stays on the same page.
        it('index paths stay correct after a move across a page boundary, and the page follows the moved row', () => {
            const rows = buildRows(60);
            const movedRow = rows[49]; // last row of page 0 (page size 50)
            bindTimeline(rows);

            component.moveRowDown(49); // swaps with row 50, crossing into page 1

            expect(component.timeline![50]).toBe(movedRow);
            expect(component.pageIndex).toBe(1); // the moved row's own row stays visible, not page 0
            expect(component.visibleRows[0].row).toBe(movedRow);
            expect(component.visibleRows[0].index).toBe(50);
        });

        // Reviewer-requested regression: without following the page, a user moving the last row
        // of a page down would see it vanish from view instead of watching it move.
        it('moving the last row of a page down keeps it visible on the next page', () => {
            bindTimeline(buildRows(51)); // page 0: indexes 0..49, page 1: just index 50

            component.moveRowDown(49);

            expect(component.pageIndex).toBe(1);
            expect(component.visibleRows.map((rv) => rv.index)).toEqual([50]);
        });

        it('moving a row up across a page boundary also follows it back', () => {
            bindTimeline(buildRows(51));
            component.onPage({ pageIndex: 1, pageSize: 50, length: 51 });

            component.moveRowUp(50); // swaps with row 49, crossing back into page 0

            expect(component.pageIndex).toBe(0);
            expect(component.visibleRows.some((rv) => rv.index === 49)).toBe(true);
        });

        it('renders a mat-paginator and only the current page\'s rows in the DOM', () => {
            bindTimeline(buildRows(120));
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelectorAll('.timeline-row').length).toBe(50);
            expect(fixture.nativeElement.querySelector('mat-paginator')).toBeTruthy();
        });

        it('shows the problem-count summary with a working jump-to-first button', () => {
            bindTimeline(buildRows(120));
            setProblems([{ message: 'a time is required', suffix: 'timeline[105].at' }]);
            fixture.detectChanges();

            const summary = fixture.nativeElement.querySelector('.timeline-problems-summary');
            expect(summary?.textContent).toContain('1 row with a problem');

            (summary!.querySelector('button') as HTMLButtonElement).click();
            fixture.detectChanges();

            expect(component.pageIndex).toBe(2);
        });

        it('does not show the problem-count summary when nothing has a problem', () => {
            bindTimeline(buildRows(120));
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('.timeline-problems-summary')).toBeFalsy();
        });
    });
});
