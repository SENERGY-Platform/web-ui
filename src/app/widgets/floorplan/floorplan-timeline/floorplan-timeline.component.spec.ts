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

import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FloorplanTimelineComponent } from './floorplan-timeline.component';
import { HistoryFrame } from '../shared/floorplan-history';

describe('FloorplanTimelineComponent', () => {
    let component: FloorplanTimelineComponent;
    let fixture: ComponentFixture<FloorplanTimelineComponent>;
    let moments: number[];

    const frames = (count: number): HistoryFrame[] =>
        Array.from({ length: count }, (_, i) => ({ time: new Date(i * 60000), values: [] }));

    /** the widget holds the moment, so the spec plays that part and hands the new index back */
    const show = (index: number) => {
        moments.push(index);
        fixture.componentRef.setInput('index', index);
        fixture.detectChanges();
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [FloorplanTimelineComponent],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(FloorplanTimelineComponent);
        component = fixture.componentInstance;
        moments = [];
        component.moment.subscribe(show);
        fixture.componentRef.setInput('frames', frames(4));
        fixture.componentRef.setInput('index', 3);
        fixture.detectChanges();
    });

    it('names the time of the moment it shows', () => {
        expect(component.current).toEqual(new Date(3 * 60000));
    });

    it('plays the moments one after another and stops at the last one', fakeAsync(() => {
        component.toggle();
        tick(10000);

        // it starts over from the end, so the run is 0, 1, 2, 3
        expect(moments).toEqual([0, 1, 2, 3]);
        expect(component.playing()).toBeFalse();
    }));

    it('plays faster at a higher speed', fakeAsync(() => {
        component.setSpeed(2);
        component.toggle();
        tick(300);

        // at the plain speed one moment lasts 500 ms, so only the first would have been shown by now
        expect(moments).toEqual([0, 1, 2]);
        component.stop();
    }));

    it('stops where the viewer puts it', fakeAsync(() => {
        component.toggle();
        tick(600);
        component.pick(1);
        const seen = moments.length;
        tick(10000);

        expect(component.playing()).toBeFalse();
        expect(moments.length).toBe(seen);
        expect(moments[seen - 1]).toBe(1);
    }));

    it('does not play a replay of a single moment', fakeAsync(() => {
        fixture.componentRef.setInput('frames', frames(1));
        fixture.detectChanges();

        component.toggle();
        expect(component.playing()).toBeFalse();

        tick(10000);

        expect(moments).toEqual([]);
    }));
});
