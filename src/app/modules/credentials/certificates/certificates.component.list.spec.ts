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

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { CertificatesComponent } from './certificates.component';
import { CertificatesService } from './shared/certificates.service';
import { CertificateInfo } from './shared/certificates.model';
import { UrlStateService } from 'src/app/core/services/url-state.service';
import { UrlStateServiceMock } from 'src/app/core/services/url-state.service.mock';

describe('CertificatesComponent list', () => {
    let fixture: ComponentFixture<CertificatesComponent>;
    let component: CertificatesComponent;
    let service: jasmine.SpyObj<CertificatesService>;
    let search: BehaviorSubject<string>;
    let urlState: UrlStateServiceMock;

    const valid = { serial_number: 'aa', metadata: { device: 'd1' }, issued_at: '2026-01-02T10:00:00Z', not_before: '2026-01-02T10:00:00Z', expiry: '2027-01-02T10:00:00Z', expired: false, revoked: false } as CertificateInfo;
    const revoked = { ...valid, serial_number: 'bb', issued_at: '2026-01-01T10:00:00Z', revoked: true, revoked_at: '2026-02-01T10:00:00Z', reason: 1 } as CertificateInfo;
    const expired = { ...valid, serial_number: 'cc', issued_at: '2025-01-01T10:00:00Z', expired: true } as CertificateInfo;

    function init(mayRevoke = true, urlParams: Record<string, string> = {}, pageSize = 20) {
        search = new BehaviorSubject('');
        service = jasmine.createSpyObj<CertificatesService>('CertificatesService', ['list', 'revoke', 'userHasRevokeAuthorization']);
        // answered after the view exists, as a request is
        service.list.and.callFake(() => of([valid, revoked, expired]).pipe(delay(1)));
        service.userHasRevokeAuthorization.and.returnValue(mayRevoke);
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, MatSnackBarModule, CertificatesComponent],
            providers: [
                { provide: CertificatesService, useValue: service },
                { provide: SearchbarService, useValue: { currentSearchText: search, changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize } },
                {
                    provide: UrlStateService,
                    useFactory: () => {
                        urlState = new UrlStateServiceMock();
                        urlState.params = urlParams;
                        return urlState;
                    },
                },
                { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(undefined) }) } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(CertificatesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.list.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);

        expect(service.list).toHaveBeenCalledTimes(1);
    }));

    it('shows valid, revoked and expired certificates as status chips, the revocation with its reason', fakeAsync(() => {
        init();

        const chips = Array.from(fixture.nativeElement.querySelectorAll('.status-chip')).map((c) => (c as HTMLElement).textContent!.trim());
        expect(chips).toEqual(['Valid', 'Revoked', 'Expired']);
        expect(fixture.nativeElement.querySelector('.revoked-line').textContent).toContain('KeyCompromise');
    }));

    it('has the action column for revoking only with the revoke right', fakeAsync(() => {
        init(false);

        expect(component.displayedColumns).not.toContain('actions');
    }));

    it('keeps one status column instead of separate revoked-at and reason columns', fakeAsync(() => {
        init();

        expect(component.displayedColumns).toEqual(['serial_number', 'status', 'metadata', 'issued_at', 'not_before', 'expiry', 'actions']);
    }));

    it('pages on the client and counts only the searched certificates', fakeAsync(() => {
        init();
        component.paginator._changePageSize(1);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelectorAll('tr[mat-row]').length).toBe(1);

        search.next('bb');
        tick(400);
        fixture.detectChanges();

        expect(component.paginator.length).toBe(1);
    }));
    describe('view state in the URL', () => {
        const firstRowText = () => (fixture.nativeElement.querySelector('tr[mat-row]') as HTMLElement).textContent;

        it('opens on the page and the sort of the URL without writing them back', fakeAsync(() => {
            init(true, { page: '1', sort: 'serial_number', dir: 'asc' }, 1);

            expect(component.paginator.pageIndex).toBe(1);
            expect(firstRowText()).toContain('bb');
            expect(urlState.writes).toEqual([]);
        }));

        it('moves a page beyond the end to the last page and writes it', fakeAsync(() => {
            init(true, { page: '9', sort: 'serial_number', dir: 'asc' }, 1);

            expect(component.paginator.pageIndex).toBe(2);
            expect(firstRowText()).toContain('cc');
            expect(urlState.writes).toEqual([{ page: 2 }]);
        }));

        it('goes back to the first page for a new search and writes the page and the sort', fakeAsync(() => {
            init(true, { page: '1' }, 1);

            search.next('b');
            tick(400);
            fixture.detectChanges();
            expect(component.paginator.pageIndex).toBe(0);
            expect(urlState.writes).toContain({ page: null });

            component.matSortChange({ active: 'serial_number', direction: 'asc' });
            expect(urlState.writes[urlState.writes.length - 1]).toEqual({ sort: 'serial_number', dir: 'asc', page: null });
        }));
    });
});
