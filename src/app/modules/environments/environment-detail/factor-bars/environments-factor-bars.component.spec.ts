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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { EnvironmentsFactorBarsComponent } from './environments-factor-bars.component';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

describe('EnvironmentsFactorBarsComponent', () => {
    let component: EnvironmentsFactorBarsComponent;
    let fixture: ComponentFixture<EnvironmentsFactorBarsComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [EnvironmentsFactorBarsComponent],
            imports: [CommonModule, FormsModule, NoopAnimationsModule, MatFormFieldModule, MatInputModule],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsFactorBarsComponent);
        component = fixture.componentInstance;
    }));

    function setInputs(values: number[] | undefined, count: number, labels: string[]): void {
        component.values = values;
        component.count = count;
        component.labels = labels;
        component.ngOnChanges({
            values: { currentValue: values, previousValue: undefined, firstChange: true, isFirstChange: () => true },
            count: { currentValue: count, previousValue: undefined, firstChange: true, isFirstChange: () => true },
        });
    }

    // This component derives bar/index geometry from the real #track element's
    // getBoundingClientRect(); a detached test fixture has no layout (a 0x0 rect), which
    // would make every pointer interaction a no-op no matter what the math does. A stub
    // with a fixed, known size makes the geometry deterministic instead.
    function stubTrack(rect: { left: number; top: number; width: number; height: number }): void {
        component.trackRef = { nativeElement: { getBoundingClientRect: () => rect } } as unknown as typeof component.trackRef;
    }

    function pointerEvent(clientX: number, clientY: number): PointerEvent {
        return { clientX, clientY, target: {}, pointerId: 1 } as unknown as PointerEvent;
    }

    it('renders one bar per slot', () => {
        setInputs(undefined, 24, Array.from({ length: 24 }, (_, i) => String(i)));
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelectorAll('.factor-bar-col').length).toBe(24);
    });

    it('treats an undefined value array as neutral (1) for every slot', () => {
        setInputs(undefined, 7, WEEKDAY_LABELS);

        expect(component.effectiveValues).toEqual([1, 1, 1, 1, 1, 1, 1]);
        expect(component.effectiveValues.every((v) => component.isNeutral(v))).toBe(true);
    });

    it('treats a value array of the wrong length as neutral too (same convention as withFactorSet)', () => {
        setInputs([0.5, 0.5], 7, WEEKDAY_LABELS);

        expect(component.effectiveValues).toEqual([1, 1, 1, 1, 1, 1, 1]);
    });

    it('sets and emits the value of the bar under the pointer on a click', () => {
        setInputs(undefined, 7, WEEKDAY_LABELS);
        fixture.detectChanges();
        stubTrack({ left: 0, top: 0, width: 140, height: 140 });

        let emitted: number[] | undefined;
        component.valuesChange.subscribe((v) => (emitted = v));

        // 140px / 7 columns = 20px each; x=65 falls in column 3 ("Thu"). clientY at the
        // very top of the track means the top of the y-axis, i.e. yMax (here 2, the floor).
        component.onPointerDown(pointerEvent(65, 0));

        expect(component.lastIndex).toBe(3);
        expect(component.effectiveValues[3]).toBe(2);
        expect(emitted).toEqual(component.effectiveValues);
    });

    it('paints across bars while dragging (pointerdown then pointermove)', () => {
        setInputs(undefined, 7, WEEKDAY_LABELS);
        fixture.detectChanges();
        stubTrack({ left: 0, top: 0, width: 140, height: 140 });

        component.onPointerDown(pointerEvent(5, 140)); // column 0, bottom of the track = 0
        component.onPointerMove(pointerEvent(135, 140)); // column 6, bottom of the track = 0

        expect(component.effectiveValues[0]).toBe(0);
        expect(component.effectiveValues[6]).toBe(0);
        expect(component.lastIndex).toBe(6);
    });

    it('only hovers (does not paint) on pointermove without a preceding pointerdown', () => {
        setInputs(undefined, 7, WEEKDAY_LABELS);
        fixture.detectChanges();
        stubTrack({ left: 0, top: 0, width: 140, height: 140 });

        component.onPointerMove(pointerEvent(65, 0));

        expect(component.hoverIndex).toBe(3);
        expect(component.effectiveValues[3]).toBe(1); // untouched
    });

    it('stops painting once the pointer is released', () => {
        setInputs(undefined, 7, WEEKDAY_LABELS);
        fixture.detectChanges();
        stubTrack({ left: 0, top: 0, width: 140, height: 140 });

        component.onPointerDown(pointerEvent(5, 140));
        component.onPointerUp();
        component.onPointerMove(pointerEvent(135, 0)); // would set column 6 to yMax if still dragging

        expect(component.effectiveValues[6]).toBe(1); // untouched
    });

    it('the precise-value field sets the last-touched slot exactly, including fractional values a drag cannot hit', () => {
        setInputs(undefined, 24, Array.from({ length: 24 }, (_, i) => String(i)));
        fixture.detectChanges();
        stubTrack({ left: 0, top: 0, width: 240, height: 140 });

        component.onPointerDown(pointerEvent(0, 140)); // slot 0
        component.setPreciseValue(1.75);

        expect(component.effectiveValues[0]).toBe(1.75);
    });

    it('prefixes the precise-value field label when labelPrefix is set (hours), and leaves it bare otherwise (weekdays)', () => {
        setInputs(undefined, 24, Array.from({ length: 24 }, (_, i) => String(i)));
        component.labelPrefix = 'Hour';
        expect(component.labelFor(14)).toBe('Hour 14');

        setInputs(undefined, 7, WEEKDAY_LABELS);
        component.labelPrefix = '';
        expect(component.labelFor(3)).toBe('Thu');
    });
});
