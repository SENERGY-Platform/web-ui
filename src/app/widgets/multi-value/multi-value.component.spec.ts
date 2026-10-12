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

import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Subject } from 'rxjs';
import { MultiValueComponent } from './multi-value.component';
import { MultiValueService } from './shared/multi-value.service';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';

describe('MultiValueComponent', () => {
    let initWidget: Subject<string>;
    let answers: { widget: WidgetModel; answer: Subject<WidgetModel> }[];

    const widgetNamed = (name: string) => ({ id: 'w', name, type: 'multi_value', properties: { order: 0, multivaluemeasurements: [] } }) as unknown as WidgetModel;

    function create(widget: WidgetModel) {
        initWidget = new Subject<string>();
        answers = [];
        TestBed.configureTestingModule({
            providers: [
                { provide: DashboardService, useValue: { initWidgetObservable: initWidget.asObservable() } },
                {
                    provide: MultiValueService, useValue: {
                        getValues: (w: WidgetModel) => {
                            const answer = new Subject<WidgetModel>();
                            answers.push({ widget: w, answer });
                            return answer.asObservable();
                        },
                    },
                },
            ],
        });
        TestBed.overrideComponent(MultiValueComponent, { set: { template: '', imports: [], schemas: [NO_ERRORS_SCHEMA] } });
        const fixture = TestBed.createComponent(MultiValueComponent);
        fixture.componentRef.setInput('widget', widget);
        fixture.detectChanges();
        return fixture;
    }

    it('keeps the widget the dashboard handed over when an answer for a replaced widget arrives later', () => {
        const a = widgetNamed('A');
        const b = widgetNamed('B');
        const fixture = create(a);
        initWidget.next('w');
        fixture.componentRef.setInput('widget', b);
        initWidget.next('w');
        expect(answers.map(r => r.widget)).toEqual([a, b]);
        answers[1].answer.next(b);
        answers[0].answer.next(a);
        expect(fixture.componentInstance.widget).toBe(b);
    });

    it('does not show the answer for a replaced widget while the current one is loading', () => {
        const a = widgetNamed('A');
        const b = widgetNamed('B');
        const fixture = create(a);
        initWidget.next('w');
        fixture.componentRef.setInput('widget', b);
        initWidget.next('w');
        answers[0].answer.next(a);
        expect(fixture.componentInstance.widget).toBe(b);
        expect(fixture.componentInstance.dataReady).toBeFalse();
        answers[1].answer.next(b);
        expect(fixture.componentInstance.dataReady).toBeTrue();
    });

    it('shows the answer for the current widget', () => {
        const a = widgetNamed('A');
        const fixture = create(a);
        initWidget.next('w');
        answers[0].answer.next(a);
        expect(fixture.componentInstance.widget).toBe(a);
        expect(fixture.componentInstance.dataReady).toBeTrue();
    });
});
