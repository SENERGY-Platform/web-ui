/*
 * Copyright 2025 InfAI (CC SES)
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

import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AnomalyComponent } from './anomaly.component';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AnomalyResultModel, AnomalyWidgetProperties } from './shared/anomaly.model';
import { of, Subject } from 'rxjs';
import { AnomalyService } from './shared/anomaly.service';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';

describe('AnomalyComponent', () => {
    let component: AnomalyComponent;
    let fixture: ComponentFixture<AnomalyComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [AnomalyComponent],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()]
})
            .compileComponents();

        fixture = TestBed.createComponent(AnomalyComponent);
        component = fixture.componentInstance;
        component.widget = {properties: {measurement: undefined, anomalyDetection: {export: '1234'} as AnomalyWidgetProperties}, id: '1234', name: '', type: '', y: 1, x: 1, w: 1, h: 1};
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('AnomalyComponent init phase', () => {
    // With the last anomaly finally read (SNRGY-4848), the init phase flag must also go back once the phase is over.
    it('shows the data again once the operator has left its init phase', async () => {
        const events = new Subject<string>();
        const lastAnomalies: (Partial<AnomalyResultModel> | null)[] = [{ initial_phase: 'learning, 3 of 10 days' }, { initial_phase: '' }, { initial_phase: 'again' }, null];
        const anomalyService = { getAnomaly: () => of(lastAnomalies.shift()), getAnomalyHistory: () => of({}) };
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [AnomalyComponent],
            providers: [
                { provide: AnomalyService, useValue: anomalyService },
                { provide: DashboardService, useValue: { initWidgetObservable: events.asObservable() } },
            ],
        }).compileComponents();
        const fixture = TestBed.createComponent(AnomalyComponent);
        const component = fixture.componentInstance;
        component.widget = { properties: { anomalyDetection: { export: 'exp', timeRangeConfig: { timeRange: { time: 1, level: 'h' } } } as AnomalyWidgetProperties }, id: 'w', name: '', type: '' };
        fixture.detectChanges();

        const states: [boolean, string][] = [];
        for (let i = 0; i < 4; i++) {
            events.next('w');
            states.push([component.operatorIsInitPhase, component.initialPhaseMsg]);
        }

        expect(states.map((s) => s[0])).toEqual([true, false, true, false]);
        expect(states[0][1]).toBe('learning, 3 of 10 days');
        expect(component.lastAnomaly).toBeUndefined();
    });
});
