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


import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY } from 'rxjs';

import { FlowEngineService } from './flow-engine.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../../environments/environment';

describe('FlowEngineService', () => {
    let service: FlowEngineService;
    let http: HttpTestingController;
    let snackOpen: jasmine.Spy;
    let logged: jasmine.Spy;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: () => ({}) } },
                { provide: MatSnackBar, useValue: { open: (snackOpen = jasmine.createSpy('open').and.returnValue({ afterDismissed: () => EMPTY })) } },
            ],
        });
        service = TestBed.inject(FlowEngineService);
        http = TestBed.inject(HttpTestingController);
        logged = spyOn(console, 'error');
    });

    afterEach(() => http.verify());

    it('getPipelineStatus logs and reports a failed request and still rethrows it', () => {
        let failure: unknown;
        service.getPipelineStatus('p1').subscribe({ error: (err) => (failure = err) });

        http.expectOne(environment.flowEngineUrl + '/pipeline/p1').flush('down', { status: 503, statusText: 'Service Unavailable' });

        expect((failure as HttpErrorResponse).status).toBe(503);
        expect(logged).toHaveBeenCalled();
        expect(snackOpen.calls.mostRecent().args[0]).toContain('request failed (503)');
    });

    it('getPipelinesStatus logs and reports a failed request and still rethrows it', () => {
        let failure: unknown;
        service.getPipelinesStatus().subscribe({ error: (err) => (failure = err) });

        http.expectOne(environment.flowEngineUrl + '/pipelines').flush('down', { status: 502, statusText: 'Bad Gateway' });

        expect((failure as HttpErrorResponse).status).toBe(502);
        expect(logged).toHaveBeenCalled();
        expect(snackOpen.calls.mostRecent().args[0]).toContain('request failed (502)');
    });
});
