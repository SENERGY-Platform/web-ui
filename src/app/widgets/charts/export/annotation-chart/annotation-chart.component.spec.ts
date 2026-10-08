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

import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnnotationChartComponent } from './annotation-chart.component';

describe('AnnotationChartComponent', () => {
    const t = (minute: number) => new Date(2026, 9, 5, 0, minute).getTime();
    const series = [
        { label: 'Temperatur', color: '#e91e63', points: [0, 1, 2, 3, 4].map((i) => ({ x: t(i), y: 20 + i })) },
        { label: 'Feuchte', color: '#2196f3', points: [0, 2, 4].map((i) => ({ x: t(i), y: 50 + i })) },
    ];
    let cd: { detectChanges: jasmine.Spy };
    let component: AnnotationChartComponent;

    const hover = (x: number | undefined) => (component.main!.options.plugins as any).annotationHover.onHover(x);

    beforeEach(() => {
        cd = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);
        TestBed.configureTestingModule({ providers: [{ provide: ChangeDetectorRef, useValue: cd }] });
        component = TestBed.runInInjectionContext(() => new AnnotationChartComponent());
        component.series = series;
        component.width = 602;
        component.height = 400;
        component.zoomStart = t(2);
        component.ngOnChanges();
    });

    it('starts with the window from zoomStart to the last value and a legend without values', () => {
        expect(component.window).toEqual({ from: t(2), to: t(4) });
        expect(component.range).toEqual({ min: t(0), max: t(4) });
        expect(component.legend).toEqual({ entries: [{ label: 'Temperatur', color: '#e91e63' }, { label: 'Feuchte', color: '#2196f3' }] });
    });

    it('shows the values at the hovered time, empty for a series without one, and the time itself', () => {
        hover(t(1));
        expect(component.legend.entries.map((e) => e.value)).toEqual(['21', '']);
        expect(component.legend.date).toBe('05.10.2026 00:01:00');
        expect(cd.detectChanges).toHaveBeenCalled();
        hover(undefined);
        expect(component.legend.entries.map((e) => e.value)).toEqual([undefined, undefined]);
        expect(component.legend.date).toBeUndefined();
    });

    it('resets window, range and legend when the series are replaced', () => {
        hover(t(2));
        component.series = [{ label: 'Druck', color: '#4caf50', points: [{ x: t(10), y: 1 }, { x: t(20), y: 2 }] }];
        component.zoomStart = undefined;
        component.ngOnChanges();
        expect(component.range).toEqual({ min: t(10), max: t(20) });
        expect(component.window).toEqual({ from: t(10), to: t(20) });
        expect(component.legend).toEqual({ entries: [{ label: 'Druck', color: '#4caf50' }] });
        // the hover callback of the new chart works on the new series
        hover(t(20));
        expect(component.legend.entries[0].value).toBe('2');
    });

    it('lays the window position out over the navigator', () => {
        const nav = component.layout!.navigator;
        expect(component.position(t(0))).toBe(nav.left);
        expect(component.position(t(4))).toBe(nav.right);
    });
});
