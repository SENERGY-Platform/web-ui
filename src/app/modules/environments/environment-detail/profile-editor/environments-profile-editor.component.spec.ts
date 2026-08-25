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
import { MatCheckboxModule } from '@angular/material/checkbox';

import { EnvironmentsProfileEditorComponent } from './environments-profile-editor.component';
import { ProfileSource } from '../../shared/environments.model';

describe('EnvironmentsProfileEditorComponent', () => {
    let component: EnvironmentsProfileEditorComponent;
    let fixture: ComponentFixture<EnvironmentsProfileEditorComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [EnvironmentsProfileEditorComponent],
            imports: [FormsModule, NoopAnimationsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTooltipModule, MatCheckboxModule],
        }).compileComponents();
        fixture = TestBed.createComponent(EnvironmentsProfileEditorComponent);
        component = fixture.componentInstance;
    }));

    function setProfile(profile: ProfileSource | undefined): void {
        component.profile = profile;
        component.ngOnChanges({ profile: { currentValue: profile, previousValue: undefined, firstChange: true, isFirstChange: () => true } });
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('has no chart before a profile is bound', () => {
        expect(component.chart).toBeUndefined();
    });

    it('builds a preview chart once a profile is bound', () => {
        setProfile({ base: 10 });
        expect(component.chart).toBeDefined();
        expect((component.chart!.series[0].data as number[]).length).toBe(24);
    });

    it('rebuilds the chart and emits on a field change', () => {
        setProfile({ base: 10 });
        let emitted = false;
        component.profileChange.subscribe(() => (emitted = true));

        component.profile!.base = 20;
        component.onFieldChange();

        expect(emitted).toBe(true);
        expect((component.chart!.series[0].data as number[])[0]).toBe(20);
    });

    it('materializes a neutral 24-length hour_factors array on the first factor edit', () => {
        setProfile({ base: 10 });
        component.setHourFactor(5, 2);
        expect(component.profile!.hour_factors!.length).toBe(24);
        expect(component.profile!.hour_factors![5]).toBe(2);
        expect(component.profile!.hour_factors![0]).toBe(1);
    });

    it('materializes a neutral 7-length weekday_factors array on the first factor edit', () => {
        setProfile({ base: 10 });
        component.setWeekdayFactor(5, 0);
        expect(component.profile!.weekday_factors!.length).toBe(7);
        expect(component.profile!.weekday_factors![5]).toBe(0);
    });
});
