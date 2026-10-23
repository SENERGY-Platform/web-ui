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


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { RequestsComponent } from './requests.component';
import { ContentReviewService } from './shared/content-review.service';
import { ReviewRequestModel, ReviewRequestState } from './shared/content-review.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';

describe('RequestsComponent list', () => {
    let fixture: ComponentFixture<RequestsComponent>;
    let component: RequestsComponent;
    let list: jasmine.Spy;
    let withdraw: jasmine.Spy;
    let navigate: jasmine.Spy;
    let confirm: jasmine.Spy;

    const request = (id: string, state: ReviewRequestState, author = 'me'): ReviewRequestModel => ({
        id, state, name: 'service ' + id, author_id: author, author_name: 'Author ' + author, kind: 'smart-service', design_id: 'd', release_id: 'r',
        test_description: 'check', test_parameters: null, test_case: null, error: '',
        test: { status: 'none', at: null, detail: '' }, sync: { status: 'none', files: null, truncated: false, commit: '', at: null, detail: '' },
        files: { status: 'none', at: null, detail: '', truncated: false, count: 0, operation_id: '' },
        operations: null, history: null, created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-21T11:30:00Z', version: 1,
    });

    interface Options {
        reviewer?: boolean;
        read?: boolean;
        own?: ReviewRequestModel[];
        all?: ReviewRequestModel[];
        confirmed?: boolean;
    }

    async function init(options: Options = {}) {
        const own = options.own ?? [request('a', 'in_review'), request('b', 'published'), request('c', 'failed')];
        const all = options.all ?? [...own, request('d', 'in_review', 'other')];
        list = jasmine.createSpy('list').and.callFake((showAll: boolean) => of(showAll ? all : own));
        withdraw = jasmine.createSpy('withdraw').and.returnValue(of(request('a', 'withdrawing')));
        navigate = jasmine.createSpy('navigate');
        confirm = jasmine.createSpy('openConfirmDialog').and.returnValue({ afterClosed: () => of(options.confirmed ?? true) });
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, RequestsComponent],
            providers: [
                {
                    provide: ContentReviewService,
                    useValue: {
                        userHasReadAuthorization: () => options.read !== false,
                        userIsReviewer: () => options.reviewer === true,
                        userId: () => 'me',
                        list,
                        withdraw,
                    },
                },
                { provide: DialogsService, useValue: { openConfirmDialog: confirm } },
                { provide: Router, useValue: { navigate } },
                { provide: MatSnackBar, useValue: { open: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: SearchbarService, useValue: { currentSearchText: of(''), changeMessage: () => undefined } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(RequestsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges(false);
        fixture.detectChanges();
    }

    const rows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]'));
    const headers = (): string[] => Array.from(fixture.nativeElement.querySelectorAll('th')).map((th) => ((th as HTMLElement).textContent || '').trim());

    async function menuLabels(row: number): Promise<string[]> {
        (fixture.nativeElement.querySelectorAll('tr[mat-row] button[aria-label="Actions"]')[row] as HTMLButtonElement).click();
        fixture.detectChanges();
        await fixture.whenStable();
        return Array.from(document.querySelectorAll('.mat-mdc-menu-panel button')).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim().replace(/^\w+ /, ''));
    }

    it('lists the own requests with state chip and dates, without an author column', async () => {
        await init();

        expect(list).toHaveBeenCalledWith(false, 500, 0);
        expect(rows().length).toBe(3);
        expect(headers()).not.toContain('Author');
        const [inReview, published, failed] = rows();
        expect(inReview.querySelector('.name-cell')?.textContent).toContain('service a');
        expect(inReview.querySelector('.status-chip.warning')?.textContent).toContain('In review');
        expect(published.querySelector('.status-chip.online')?.textContent).toContain('Published');
        expect(failed.querySelector('.status-chip.failed')?.textContent).toContain('Failed');
        expect(inReview.textContent).toContain('20.10.2026 10:00');
        expect(inReview.textContent).toContain('21.10.2026 11:30');
    });

    it('offers the all-requests chip to reviewers only', async () => {
        await init({ reviewer: true });
        expect(fixture.nativeElement.querySelector('mat-chip-option')?.textContent).toContain('All requests');

        fixture.destroy();
        TestBed.resetTestingModule();
        await init({ reviewer: false });
        expect(fixture.nativeElement.querySelector('mat-chip-option')).toBeNull();
    });

    it('loads every request and shows the author once the reviewer switches the chip on', async () => {
        await init({ reviewer: true });
        list.calls.reset();

        component.toggleAll(true);
        fixture.detectChanges();

        expect(list).toHaveBeenCalledWith(true, 500, 0);
        expect(rows().length).toBe(4);
        expect(headers()).toContain('Author');
        expect(rows()[3].textContent).toContain('Author other');
    });

    it('opens the detail page on a row click', async () => {
        await init();

        rows()[1].click();

        expect(navigate).toHaveBeenCalledWith(['/smart-services/requests', 'b']);
    });

    it('offers Withdraw to the author of a request in review', async () => {
        await init({ own: [request('a', 'in_review')] });

        expect(await menuLabels(0)).toEqual(['Open', 'Withdraw']);
    });

    it('hides Withdraw for a request that is not in review any more', async () => {
        await init({ own: [request('b', 'published')] });

        expect(await menuLabels(0)).toEqual(['Open']);
    });

    it('hides Withdraw for the request of another author, which a reviewer sees', async () => {
        await init({ reviewer: true, all: [request('c', 'in_review', 'other')] });
        component.toggleAll(true);
        fixture.detectChanges();

        expect(await menuLabels(0)).toEqual(['Open']);
    });

    it('withdraws after the confirmation and loads the list again', async () => {
        await init();
        list.calls.reset();

        component.withdraw(component.dataSource.data[0]);

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(withdraw).toHaveBeenCalledWith('a');
        expect(list).toHaveBeenCalledTimes(1);
    });

    it('withdraws nothing when the confirmation is cancelled', async () => {
        await init({ confirmed: false });
        list.calls.reset();

        component.withdraw(component.dataSource.data[0]);

        expect(withdraw).not.toHaveBeenCalled();
        expect(list).not.toHaveBeenCalled();
    });

    it('reloads exactly once when the refresh button is clicked', async () => {
        await init();
        list.calls.reset();

        (fixture.nativeElement.querySelector('senergy-list-toolbar .toolbar-refresh') as HTMLButtonElement).click();

        expect(list).toHaveBeenCalledTimes(1);
    });

    it('names the own requests in the empty state and every request for a reviewer', async () => {
        await init({ reviewer: true, own: [], all: [] });
        expect(fixture.nativeElement.textContent).toContain('No requests of yours yet');

        component.toggleAll(true);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('No requests yet');
    });

    it('asks for no list and says so without the read right', async () => {
        await init({ read: false });

        expect(list).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain('No access to requests');
    });
});
