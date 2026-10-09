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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
    let fixture: ComponentFixture<ConfirmDialogComponent>;
    let close: jasmine.Spy;

    beforeEach(async () => {
        close = jasmine.createSpy('close');
        await TestBed.configureTestingModule({
            imports: [ConfirmDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close } },
                { provide: MAT_DIALOG_DATA, useValue: { title: 'Move Aspect', text: 'Do you want to move it?' } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ConfirmDialogComponent);
        fixture.detectChanges();
    });

    const el = (): HTMLElement => fixture.nativeElement;
    const buttons = (): HTMLButtonElement[] => Array.from(el().querySelectorAll('button'));

    it('renders title and text', () => {
        expect(el().querySelector('h2')?.textContent?.trim()).toBe('Move Aspect');
        expect(el().querySelector('mat-dialog-content')?.textContent?.trim()).toBe('Do you want to move it?');
    });

    it('offers Cancel first and OK second', () => {
        expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Cancel', 'OK']);
    });

    it('closes with false on Cancel', () => {
        buttons()[0].click();
        expect(close).toHaveBeenCalledOnceWith(false);
    });

    it('closes with true on OK', () => {
        buttons()[1].click();
        expect(close).toHaveBeenCalledOnceWith(true);
    });
});
