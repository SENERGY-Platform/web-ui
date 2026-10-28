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

import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAppCharts } from '../../../../core/charts/provide-app-charts';
import { AnnotationChartComponent } from './annotation-chart.component';

const t = (minute: number) => new Date(2026, 9, 5, 0, minute).getTime();

@Component({
    selector: 'senergy-annotation-host',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AnnotationChartComponent],
    template: '<senergy-annotation-chart [series]="series" [width]="602" [height]="400" [zoomStart]="zoomStart"></senergy-annotation-chart>',
})
class OnPushHostComponent {
    series = [
        { label: 'Temperatur', color: '#e91e63', points: [0, 1, 2, 3, 4].map((i) => ({ x: t(i), y: 20 + i })) },
    ];
    readonly zoomStart = t(2);
}

// the chart sits under the OnPush export widget, so nothing but the chart itself marks its parent for check
describe('AnnotationChartComponent under an OnPush parent', () => {
    beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideAppCharts()] }));

    async function render() {
        const fixture = TestBed.createComponent(OnPushHostComponent);
        await fixture.whenStable();
        const component = fixture.debugElement.query(By.directive(AnnotationChartComponent)).componentInstance as AnnotationChartComponent;
        const legend = () => (fixture.nativeElement.querySelector('.legend') as HTMLElement).textContent ?? '';
        return { fixture, component, legend };
    }

    it('repaints the legend when a navigator drag ends', async () => {
        const { fixture, component, legend } = await render();
        (component.main!.options.plugins as any).annotationHover.onHover(t(1));
        expect(legend()).toContain('05.10.2026');

        component.startDrag(new PointerEvent('pointerdown', { clientX: 100 }), 'both');
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 110 }));
        window.dispatchEvent(new PointerEvent('pointerup'));
        await fixture.whenStable();

        expect(legend()).not.toContain('05.10.2026');
    });

    // Angular drops a text node of only &nbsp; that directly follows a control-flow block
    it('keeps the gap between a hovered value and the next series', async () => {
        const fixture = TestBed.createComponent(OnPushHostComponent);
        fixture.componentInstance.series = [
            { label: 'Temperatur', color: '#e91e63', points: [0, 1, 2].map((i) => ({ x: t(i), y: 20 + i })) },
            { label: 'Feuchte', color: '#2196f3', points: [0, 1, 2].map((i) => ({ x: t(i), y: 50 + i })) },
        ];
        await fixture.whenStable();
        const component = fixture.debugElement.query(By.directive(AnnotationChartComponent)).componentInstance as AnnotationChartComponent;
        (component.main!.options.plugins as any).annotationHover.onHover(t(1));
        await fixture.whenStable();

        const text = (fixture.nativeElement.querySelector('.legend') as HTMLElement).textContent!.replace(/\u00a0/g, ' ');
        expect(text).toContain(': 21  Feuchte');
    });

    it('stops listening to the window when a drag ends', async () => {
        const { fixture, component, legend } = await render();
        component.startDrag(new PointerEvent('pointerdown', { clientX: 100 }), 'both');
        window.dispatchEvent(new PointerEvent('pointerup'));
        await fixture.whenStable();
        const before = component.window;
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 140 }));
        expect(component.window).toEqual(before);
        expect(legend()).not.toContain('|');
    });
});
