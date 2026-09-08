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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { CoreModule } from '../../../../core/core.module';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { EnvironmentsHistoryComponent } from './environments-history.component';
import { EnvironmentsService } from '../../shared/environments.service';
import { LadonService } from '../../../admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../../environments/environment';

class MockLadonService {
    getUserAuthorizationsForURI(_uri: string): any {
        return undefined;
    }
}

/** A "YYYY-MM-DDTHH:mm" local value as an <input type="datetime-local"> would produce for `date`. */
function toLocalInputValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

describe('EnvironmentsHistoryComponent', () => {
    let component: EnvironmentsHistoryComponent;
    let fixture: ComponentFixture<EnvironmentsHistoryComponent>;
    let httpMock: HttpTestingController;
    const historyUrl = environment.mosesUrl + '/environments/e1/history';

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [EnvironmentsHistoryComponent],
            imports: [
                CommonModule,
                FormsModule,
                NoopAnimationsModule,
                CoreModule,
                MatFormFieldModule,
                MatInputModule,
                MatButtonModule,
                MatIconModule,
                MatTooltipModule,
                MatTableModule,
                MatProgressBarModule,
                MatDialogModule,
                MatSnackBarModule,
            ],
            providers: [
                EnvironmentsService,
                DialogsService,
                { provide: LadonService, useClass: MockLadonService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });

        fixture = TestBed.createComponent(EnvironmentsHistoryComponent);
        component = fixture.componentInstance;
        component.environmentId = 'e1';
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        // ignoreCancelled: the 15s client-side timeout (see getHistory) unsubscribes from a
        // stuck request instead of flushing it, which the backend still tracks as open.
        httpMock.verify({ ignoreCancelled: true });
    });

    /** Drives ngOnInit's immediate poll (timer(0, ...)) and answers it with "no run known". */
    function loadWithNoRun(): void {
        fixture.detectChanges();
        tick(); // flushes timer(0, ...)'s immediate (0ms due) first emission
        httpMock.expectOne(historyUrl).flush('nothing is known about a history run of this environment', { status: 404, statusText: 'Not Found' });
        fixture.detectChanges();
    }

    it('renders the start form when no history run is known (404)', fakeAsync(() => {
        loadWithNoRun();

        expect(fixture.nativeElement.querySelector('input[type="datetime-local"]')).toBeTruthy();
        const startButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.includes('Start'));
        expect(startButton).toBeTruthy();

        discardPeriodicTasks();
    }));

    it('posts the chosen from as RFC3339 UTC with force:false on Start', fakeAsync(() => {
        loadWithNoRun();
        // A real local wall-clock value, 5 days back -- built and converted independently of
        // toDatetimeLocal/startRun's own `new Date(fromValue)` parsing, so a bug in either one
        // would actually be caught here instead of the assertion re-deriving from the same code.
        const local = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        component.fromValue = toLocalInputValue(local);
        const expectedFrom = new Date(local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes()).toISOString();

        component.startRun(false);

        const req = httpMock.expectOne(historyUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ from: expectedFrom, force: false });
        req.flush({ environment_id: 'e1', state: 'running', from: expectedFrom, to: expectedFrom }, { status: 202, statusText: 'Accepted' });

        tick(2000); // lets the success snackbar's auto-dismiss timer settle before teardown
        // A successful start restarts polling (see startRun), which fires its own immediate GET.
        httpMock.expectOne(historyUrl).flush({ environment_id: 'e1', state: 'running', from: expectedFrom, to: expectedFrom });
        discardPeriodicTasks();
    }));

    it('shows an occupied-window refusal with its devices and starts anyway with force:true', fakeAsync(() => {
        loadWithNoRun();

        component.startRun(false);
        httpMock.expectOne(historyUrl).flush(
            [
                'the first day of the window already holds readings for these devices, so the run would write rows a second time; send force: true to start anyway',
                'device d1 (Meter 1)',
                'device d2',
            ].join('\n'),
            { status: 409, statusText: 'Conflict' },
        );
        fixture.detectChanges();

        expect(component.refusal?.kind).toBe('occupied');
        const deviceItems = Array.from(fixture.nativeElement.querySelectorAll('.history-device-list li')).map((li: any) => li.textContent.trim());
        expect(deviceItems).toEqual(['Meter 1 (d1)', 'd2']);

        const forceButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.includes('Start anyway'));
        (forceButton as HTMLElement).click();

        const req = httpMock.expectOne(historyUrl);
        expect(req.request.body).toEqual({ from: new Date(component.fromValue).toISOString(), force: true });
        req.flush({ environment_id: 'e1', state: 'running' }, { status: 202, statusText: 'Accepted' });

        tick(2000); // lets the success snackbar's auto-dismiss timer settle before teardown
        // A successful start restarts polling (see startRun), which fires its own immediate GET.
        httpMock.expectOne(historyUrl).flush({ environment_id: 'e1', state: 'running' });
        discardPeriodicTasks();
    }));

    it('reloads the status instead of showing a refusal when a run is already in progress', fakeAsync(() => {
        // stubbed: the refusal is also shown as a snackbar, whose real timers would outlive the test
        spyOn(TestBed.inject(MatSnackBar), 'open').and.stub();
        loadWithNoRun();

        component.startRun(false);
        httpMock.expectOne(historyUrl).flush('a history run of this environment is in progress', { status: 409, statusText: 'Conflict' });

        const reloadReq = httpMock.expectOne(historyUrl);
        reloadReq.flush({ environment_id: 'e1', state: 'running', from: '2026-07-01T00:00:00Z', to: '2026-08-01T00:00:00Z' });
        fixture.detectChanges();

        expect(component.refusal).toBeUndefined();
        expect(component.status?.state).toBe('running');

        discardPeriodicTasks();
    }));

    // A backfill run also answers POST .../history with the plain "in progress" 409, but GET
    // .../history knows nothing about it (404) -- the refusal must stay visible instead of being
    // cleared by a reload that reports "no run known".
    it('keeps the refusal panel visible when the reload after a running conflict finds no run at all (backfill in progress)', fakeAsync(() => {
        const snackBar = TestBed.inject(MatSnackBar);
        spyOn(snackBar, 'open').and.stub();
        loadWithNoRun();

        component.startRun(false);
        httpMock.expectOne(historyUrl).flush('a history run of this environment is in progress', { status: 409, statusText: 'Conflict' });

        const reloadReq = httpMock.expectOne(historyUrl);
        reloadReq.flush('nothing is known about a history run of this environment', { status: 404, statusText: 'Not Found' });
        fixture.detectChanges();

        expect(component.refusal?.kind).toBe('running');
        expect(component.showForm).toBe(true);
        expect(fixture.nativeElement.querySelector('.history-refusal')).toBeTruthy();
        expect(snackBar.open).toHaveBeenCalledWith('a history run of this environment is in progress', undefined, { duration: 6000 });

        discardPeriodicTasks();
    }));

    it('renders the progress bar and the abort button while running', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        httpMock.expectOne(historyUrl).flush({
            environment_id: 'e1',
            state: 'running',
            from: '2026-07-01T00:00:00Z',
            to: '2026-07-03T00:00:00Z',
            position: '2026-07-02T00:00:00Z',
            started_at: '2026-07-01T00:00:00Z',
            published: 10,
            failed: 1,
        });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeTruthy();
        expect(component.progressPercent(component.status!)).toBe(50);
        const abortButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.includes('Abort'));
        expect(abortButton).toBeTruthy();

        discardPeriodicTasks();
    }));

    // A failed poll must not blank the view -- the last known status stays, with a non-blocking
    // error line instead of the start form (see applyPoll).
    it('keeps the last known status and shows a non-blocking error line when a poll fails', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        httpMock.expectOne(historyUrl).flush({ environment_id: 'e1', state: 'running', from: '2026-07-01T00:00:00Z', to: '2026-08-01T00:00:00Z' });
        fixture.detectChanges();

        tick(5000);
        httpMock.expectOne(historyUrl).flush('moses is down', { status: 500, statusText: 'Internal Server Error' });
        fixture.detectChanges();

        expect(component.status?.state).toBe('running');
        expect(component.pollError).toBe('Status could not be read: moses is down');
        expect(fixture.nativeElement.querySelector('.history-poll-error')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeTruthy();

        discardPeriodicTasks();
    }));

    it('aborts after the confirmation dialog is accepted', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        httpMock.expectOne(historyUrl).flush({ environment_id: 'e1', state: 'running', from: '2026-07-01T00:00:00Z', to: '2026-08-01T00:00:00Z' });
        fixture.detectChanges();

        spyOn(TestBed.inject(DialogsService), 'openConfirmDialog').and.returnValue({ afterClosed: () => of(true) } as any);
        component.confirmAbort();

        const req = httpMock.expectOne(historyUrl);
        expect(req.request.method).toBe('DELETE');
        req.flush({ environment_id: 'e1', state: 'cancelled' }, { status: 202, statusText: 'Accepted' });

        expect(component.status?.state).toBe('cancelled');

        tick(2000); // lets the "Abort accepted" snackbar's auto-dismiss timer settle before teardown
        discardPeriodicTasks();
    }));

    it('does not abort when the confirmation dialog is declined', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        httpMock.expectOne(historyUrl).flush({ environment_id: 'e1', state: 'running', from: '2026-07-01T00:00:00Z', to: '2026-08-01T00:00:00Z' });
        fixture.detectChanges();

        spyOn(TestBed.inject(DialogsService), 'openConfirmDialog').and.returnValue({ afterClosed: () => of(false) } as any);
        component.confirmAbort();

        expect(httpMock.match({ method: 'DELETE', url: historyUrl }).length).toBe(0);
        expect(component.status?.state).toBe('running');

        discardPeriodicTasks();
    }));

    it('reports that the run had already ended when the abort finds it done instead of running', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        httpMock.expectOne(historyUrl).flush({ environment_id: 'e1', state: 'running', from: '2026-07-01T00:00:00Z', to: '2026-08-01T00:00:00Z' });
        fixture.detectChanges();

        spyOn(TestBed.inject(DialogsService), 'openConfirmDialog').and.returnValue({ afterClosed: () => of(true) } as any);
        const snackBar = TestBed.inject(MatSnackBar);
        spyOn(snackBar, 'open');
        component.confirmAbort();

        const req = httpMock.expectOne(historyUrl);
        req.flush({ environment_id: 'e1', state: 'done' }, { status: 202, statusText: 'Accepted' });

        expect(component.status?.state).toBe('done');
        expect(snackBar.open).toHaveBeenCalledWith('The run had already ended.', undefined, { duration: 2000 });

        discardPeriodicTasks();
    }));

    // isAborting is set before the dialog even opens, so a second click while it is still open
    // (or while the abort request is in flight) is a no-op rather than a second dialog/request.
    it('ignores a second confirmAbort while the first is still awaiting confirmation', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        httpMock.expectOne(historyUrl).flush({ environment_id: 'e1', state: 'running', from: '2026-07-01T00:00:00Z', to: '2026-08-01T00:00:00Z' });
        fixture.detectChanges();

        const openConfirmDialog = spyOn(TestBed.inject(DialogsService), 'openConfirmDialog').and.returnValue({ afterClosed: () => of(true) } as any);
        component.confirmAbort();
        component.confirmAbort();

        expect(openConfirmDialog).toHaveBeenCalledTimes(1);
        httpMock.expectOne(historyUrl).flush({ environment_id: 'e1', state: 'cancelled' }, { status: 202, statusText: 'Accepted' });

        tick(2000); // lets the "Abort accepted" snackbar's auto-dismiss timer settle before teardown
        discardPeriodicTasks();
    }));

    it('renders the channel table for a done run and offers to start another one', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        httpMock.expectOne(historyUrl).flush({
            environment_id: 'e1',
            state: 'done',
            from: '2026-07-01T00:00:00Z',
            to: '2026-08-01T00:00:00Z',
            started_at: '2026-07-01T00:00:01Z',
            finished_at: '2026-08-01T00:00:01Z',
            published: 5,
            failed: 0,
            channels: [{ channel_id: 'c1', name: 'Power', publishable: true, published: 5, silent: 0, failed: 0 }],
        });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('table.history-channel-table')).toBeTruthy();
        expect(fixture.nativeElement.textContent).toContain('Power');
        expect(fixture.nativeElement.textContent).toContain('Done');

        const startAnotherButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.includes('Start another run'));
        (startAnotherButton as HTMLElement).click();
        fixture.detectChanges();

        expect(component.showForm).toBe(true);
        expect(fixture.nativeElement.querySelector('input[type="datetime-local"]')).toBeTruthy();

        discardPeriodicTasks();
    }));

    it('start() begins polling immediately and every 5s, and stop() ends it', fakeAsync(() => {
        fixture.detectChanges(); // ngOnInit -> start()
        tick();
        httpMock.expectOne(historyUrl).flush('nothing is known about a history run of this environment', { status: 404, statusText: 'Not Found' });

        expect(httpMock.match(historyUrl).length).toBe(0); // nothing again before 5s pass
        tick(5000);
        httpMock.expectOne(historyUrl).flush('nothing is known about a history run of this environment', { status: 404, statusText: 'Not Found' });

        component.stop();
        tick(10000);
        expect(httpMock.match(historyUrl).length).toBe(0);
    }));

    // getHistory applies its own 15s client-side timeout (see HISTORY_POLL_TIMEOUT_MS) so a GET
    // Moses never answers still surfaces as the poll error line instead of hanging loading forever.
    it('surfaces a GET stuck past 15s as the poll error line instead of hanging', fakeAsync(() => {
        fixture.detectChanges(); // ngOnInit -> start()
        tick();
        const stuckReq = httpMock.expectOne(historyUrl); // not flushed, to simulate a request stuck past the timeout

        tick(15000);
        fixture.detectChanges();

        expect(component.loading).toBe(false);
        expect(component.pollError).toBe('Status could not be read: Request timed out.');
        expect(component.status).toBeUndefined();
        // timeout() unsubscribes from the still-open request -- see afterEach's ignoreCancelled.
        expect(stuckReq.cancelled).toBe(true);

        // The timeout (15s) is exactly 3 poll intervals (5s), so the regular tick due at the same
        // instant may already have started its own GET -- drain it if so, it is not what this test is about.
        httpMock.match(historyUrl).forEach((req) => req.flush('nothing is known about a history run of this environment', { status: 404, statusText: 'Not Found' }));
        discardPeriodicTasks();
    }));

    it('stops polling on destroy', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        httpMock.expectOne(historyUrl).flush('nothing is known about a history run of this environment', { status: 404, statusText: 'Not Found' });

        fixture.destroy();
        tick(10000);

        expect(httpMock.match(historyUrl).length).toBe(0);
    }));

    describe('from validation', () => {
        it('rejects an empty from', fakeAsync(() => {
            loadWithNoRun();
            component.fromValue = '';

            component.startRun(false);

            expect(component.formError).toBe('Choose a start date and time.');
            httpMock.expectNone(historyUrl);
            discardPeriodicTasks();
        }));

        it('rejects a from in the future', fakeAsync(() => {
            loadWithNoRun();
            const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
            component.fromValue = toLocalInputValue(future);

            component.startRun(false);

            expect(component.formError).toBe('Must be in the past.');
            httpMock.expectNone(historyUrl);
            discardPeriodicTasks();
        }));

        // A pick within the client's own 2-minute safety margin above the server's 1-minute
        // minHistorySpan floor (see MIN_PAST_MARGIN_MS) is refused before ever reaching the API --
        // otherwise the server's own (slightly later) clock could reject it as not in the past.
        it('rejects a from within the current minute', fakeAsync(() => {
            loadWithNoRun();
            component.fromValue = toLocalInputValue(new Date());

            component.startRun(false);

            expect(component.formError).toBe('Must be at least 2 minutes in the past.');
            httpMock.expectNone(historyUrl);
            discardPeriodicTasks();
        }));

        // Boundary per the 366-day window the API enforces (see moses' history endpoint):
        // comfortably inside is accepted, comfortably outside is rejected. The exact knife-edge
        // millisecond is not asserted here -- it would race the test's own wall-clock reads
        // against validateFrom()'s, which computes "now" independently.
        it('accepts a from clearly within 366 days and rejects one clearly beyond it', fakeAsync(() => {
            loadWithNoRun();

            component.fromValue = toLocalInputValue(new Date(Date.now() - 365.5 * 24 * 60 * 60 * 1000));
            component.startRun(false);
            expect(component.formError).toBeUndefined();
            httpMock.expectOne(historyUrl).flush({ environment_id: 'e1', state: 'running' }, { status: 202, statusText: 'Accepted' });

            component.fromValue = toLocalInputValue(new Date(Date.now() - 366.5 * 24 * 60 * 60 * 1000));
            component.startRun(false);
            expect(component.formError).toBe('Must not be more than 366 days ago.');
            httpMock.expectNone(historyUrl);

            tick(2000); // lets the first request's success snackbar auto-dismiss timer settle before teardown
            // The first (accepted) start restarts polling (see startRun), which fires its own immediate GET.
            httpMock.expectOne(historyUrl).flush({ environment_id: 'e1', state: 'running' });
            discardPeriodicTasks();
        }));

        // force only tells the server to skip its own occupied-window check -- the client-side
        // checks still apply, since the force retry reuses the same (already valid) fromValue.
        it('force still runs the client-side checks', fakeAsync(() => {
            loadWithNoRun();
            component.fromValue = '';

            component.startRun(true);

            expect(component.formError).toBe('Choose a start date and time.');
            httpMock.expectNone(historyUrl);
            discardPeriodicTasks();
        }));
    });
});
