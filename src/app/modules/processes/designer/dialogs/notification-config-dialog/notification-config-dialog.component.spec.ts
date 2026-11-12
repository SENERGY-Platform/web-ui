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
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { NotificationConfigDialogComponent } from './notification-config-dialog.component';

// SNRGY-3911: the window within which the notifier drops a repeated notification
describe('NotificationConfigDialogComponent duplicate window', () => {
    let closed: jasmine.Spy;

    function open(data: { subj: string; content: string; duplicateWindow?: number | null }): NotificationConfigDialogComponent {
        closed = jasmine.createSpy('close');
        TestBed.configureTestingModule({
            imports: [NotificationConfigDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: { close: closed } },
            ],
        });
        const fixture = TestBed.createComponent(NotificationConfigDialogComponent);
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    it('shows the saved window and returns it', () => {
        const dialog = open({ subj: 'Alarm', content: 'too hot', duplicateWindow: 600 });
        expect(dialog.duplicateWindow.value).toBe(600);
        dialog.ok();
        expect(closed).toHaveBeenCalledWith({ subj: 'Alarm', content: 'too hot', duplicateWindow: 600 });
    });

    it('returns none for an empty field', () => {
        const dialog = open({ subj: 'Alarm', content: 'too hot' });
        expect(dialog.duplicateWindow.value).toBeNull();
        dialog.ok();
        expect(closed).toHaveBeenCalledWith({ subj: 'Alarm', content: 'too hot', duplicateWindow: null });
    });

    it('accepts whole seconds from 1 only', () => {
        const dialog = open({ subj: 'Alarm', content: 'too hot' });
        for (const value of [0, -5, 1.5]) {
            dialog.duplicateWindow.setValue(value);
            expect(dialog.isInvalid()).withContext(`${value}`).toBeTrue();
        }
        dialog.duplicateWindow.setValue(1);
        expect(dialog.isInvalid()).toBeFalse();
    });
});
