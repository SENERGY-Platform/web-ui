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
import { FormControl, FormGroup } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DeploymentsConfigTimeEventComponent } from './deployments-config-time-event.component';

/* The deploy dialog shows a timer expression instead of asking for a time (SNRGY-3350). */
describe('DeploymentsConfigTimeEventComponent', () => {
    function render(type: string, time: string): HTMLElement {
        TestBed.configureTestingModule({ imports: [DeploymentsConfigTimeEventComponent, NoopAnimationsModule] });
        const fixture = TestBed.createComponent(DeploymentsConfigTimeEventComponent);
        const units = new FormGroup({ years: new FormControl(0), months: new FormControl(0), days: new FormControl(0), hours: new FormControl(0), minutes: new FormControl(0), seconds: new FormControl(0) });
        fixture.componentInstance.time_event = new FormGroup({ type: new FormControl(type), time: new FormControl(time), durationUnits: units });
        fixture.detectChanges();
        return fixture.nativeElement;
    }

    it('names the expression of a duration and offers no inputs', () => {
        const el = render('timeDuration', '${timer}');
        expect(el.textContent).toContain('The time is the expression ${timer}');
        expect(el.querySelectorAll('input').length).toBe(0);
    });

    it('asks for the units of a fixed duration', () => {
        const el = render('timeDuration', 'PT5S');
        expect(el.textContent).not.toContain('The time is the expression');
        expect(el.querySelectorAll('input').length).toBe(6);
    });
});
