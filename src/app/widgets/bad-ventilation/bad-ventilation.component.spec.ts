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

import { BadVentilationComponent } from './bad-ventilation.component';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, Subject } from 'rxjs';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { BadVentilationService } from './shared/bad-ventilation.service';
import { BaseChartDirective } from 'ng2-charts';
import { provideAppCharts } from 'src/app/core/charts/provide-app-charts';

describe('BadVentilationComponent', () => {
  let component: BadVentilationComponent;
  let fixture: ComponentFixture<BadVentilationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
        schemas: [NO_ERRORS_SCHEMA],
        imports: [MatDialogModule,
            MatSnackBarModule, BadVentilationComponent],
        providers: [provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(BadVentilationComponent);
    component = fixture.componentInstance;
    component.widget = {properties: {badVentilation: undefined}, id: '', name: '', type: '', y: 1, x: 1, w: 1, h: 1};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('BadVentilationComponent reload', () => {
  // SNRGY-4848: every reload added the curve and the ranges once more onto the previous ones.
  it('replaces curve and ranges on every reload instead of stacking them', async () => {
    const events = new Subject<string>();
    const ventilationService = {
      getVentilationOutput: () => of([
        { timestamp: '2026-10-05T08:20:00Z', window_open: false, humidity_too_fast_too_high: '' },
        { timestamp: '2026-10-05T08:10:00Z', window_open: true, humidity_too_fast_too_high: '' },
      ]),
      getDeviceCurve: () => of([{ timestamp: '2026-10-05T08:00:00Z', value: 50 }, { timestamp: '2026-10-05T08:01:00Z', value: 51 }]),
    };
    await TestBed.configureTestingModule({
        imports: [BadVentilationComponent],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
            { provide: BadVentilationService, useValue: ventilationService },
            { provide: DashboardService, useValue: { initWidgetObservable: events.asObservable() } },
        ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BadVentilationComponent);
    const component = fixture.componentInstance;
    component.widget = { id: 'w', name: '', type: '', properties: { badVentilation: {
      exportConfig: { exports: [{ id: 'exp' }] },
      deviceConfig: { exports: [{ id: 'dev' }], fields: [{ serviceId: 'svc', valuePath: 'humidity' }] },
      timeRangeConfig: { timeRange: { time: 3, level: 'h' } },
    } } } as any;
    fixture.detectChanges();

    events.next('reloadAll');
    events.next('reloadAll');

    expect(component.humidity.length).toBe(2);
    expect(component.ranges.map((r) => r.label)).toEqual(['Open Window']);
    expect(component.chart?.data.datasets.length).toBe(1);
    expect(component.chart?.data.datasets[0].data.length).toBe(2);
    expect((component.chart?.options.plugins as any).annotation.annotations.length).toBe(2);
  });
});

describe('BadVentilationComponent refresh', () => {
  const widget = { id: 'w', name: '', type: '', properties: { badVentilation: {
    exportConfig: { exports: [{ id: 'exp' }] },
    deviceConfig: { exports: [{ id: 'dev' }], fields: [{ serviceId: 'svc', valuePath: 'humidity' }] },
    timeRangeConfig: { timeRange: { time: 3, level: 'h' } },
  } } } as any;
  const results = [
    { timestamp: '2026-10-05T08:20:00Z', window_open: false, humidity_too_fast_too_high: '' },
    { timestamp: '2026-10-05T08:10:00Z', window_open: true, humidity_too_fast_too_high: '' },
  ];
  const curve = (value: number) => Array.from({ length: 30 }, (_, i) => ({ timestamp: new Date(Date.UTC(2026, 9, 5, 8, i)).toISOString(), value: value + i }));

  async function create(curves: { timestamp: string; value: number }[][]) {
    const events = new Subject<string>();
    const ventilationService = jasmine.createSpyObj('BadVentilationService', ['getVentilationOutput', 'getDeviceCurve']);
    ventilationService.getVentilationOutput.and.returnValue(of(results));
    ventilationService.getDeviceCurve.and.callFake(() => of(curves.shift()));
    await TestBed.configureTestingModule({
        schemas: [NO_ERRORS_SCHEMA],
        imports: [BaseChartDirective, BadVentilationComponent],
        providers: [
            provideAppCharts(),
            { provide: BadVentilationService, useValue: ventilationService },
            { provide: DashboardService, useValue: { initWidgetObservable: events.asObservable() } },
        ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BadVentilationComponent);
    fixture.componentInstance.widget = widget;
    fixture.detectChanges();
    return { fixture, events, ventilationService };
  }

  it('keeps the drawn chart, its zoom and the chosen pan mode when new data arrives', async () => {
    const { fixture, events } = await create([curve(50), curve(60)]);
    const component = fixture.componentInstance;
    events.next('reloadAll');
    fixture.detectChanges();
    const chart = component.humidityChart!.chart!;
    (chart.options.plugins as any).zoom.pan.enabled = true;
    chart.zoomScale('x', { min: Date.UTC(2026, 9, 5, 8, 5), max: Date.UTC(2026, 9, 5, 8, 10) });

    events.next('w');
    fixture.detectChanges();

    expect(component.humidityChart!.chart).toBe(chart);
    expect((chart.options.plugins as any).zoom.pan.enabled).toBeTrue();
    expect(chart.scales['x'].min).toBe(Date.UTC(2026, 9, 5, 8, 5));
    expect((chart.data.datasets[0].data[0] as any).y).toBe(60);
  });

  it('does not reload for another widget', async () => {
    const { fixture, events, ventilationService } = await create([curve(50), curve(60)]);
    events.next('reloadAll');
    events.next('other-widget');
    fixture.detectChanges();
    expect(ventilationService.getDeviceCurve).toHaveBeenCalledTimes(1);
    expect(ventilationService.getVentilationOutput).toHaveBeenCalledTimes(1);
  });
});
