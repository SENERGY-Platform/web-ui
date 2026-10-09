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


import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { CertificatesService } from './certificates.service';
import { CertificateInfo, Rfc5280Reason } from './certificates.model';

describe('CertificatesService revoke', () => {
    let service: CertificatesService;
    let http: HttpTestingController;
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    const cert = { serial_number: '1', authority_key_identifier: 'k' } as CertificateInfo;

    beforeEach(() => {
        spyOn(console, 'error');
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: MatSnackBar, useValue: snackBar },
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: () => ({ GET: true, POST: true }) } },
            ],
        });
        service = TestBed.inject(CertificatesService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('answers false and names the backend when the request fails', () => {
        let result: boolean | undefined;
        service.revoke(cert, 0 as Rfc5280Reason).subscribe((r) => result = r);
        http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/revoke'))
            .flush('boom', { status: 500, statusText: 'Internal Server Error' });

        expect(result).toBeFalse();
        expect(snackBar.open.calls.mostRecent().args[0]).toContain('request failed (500)');
    });

    it('answers true when the request succeeds', () => {
        let result: boolean | undefined;
        service.revoke(cert, 0 as Rfc5280Reason).subscribe((r) => result = r);
        http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/revoke')).flush(null);

        expect(result).toBeTrue();
        expect(snackBar.open).not.toHaveBeenCalled();
    });
});
