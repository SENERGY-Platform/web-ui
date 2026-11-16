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
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { LeakageDetectionService } from './leakage-detection.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { ExportDataService } from '../../shared/export-data.service';

describe('LeakageDetectionService', () => {
  let service: LeakageDetectionService;
  let exportData: jasmine.SpyObj<ExportDataService>;

  const pairs = (value: string, lastConsumptions: string) => [
    { time: '2026-11-16T10:00:00Z', value },
    { time: '2026-11-16T10:00:00Z', value: 'leak' },
    { time: '2026-11-16T10:00:00Z', value: lastConsumptions },
    { time: '2026-11-16T10:00:00Z', value: '7d' },
    { time: '2026-11-16T10:00:00Z', value: '2026-11-16T10:00:00Z' },
    { time: '2026-11-16T10:00:00Z', value: 'false' },
  ] as any[];

  beforeEach(() => {
    exportData = jasmine.createSpyObj<ExportDataService>('ExportDataService', ['getLastValuesTimescale']);
    TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(),
        { provide: ExportDataService, useValue: exportData }]
});
    service = TestBed.inject(LeakageDetectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('maps the string "1" to a finding', done => {
    exportData.getLastValuesTimescale.and.returnValue(of(pairs('1', '[]')));
    service.getLatestLeakageDetectionOutput('export').subscribe(r => {
      expect(r.value).toBeTrue();
      done();
    });
  });

  it('maps the string "0" to no finding', done => {
    exportData.getLastValuesTimescale.and.returnValue(of(pairs('0', '[]')));
    service.getLatestLeakageDetectionOutput('export').subscribe(r => {
      expect(r.value).toBeFalse();
      done();
    });
  });

  it('maps the string "True" to a finding', done => {
    exportData.getLastValuesTimescale.and.returnValue(of(pairs('True', '[]')));
    service.getLatestLeakageDetectionOutput('export').subscribe(r => {
      expect(r.value).toBeTrue();
      done();
    });
  });

  it('returns no consumptions during the initial phase, when last_consumptions is empty', done => {
    exportData.getLastValuesTimescale.and.returnValue(of(pairs('0', '')));
    service.getLatestLeakageDetectionOutput('export').subscribe(r => {
      expect(r.last_consumptions).toEqual([]);
      done();
    });
  });
});
