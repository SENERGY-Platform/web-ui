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


import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { CertificatesComponent } from './certificates.component';
import { CertificatesService } from './shared/certificates.service';
import { CertificateInfo, Rfc5280Reason } from './shared/certificates.model';

describe('CertificatesComponent revoke', () => {
    let component: CertificatesComponent;
    let service: jasmine.SpyObj<CertificatesService>;
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    const cert = { serial_number: '1' } as CertificateInfo;

    beforeEach(() => {
        service = jasmine.createSpyObj<CertificatesService>('CertificatesService', ['revoke', 'list', 'userHasRevokeAuthorization']);
        service.list.and.returnValue(of([]));
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        TestBed.configureTestingModule({
            imports: [CertificatesComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: CertificatesService, useValue: service },
                { provide: SearchbarService, useValue: { currentSearchText: new BehaviorSubject(''), changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(0 as Rfc5280Reason) }) } },
                { provide: MatSnackBar, useValue: snackBar },
            ],
        });
        component = TestBed.createComponent(CertificatesComponent).componentInstance;
    });

    it('does not reload the list and names the action when revoking fails', () => {
        service.revoke.and.returnValue(of(false));

        component.revoke(cert);

        expect(service.list).not.toHaveBeenCalled();
        expect(snackBar.open.calls.mostRecent().args[0]).toContain('Could not revoke the certificate');
    });

    it('reloads the list without an error when revoking succeeds', () => {
        service.revoke.and.returnValue(of(true));

        component.revoke(cert);

        expect(service.list).toHaveBeenCalled();
        expect(snackBar.open).not.toHaveBeenCalled();
    });
});
