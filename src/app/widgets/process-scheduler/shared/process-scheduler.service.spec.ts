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

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ProcessRepoService } from '../../../modules/processes/process-repo/shared/process-repo.service';
import { ProcessSchedulerService } from './process-scheduler.service';

describe('ProcessSchedulerService.deleteScheduleIfExists', () => {
    let reported: string[];

    function serviceFailingWith(status: number): ProcessSchedulerService {
        reported = [];
        const notice = (kind: string) => (_s: string, _m: string, result: unknown) => () => {
            reported.push(kind);
            return of(result);
        };
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: { delete: () => throwError(() => new HttpErrorResponse({ status })) } },
                { provide: ErrorHandlerService, useValue: { handleError: notice('notice'), handleErrorQuietly: notice('quiet') } },
                { provide: MatDialog, useValue: {} },
                { provide: DashboardService, useValue: {} },
                { provide: ProcessRepoService, useValue: {} },
                { provide: MatSnackBar, useValue: {} },
            ],
        });
        return TestBed.inject(ProcessSchedulerService);
    }

    it('answers 404 quietly for a schedule that is already gone', (done) => {
        serviceFailingWith(404).deleteScheduleIfExists('s1').subscribe((result) => {
            expect(result).toEqual({ status: 404 });
            expect(reported).toEqual(['quiet']);
            done();
        });
    });

    it('shows the error notice for another failure', (done) => {
        serviceFailingWith(502).deleteScheduleIfExists('s1').subscribe((result) => {
            expect(result).toEqual({ status: 502 });
            expect(reported).toEqual(['notice']);
            done();
        });
    });

    it('logs that failure without the error notice when asked to be quiet', (done) => {
        serviceFailingWith(502).deleteScheduleIfExists('s1', true).subscribe((result) => {
            expect(result).toEqual({ status: 502 });
            expect(reported).toEqual(['quiet']);
            done();
        });
    });
});
