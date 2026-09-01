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

import { EnvironmentsLiveStateTilesComponent } from './environments-live-state-tiles.component';

describe('EnvironmentsLiveStateTilesComponent', () => {
    let component: EnvironmentsLiveStateTilesComponent;
    let fixture: ComponentFixture<EnvironmentsLiveStateTilesComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsLiveStateTilesComponent],
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
        fixture = TestBed.createComponent(EnvironmentsLiveStateTilesComponent);
        component = fixture.componentInstance;
    }));

    function setRecord(record: Record<string, unknown> | undefined): void {
        component.record = record;
        component.ngOnChanges({ record: { currentValue: record, previousValue: undefined, firstChange: true, isFirstChange: () => true } });
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('builds one tile per entry of the record', () => {
        setRecord({ temperature: 20, occupied: 'yes' });
        expect(component.tiles.length).toBe(2);
    });

    it('shows the empty hint when the record has no entries', () => {
        setRecord({});
        fixture.detectChanges();
        const hint = fixture.nativeElement.querySelector('.empty-hint');
        expect(hint?.textContent).toContain(component.emptyHint);
    });

    it('starts with no tile in edit mode', () => {
        setRecord({ temperature: 20 });
        expect(component.editingKey).toBeUndefined();
    });

    it('reveals the edit field for a tile on startEdit, and only that one', () => {
        setRecord({ temperature: 20, occupied: 1 });
        component.startEdit(component.tiles[0]);
        expect(component.editingKey).toBe('temperature');
        expect(component.draftValue).toBe('20');
    });

    it('commits an edit and emits the updated record, closing the edit field', () => {
        setRecord({ temperature: 20 });
        let emitted: Record<string, unknown> | undefined;
        component.recordChange.subscribe((r) => (emitted = r));

        component.startEdit(component.tiles[0]);
        component.draftValue = '25';
        component.commitEdit();

        expect(emitted).toEqual({ temperature: 25 });
        expect(component.editingKey).toBeUndefined();
    });

    it('cancelling an edit discards the draft without emitting', () => {
        setRecord({ temperature: 20 });
        let emitted = false;
        component.recordChange.subscribe(() => (emitted = true));

        component.startEdit(component.tiles[0]);
        component.draftValue = '999';
        component.cancelEdit();

        expect(emitted).toBe(false);
        expect(component.editingKey).toBeUndefined();
    });

    it('removes a tile and emits the record without it', () => {
        setRecord({ temperature: 20, occupied: 1 });
        let emitted: Record<string, unknown> | undefined;
        component.recordChange.subscribe((r) => (emitted = r));

        component.removeTile(component.tiles[0]);

        expect(emitted).toEqual({ occupied: 1 });
    });

    it('adds a new tile with a key and value, and emits', () => {
        setRecord({});
        let emitted: Record<string, unknown> | undefined;
        component.recordChange.subscribe((r) => (emitted = r));

        component.startAdd();
        component.newKey = 'humidity';
        component.newValue = '45';
        component.commitAdd();

        expect(emitted).toEqual({ humidity: 45 });
        expect(component.addingNew).toBe(false);
    });

    it('does not add a tile with a key that already exists', () => {
        setRecord({ humidity: 45 });
        let emitted = false;
        component.recordChange.subscribe(() => (emitted = true));

        component.startAdd();
        component.newKey = 'humidity';
        component.newValue = '99';
        component.commitAdd();

        expect(emitted).toBe(false);
    });

    describe('string values (e.g. a schedule state name written into the asset state)', () => {
        it('builds an editable text tile for a string value, not a read-only one', () => {
            setRecord({ programme: 'idle' });
            expect(component.tiles[0].isText).toBe(true);
            expect(component.tiles[0].readOnly).toBe(false);
            expect(component.tiles[0].value).toBe('idle');
        });

        it('commits an edited string value and emits it as a string, not coerced to a number', () => {
            setRecord({ programme: 'idle' });
            let emitted: Record<string, unknown> | undefined;
            component.recordChange.subscribe((r) => (emitted = r));

            component.startEdit(component.tiles[0]);
            expect(component.draftIsText).toBe(true);
            component.draftValue = 'running';
            component.commitEdit();

            expect(emitted).toEqual({ programme: 'running' });
        });
    });

    describe('baseline ("was X") caption', () => {
        it('flags a tile whose current value differs from its baseline', () => {
            setRecord({ temperature: 25 });
            component.baseline = { temperature: 20 };

            expect(component.isChangedFromBaseline(component.tiles[0])).toBe(true);
            expect(component.baselineFor(component.tiles[0])).toBe('20');
        });

        it('does not flag a tile still at its baseline value', () => {
            setRecord({ temperature: 20 });
            component.baseline = { temperature: 20 };

            expect(component.isChangedFromBaseline(component.tiles[0])).toBe(false);
        });

        it('does not flag a tile with no baseline entry (e.g. one added here)', () => {
            setRecord({ humidity: 45 });
            component.baseline = { temperature: 20 };

            expect(component.isChangedFromBaseline(component.tiles[0])).toBe(false);
        });
    });

    describe('external record replacement while a tile is being edited (e.g. a live-state poll)', () => {
        // A poll refreshes untouched tiles by replacing the whole record every 10s (see
        // environment-detail's applyLiveStatePoll) -- closing the edit field on every such
        // refresh would make editing effectively impossible while polling is active.
        it('keeps the tile open for editing across an unrelated external record replacement', () => {
            setRecord({ temperature: 20, occupied: 1 });
            component.startEdit(component.tiles[0]);
            expect(component.editingKey).toBe('temperature');

            setRecord({ temperature: 21, occupied: 1 }); // e.g. a poll updating the untouched "temperature" tile

            expect(component.editingKey).toBe('temperature');
        });

        it('closes the edit field only once its own tile actually disappears from the new record', () => {
            setRecord({ temperature: 20, occupied: 1 });
            component.startEdit(component.tiles[0]);
            expect(component.editingKey).toBe('temperature');

            setRecord({ occupied: 1 }); // "temperature" row is gone

            expect(component.editingKey).toBeUndefined();
        });
    });

    describe('locked tiles (driven by the timeline)', () => {
        it('marks a tile locked when its key is in lockedKeys', () => {
            component.lockedKeys = new Set(['energy_price']);
            setRecord({ energy_price: 0.3, other: 1 });

            expect(component.tiles.find((t) => t.key === 'energy_price')?.locked).toBe(true);
            expect(component.tiles.find((t) => t.key === 'other')?.locked).toBe(false);
        });

        it('startEdit is a no-op on a locked tile', () => {
            component.lockedKeys = new Set(['energy_price']);
            setRecord({ energy_price: 0.3 });

            component.startEdit(component.tiles[0]);

            expect(component.editingKey).toBeUndefined();
        });

        it('removeTile is a no-op on a locked tile, and does not emit', () => {
            component.lockedKeys = new Set(['energy_price']);
            setRecord({ energy_price: 0.3 });
            let emitted = false;
            component.recordChange.subscribe(() => (emitted = true));

            component.removeTile(component.tiles[0]);

            expect(component.tiles.length).toBe(1);
            expect(emitted).toBe(false);
        });

        it('hides the edit/remove buttons for a locked tile in the rendered template', () => {
            component.lockedKeys = new Set(['energy_price']);
            setRecord({ energy_price: 0.3, other: 1 });
            fixture.detectChanges();

            const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.live-tile'));
            const lockedRow = rows.find((r) => r.querySelector('.live-tile-key')?.textContent === 'energy_price');
            const unlockedRow = rows.find((r) => r.querySelector('.live-tile-key')?.textContent === 'other');

            expect(lockedRow?.querySelector('.live-tile-actions')).toBeFalsy();
            expect(unlockedRow?.querySelector('.live-tile-actions')).toBeTruthy();
        });
    });

    describe('non-primitive values', () => {
        it('shows a boolean value as a read-only JSON preview instead of stringifying it lossily', () => {
            setRecord({ occupied: false });
            expect(component.tiles[0].readOnly).toBe(true);
            expect(component.tiles[0].value).toBe('false');
        });

        it('passes a read-only value through emit unchanged when another tile is added alongside it', () => {
            setRecord({ occupied: false });
            let emitted: Record<string, unknown> | undefined;
            component.recordChange.subscribe((r) => (emitted = r));

            component.startAdd();
            component.newKey = 'label';
            component.newValue = 'ok';
            component.newIsText = true;
            component.commitAdd();

            expect(emitted).toEqual({ occupied: false, label: 'ok' });
        });
    });
});
