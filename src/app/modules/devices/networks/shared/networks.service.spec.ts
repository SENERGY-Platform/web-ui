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
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('NetworksService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    imports: [MatDialogModule, MatSnackBarModule],
    providers: [NetworksService, provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()]
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
});
