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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MAX_REJECT_REASON_LENGTH, RejectDialogComponent } from './reject-dialog.component';

describe('RejectDialogComponent', () => {
    let fixture: ComponentFixture<RejectDialogComponent>;
    let component: RejectDialogComponent;
    let close: jasmine.Spy;

    function init() {
        close = jasmine.createSpy('close');
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, RejectDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close } },
                { provide: MAT_DIALOG_DATA, useValue: { name: 'Heating' } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        });
        fixture = TestBed.createComponent(RejectDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    const rejectButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('mat-dialog-actions button[matButton="filled"]');

    function fill(reason: string) {
        component.reason = reason;
        fixture.detectChanges();
    }

    it('names the smart service and offers Reject only with a reason', () => {
        init();

        expect(fixture.nativeElement.textContent).toContain('Heating');
        expect(rejectButton().disabled).toBeTrue();

        fill('  \n ');
        expect(rejectButton().disabled).toBeTrue();

        fill('Name the exports');
        expect(rejectButton().disabled).toBeFalse();
    });

    it('accepts a reason of exactly 10000 characters and refuses one more', () => {
        init();

        fill('a'.repeat(MAX_REJECT_REASON_LENGTH));
        expect(component.canReject()).toBeTrue();

        fill('a'.repeat(MAX_REJECT_REASON_LENGTH + 1));
        expect(component.canReject()).toBeFalse();
        expect(rejectButton().disabled).toBeTrue();
    });

    it('counts characters, not UTF-16 units, as the service does', () => {
        init();

        fill('\u{1F600}'.repeat(MAX_REJECT_REASON_LENGTH));

        expect(component.reasonLength).toBe(MAX_REJECT_REASON_LENGTH);
        expect(component.canReject()).toBeTrue();
    });

    it('closes with the reason as typed', () => {
        init();
        fill(' Name the exports\n');

        component.reject();

        expect(close).toHaveBeenCalledOnceWith(' Name the exports\n');
    });

    it('closes with nothing while the reason is missing or too long', () => {
        init();
        fill('');
        component.reject();
        fill('a'.repeat(MAX_REJECT_REASON_LENGTH + 1));
        component.reject();

        expect(close).not.toHaveBeenCalled();
    });

    it('closes without a result on Cancel', () => {
        init();

        component.cancel();

        expect(close).toHaveBeenCalledOnceWith();
    });
});
