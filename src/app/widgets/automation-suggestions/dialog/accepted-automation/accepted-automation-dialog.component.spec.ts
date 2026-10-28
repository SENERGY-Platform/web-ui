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
import { AutoOffChoice } from '../../shared/automation-suggestion.model';
import { AcceptedAutomationDialogComponent } from './accepted-automation-dialog.component';

describe('AcceptedAutomationDialogComponent', () => {
    let dialogRef: jasmine.SpyObj<MatDialogRef<AcceptedAutomationDialogComponent, AutoOffChoice>>;

    beforeEach(() => {
        dialogRef = jasmine.createSpyObj<MatDialogRef<AcceptedAutomationDialogComponent, AutoOffChoice>>('MatDialogRef', ['close']);
    });

    /** The dialog without rendering it: only its logic is under test here. */
    const create = (data: AutoOffChoice): AcceptedAutomationDialogComponent => {
        TestBed.configureTestingModule({
            providers: [{ provide: MatDialogRef, useValue: dialogRef }, { provide: MAT_DIALOG_DATA, useValue: data }],
        });
        return TestBed.runInInjectionContext(() => new AcceptedAutomationDialogComponent());
    };

    it('saves the switch-off with the delay as typed', () => {
        const dialog = create({ enabled: true, seconds: '140' });
        dialog.seconds.setValue('240');
        dialog.save();

        expect(dialogRef.close).toHaveBeenCalledWith({ enabled: true, seconds: '240' });
    });

    it('saves without a delay check while the switch-off is off', () => {
        const dialog = create({ enabled: false, seconds: '' });
        expect(dialog.seconds.disabled).toBeTrue();
        expect(dialog.canSave()).toBeTrue();
        dialog.save();

        expect(dialogRef.close).toHaveBeenCalledWith({ enabled: false, seconds: '' });
    });

    it('does not save an out-of-range delay while the switch-off is on, and validates again when it is switched on', () => {
        const dialog = create({ enabled: false, seconds: '4' });
        dialog.setEnabled(true);
        expect(dialog.seconds.enabled).toBeTrue();
        expect(dialog.canSave()).toBeFalse();
        dialog.save();
        expect(dialogRef.close).not.toHaveBeenCalled();

        dialog.setEnabled(false);
        expect(dialog.canSave()).toBeTrue();
    });
});
