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
});
