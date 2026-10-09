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
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { ErrorHandlerService } from './error-handler.service';
import { snackError, snackSuccess, ERROR_SNACK_WINDOW_MS } from './snack-bar-messages';
import { environment } from '../../../environments/environment';

describe('ErrorHandlerService', () => {
    let service: ErrorHandlerService;
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    let dismissed: Subject<void>[];
    const env = environment as Record<string, any>;
    const original = { ...env };

    const httpError = (url: string | null, status: number, statusText = 'Not Found') =>
        new HttpErrorResponse({ url: url ?? undefined, status, statusText });

    beforeEach(() => {
        env['deviceRepoUrl'] = 'http://devices.test';
        env['deviceSelectionUrl'] = 'http://devices.test/selection';
        env['processIoUrl'] = 'http://process-io.test/';
        dismissed = [];
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        snackBar.open.and.callFake(() => {
            const closed = new Subject<void>();
            dismissed.push(closed);
            return { afterDismissed: () => closed } as any;
        });
        TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: snackBar }] });
        service = TestBed.inject(ErrorHandlerService);
        spyOn(console, 'error');
    });

    afterEach(() => {
        Object.assign(env, original);
    });

    it('returns the fallback value', (done) => {
        service.handleError('Svc', 'm', [1, 2])(httpError('http://devices.test/x', 500)).subscribe((v) => {
            expect(v).toEqual([1, 2]);
            done();
        });
    });

    it('names the backend with the longest matching url and the status', () => {
        service.handleError('Svc', 'm')(httpError('http://devices.test/selection/path', 503, 'Service Unavailable'));
        expect(snackBar.open).toHaveBeenCalledWith(
            'device-selection: request failed (503)',
            'close',
            { panelClass: 'snack-bar-error' },
        );
    });

    it('matches a base url written with a trailing slash', () => {
        service.handleError('Svc', 'm')(httpError('http://process-io.test/variables', 404));
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('process-io: request failed (404)');
    });

    it('does not match a longer host that only starts with a base url', () => {
        service.handleError('Svc', 'm')(httpError('http://devices.test.other/x', 404));
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('devices.test.other: request failed (404)');
    });

    it('falls back to the host for an unknown url', () => {
        service.handleError('Svc', 'm')(httpError('http://unknown.test:8080/x', 500, 'Server Error'));
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('unknown.test:8080: request failed (500)');
    });

    it('falls back to the service argument without a url', () => {
        service.handleError('Svc', 'm')(httpError(null, 500, 'Server Error'));
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Svc: request failed (500)');
    });

    it('says the backend is not reachable for status 0', () => {
        service.handleError('Svc', 'm')(httpError('http://devices.test/x', 0, 'Unknown Error'));
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('device-repo is not reachable');
    });

    it('shows no snack bar without an error', () => {
        service.handleError('Svc', 'm')(undefined);
        expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('shows no snack bar for an error that is not an http error', () => {
        service.handleError('Svc', 'm')(new Error('boom') as any);
        expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('does not open the same message again while it is open, and does after it was dismissed', () => {
        const handler = service.handleError('Svc', 'm');
        handler(httpError('http://devices.test/a', 500, 'Server Error'));
        handler(httpError('http://devices.test/b', 500, 'Server Error'));
        expect(snackBar.open).toHaveBeenCalledTimes(1);

        dismissed[0].next();
        handler(httpError('http://devices.test/c', 500, 'Server Error'));
        expect(snackBar.open).toHaveBeenCalledTimes(2);
    });

    it('opens a different message while another one is open', () => {
        const handler = service.handleError('Svc', 'm');
        handler(httpError('http://devices.test/a', 500, 'Server Error'));
        handler(httpError('http://devices.test/a', 404));
        expect(snackBar.open).toHaveBeenCalledTimes(2);
    });

    it('handleErrorWithSnackBar shows only its own message', (done) => {
        service.handleErrorWithSnackBar('Could not save', 'Svc', 'm', null)(httpError('http://devices.test/x', 500)).subscribe((v) => {
            expect(v).toBeNull();
            expect(snackBar.open).toHaveBeenCalledTimes(1);
            expect(snackBar.open.calls.mostRecent().args[0]).toBe('Could not save');
            done();
        });
    });

    it('handleErrorQuietly returns the fallback and stays silent', (done) => {
        service.handleErrorQuietly('Svc', 'm', false)(httpError('http://devices.test/x', 404)).subscribe((v) => {
            expect(v).toBeFalse();
            expect(snackBar.open).not.toHaveBeenCalled();
            expect(console.error).toHaveBeenCalled();
            done();
        });
    });

    describe('backend message', () => {
        const message = (body: unknown) => {
            service.handleError('Svc', 'm')(new HttpErrorResponse({ url: 'http://devices.test/x', status: 400, error: body }));
            return snackBar.open.calls.mostRecent().args[0];
        };

        it('appends a string body', () => {
            expect(message('  device type is invalid \n')).toBe('device-repo: request failed (400): device type is invalid');
        });

        it('appends the error string of an object body', () => {
            expect(message({ error: 'name taken', message: 'ignored' })).toBe('device-repo: request failed (400): name taken');
        });

        it('appends the message string of an object body', () => {
            expect(message({ message: 'name taken' })).toBe('device-repo: request failed (400): name taken');
        });

        it('cuts the message at 200 characters', () => {
            expect(message('x'.repeat(300))).toBe('device-repo: request failed (400): ' + 'x'.repeat(200));
        });

        it('adds nothing for an empty, null or non-string body', () => {
            expect(message('   ')).toBe('device-repo: request failed (400)');
            expect(message(null)).toBe('device-repo: request failed (400)');
            expect(message({ error: { code: 1 } })).toBe('device-repo: request failed (400)');
        });

        it('keeps "is not reachable" for status 0', () => {
            service.handleError('Svc', 'm')(new HttpErrorResponse({ url: 'http://devices.test/x', status: 0, error: 'boom' }));
            expect(snackBar.open.calls.mostRecent().args[0]).toBe('device-repo is not reachable');
        });
    });

    describe('with success and component notices', () => {
        let now: number;
        beforeEach(() => {
            now = 5000;
            spyOn(Date, 'now').and.callFake(() => now);
        });

        it('keeps the error text open when a success notice follows, until the window is over', () => {
            service.handleError('Svc', 'm')(httpError('http://devices.test/x', 503));
            snackSuccess(snackBar, 'Saved');
            expect(snackBar.open).toHaveBeenCalledTimes(1);

            now += ERROR_SNACK_WINDOW_MS;
            snackSuccess(snackBar, 'Saved');
            expect(snackBar.open.calls.mostRecent().args[0]).toBe('Saved');
        });

        it('opens success normally after the error notice was dismissed', () => {
            service.handleError('Svc', 'm')(httpError('http://devices.test/x', 503));
            dismissed[0].next();
            snackSuccess(snackBar, 'Saved');
            expect(snackBar.open.calls.mostRecent().args[0]).toBe('Saved');
        });

        it('merges a component error within the window and still does not repeat the central text', () => {
            const handler = service.handleError('Svc', 'm');
            handler(httpError('http://devices.test/x', 503));
            snackError(snackBar, 'Could not save');
            expect(snackBar.open.calls.mostRecent().args[0]).toBe('Could not save (device-repo: request failed (503))');

            handler(httpError('http://devices.test/y', 503));
            expect(snackBar.open).toHaveBeenCalledTimes(2);
        });

        it('handleErrorWithSnackBar merges with a central text of the same failure', () => {
            service.handleError('Svc', 'm')(httpError('http://devices.test/x', 503));
            service.handleErrorWithSnackBar('Could not save', 'Svc', 'm2')(httpError('http://devices.test/x', 503));
            expect(snackBar.open.calls.mostRecent().args[0]).toBe('Could not save (device-repo: request failed (503))');
        });
    });
});
