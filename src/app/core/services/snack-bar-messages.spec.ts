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
import { snackError, snackSuccess } from './snack-bar-messages';

describe('snack-bar-messages', () => {
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    const ref = {} as MatSnackBarRef<TextOnlySnackBar>;

    beforeEach(() => {
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        snackBar.open.and.returnValue(ref);
    });

    it('snackSuccess opens a two second notice without an action', () => {
        expect(snackSuccess(snackBar, 'Saved')).toBe(ref);
        expect(snackBar.open).toHaveBeenCalledOnceWith('Saved', undefined, { duration: 2000 });
    });

    it('snackError opens a sticky error notice with a close action', () => {
        expect(snackError(snackBar, 'Failed')).toBe(ref);
        expect(snackBar.open).toHaveBeenCalledOnceWith('Failed', 'close', { panelClass: 'snack-bar-error' });
    });
});
