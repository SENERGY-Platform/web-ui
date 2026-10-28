/*
 * Copyright 2020 InfAI (CC SES)
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

import { TestBed, inject } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { NetworksService } from './networks.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HubModel } from './networks.model';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('NetworksService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    imports: [MatDialogModule, MatSnackBarModule],
    providers: [NetworksService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    });

    it('should be created', inject([NetworksService], (service: NetworksService) => {
        expect(service).toBeTruthy();
    }));

    it('getLoraCerts answers null and names the backend when the request fails', () => {
        const snackBar = TestBed.inject(MatSnackBar);
        const open = spyOn(snackBar, 'open');
        spyOn(console, 'error');
        const service = TestBed.inject(NetworksService);
        const http = TestBed.inject(HttpTestingController);
        let result: unknown = 'unset';

        service.getLoraCerts({ id: 'n1' } as HubModel).subscribe((r) => result = r);
        http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/gateways/n1/cert'))
            .flush('boom', { status: 500, statusText: 'Internal Server Error' });

        expect(result).toBeNull();
        expect(open.calls.mostRecent().args[0]).toContain('request failed (500)');
    });

    describe('queryHubHealth', () => {
        const isQuery = (r: { method: string; url: string }) => r.method === 'POST' && r.url.endsWith('/current/query/health');

        it('sends no request without ids, since connection-log would answer for every hub then', () => {
            const service = TestBed.inject(NetworksService);
            const http = TestBed.inject(HttpTestingController);
            let result: unknown = 'unset';

            service.queryHubHealth([]).subscribe((r) => result = r);

            http.expectNone(isQuery);
            expect(result).toEqual([]);
        });

        it('posts the ids and answers with the reports', () => {
            const service = TestBed.inject(NetworksService);
            const http = TestBed.inject(HttpTestingController);
            const reports = [{ hub_id: 'h1', state: 1, reasons: [], report: {}, report_time: '', received: '2026-10-12T08:30:00Z', stale: false }];
            let result: unknown;

            service.queryHubHealth(['h1', 'h2']).subscribe((r) => result = r);
            const req = http.expectOne(isQuery);
            expect(req.request.body).toEqual({ ids: ['h1', 'h2'] });
            req.flush(reports);

            expect(result).toEqual(reports);
        });

        for (const status of [401, 403]) {
            it('answers an empty list without a snack bar on ' + status, () => {
                const open = spyOn(TestBed.inject(MatSnackBar), 'open');
                spyOn(console, 'error');
                const service = TestBed.inject(NetworksService);
                const http = TestBed.inject(HttpTestingController);
                let result: unknown = 'unset';

                service.queryHubHealth(['h1']).subscribe((r) => result = r);
                http.expectOne(isQuery).flush('access denied', { status, statusText: 'Forbidden' });

                expect(result).toEqual([]);
                expect(open).not.toHaveBeenCalled();
            });
        }

        it('answers an empty list and names the backend on another error', () => {
            const open = spyOn(TestBed.inject(MatSnackBar), 'open');
            spyOn(console, 'error');
            const service = TestBed.inject(NetworksService);
            const http = TestBed.inject(HttpTestingController);
            let result: unknown = 'unset';

            service.queryHubHealth(['h1']).subscribe((r) => result = r);
            http.expectOne(isQuery).flush('boom', { status: 500, statusText: 'Internal Server Error' });

            expect(result).toEqual([]);
            expect(open.calls.mostRecent().args[0]).toContain('request failed (500)');
        });
    });
});
