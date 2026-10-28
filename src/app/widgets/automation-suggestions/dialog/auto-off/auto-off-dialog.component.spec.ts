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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AutoOffDialogComponent } from './auto-off-dialog.component';

describe('AutoOffDialogComponent', () => {
    let dialogRef: jasmine.SpyObj<MatDialogRef<AutoOffDialogComponent, string>>;

    beforeEach(() => {
        dialogRef = jasmine.createSpyObj<MatDialogRef<AutoOffDialogComponent, string>>('MatDialogRef', ['close']);
    });

    /** The dialog without rendering it: only its logic is under test here. */
    const create = (data: { seconds: string }): AutoOffDialogComponent => {
        TestBed.configureTestingModule({
            providers: [{ provide: MatDialogRef, useValue: dialogRef }, { provide: MAT_DIALOG_DATA, useValue: data }],
        });
        return TestBed.runInInjectionContext(() => new AutoOffDialogComponent());
    };

    it('closes with the typed delay, trimmed, when it is a whole number from 5 to 3600', () => {
        const dialog = create({ seconds: '140' });
        dialog.seconds.setValue(' 180 ');
        dialog.set();

        expect(dialogRef.close).toHaveBeenCalledWith('180');
    });

    it('refuses a delay out of range and closes with nothing on cancel', () => {
        const dialog = create({ seconds: '4' });
        expect(dialog.seconds.invalid).toBeTrue();
        dialog.set();
        expect(dialogRef.close).not.toHaveBeenCalled();

        dialog.cancel();
        expect(dialogRef.close).toHaveBeenCalledWith();
    });
});
