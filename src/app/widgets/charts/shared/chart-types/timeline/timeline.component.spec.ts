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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { TimelineComponent } from './timeline.component';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';

describe('TimelineComponent', () => {
  let component: TimelineComponent;
  let fixture: ComponentFixture<TimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
      declarations: [ TimelineComponent ],
      imports: [MatSnackBarModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimelineComponent);
    component = fixture.componentInstance;
    component.height = 100;
    component.width = 100;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hands a clicked bar to the click function', () => {
    const t = Date.UTC(2026, 9, 5, 8);
    const clicked: any[] = [];
    component.OnClickFnc = (bar) => clicked.push(bar);
    component.vAxes = [{ exportName: 'e', valueName: 'v', valueAlias: 'Pump', valueType: 'int', math: '', color: '', conversions: [{ from: 1, to: 1, alias: 'An', color: '#4caf50' }] }];
    component.data = [[[[new Date(t + 3600000).toISOString(), 1], [new Date(t).toISOString(), 1]]]];
    component.ngOnChanges({ data: new SimpleChange(undefined, component.data, false) });

    component.onChartClick([{ datasetIndex: 0, index: 0 }]);
    component.onChartClick([]);

    expect(clicked).toEqual([{ seriesName: 'An', row: 'Pump', start: t, end: t + 3600000 }]);
  });
});
