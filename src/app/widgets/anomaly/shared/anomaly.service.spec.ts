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

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AnomalyService } from './anomaly.service';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AnomalyResultModel } from './anomaly.model';

describe('AnomalyService', () => {
    let service: AnomalyService;

    beforeEach(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    imports: [MatDialogModule,
        MatSnackBarModule],
    providers: [provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()]
});
        service = TestBed.inject(AnomalyService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getAnomaly', () => {
        const values = ['0.9', 'curve', '', 5, 2, '2026-10-05T08:00:00Z', '', 'dev-1', '2026-10-05T07:00:00Z', '2026-10-05T07:30:00Z', '[[1, 2, 3]]'];

        function answer(pairs: { time: string; value: any }[]): AnomalyResultModel | null | undefined {
            let result: AnomalyResultModel | null | undefined;
            service.getAnomaly('exp-1').subscribe((anomaly) => (result = anomaly));
            const request = TestBed.inject(HttpTestingController).expectOne(environment.timescaleAPIURL + '/last-values');
            expect(request.request.body.map((c: any) => c.columnName)).toEqual([
                'value', 'type', 'sub_type', 'threshold', 'mean', 'time', 'initial_phase', 'device_id', 'start_time', 'end_time', 'original_reconstructed_curves',
            ]);
            request.flush(pairs);
            return result;
        }

        // SNRGY-4848: only an answer with 8 columns was read, although 11 are requested, so there never was a last anomaly.
        it('reads the last anomaly from the 11 requested columns', () => {
            expect(answer(values.map((value) => ({ time: '2026-10-05T08:00:00Z', value })))).toEqual({
                value: '0.9', type: 'curve', subType: '', threshold: 5, mean: 2, timestamp: '2026-10-05T08:00:00Z', initial_phase: '', device_id: 'dev-1',
                start_time: '2026-10-05T07:00:00Z', end_time: '2026-10-05T07:30:00Z', original_reconstructed_curves: [[1, 2, 3]],
            });
        });

        it('has no last anomaly when columns are missing', () => {
            expect(answer(values.slice(0, 8).map((value) => ({ time: '2026-10-05T08:00:00Z', value })))).toBeNull();
        });
    });
});
