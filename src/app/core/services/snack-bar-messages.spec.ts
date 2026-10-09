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


import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { ERROR_SNACK_WINDOW_MS, snackCentralError, snackError, snackSuccess } from './snack-bar-messages';

describe('snack-bar-messages', () => {
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    let dismissed: Subject<void>[];
    let now: number;
    const plainRef = {} as MatSnackBarRef<TextOnlySnackBar>;

    beforeEach(() => {
        dismissed = [];
        now = 10_000;
        spyOn(Date, 'now').and.callFake(() => now);
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        snackBar.open.and.callFake(() => {
            const closed = new Subject<void>();
            dismissed.push(closed);
            return { afterDismissed: () => closed } as unknown as MatSnackBarRef<TextOnlySnackBar>;
        });
    });

    it('snackSuccess opens a two second notice without an action', () => {
        snackBar.open.and.returnValue(plainRef);
        expect(snackSuccess(snackBar, 'Saved')).toBe(plainRef);
        expect(snackBar.open).toHaveBeenCalledOnceWith('Saved', undefined, { duration: 2000 });
    });

    it('snackError opens a sticky error notice with a close action', () => {
        snackBar.open.and.returnValue(plainRef);
        expect(snackError(snackBar, 'Failed')).toBe(plainRef);
        expect(snackBar.open).toHaveBeenCalledOnceWith('Failed', 'close', { panelClass: 'snack-bar-error' });
    });

    it('snackSuccess does not replace an error notice opened less than the window ago', () => {
        const error = snackError(snackBar, 'Failed');
        now += ERROR_SNACK_WINDOW_MS - 1;
        expect(snackSuccess(snackBar, 'Saved')).toBe(error);
        expect(snackBar.open).toHaveBeenCalledTimes(1);
    });

    it('snackSuccess opens after the window, even while the older error is still open', () => {
        snackError(snackBar, 'Failed');
        now += ERROR_SNACK_WINDOW_MS;
        snackSuccess(snackBar, 'Saved');
        expect(snackBar.open).toHaveBeenCalledTimes(2);
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Saved');
    });

    it('snackSuccess opens after the error notice was dismissed within the window', () => {
        snackError(snackBar, 'Failed');
        dismissed[0].next();
        snackSuccess(snackBar, 'Saved');
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Saved');
    });

    it('snackError within the window after a central error opens one merged notice', () => {
        snackCentralError(snackBar, 'device-repo: request failed (503)');
        snackError(snackBar, 'Could not save');
        expect(snackBar.open).toHaveBeenCalledTimes(2);
        expect(snackBar.open.calls.mostRecent().args).toEqual([
            'Could not save (device-repo: request failed (503))',
            'close',
            { panelClass: 'snack-bar-error' },
        ]);
    });

    it('snackError after the window replaces the central notice with its own text', () => {
        snackCentralError(snackBar, 'device-repo: request failed (503)');
        now += ERROR_SNACK_WINDOW_MS;
        snackError(snackBar, 'Could not save');
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Could not save');
    });

    it('the central error within the window after a component error is appended to its text', () => {
        snackError(snackBar, 'Could not save');
        snackCentralError(snackBar, 'device-repo: request failed (503)');
        expect(snackBar.open.calls.mostRecent().args[0]).toBe('Could not save (device-repo: request failed (503))');
    });

    it('the same central text is not opened again after a merge, and is again after dismissal', () => {
        const central = 'device-repo: request failed (503)';
        snackCentralError(snackBar, central);
        snackError(snackBar, 'Could not save');
        expect(snackCentralError(snackBar, central)).toBeUndefined();
        expect(snackBar.open).toHaveBeenCalledTimes(2);

        dismissed[1].next();
        snackCentralError(snackBar, central);
        expect(snackBar.open).toHaveBeenCalledTimes(3);
    });

    it('dismissing a replaced notice does not clear the state of the notice that replaced it', () => {
        snackCentralError(snackBar, 'a');
        snackError(snackBar, 'b');
        dismissed[0].next();
        snackSuccess(snackBar, 'Saved');
        expect(snackBar.open).toHaveBeenCalledTimes(2);
    });
});
