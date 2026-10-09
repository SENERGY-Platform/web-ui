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

import { DeleteDialogComponent, DeleteDialogOptions } from './delete-dialog.component';

describe('DeleteDialogComponent', () => {
    let fixture: ComponentFixture<DeleteDialogComponent>;
    let close: jasmine.Spy;

    async function create(options?: DeleteDialogOptions): Promise<void> {
        close = jasmine.createSpy('close');
        await TestBed.configureTestingModule({
            imports: [DeleteDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close } },
                { provide: MAT_DIALOG_DATA, useValue: { text: 'release', options } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(DeleteDialogComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges(); // ngModel writes the checkbox state asynchronously
        await fixture.whenStable();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const buttons = (): HTMLButtonElement[] => Array.from(el().querySelectorAll('button'));
    const checkbox = (): HTMLInputElement | null => el().querySelector('mat-checkbox input');

    describe('without options', () => {
        beforeEach(() => create());

        it('renders the title and the question with the given text', () => {
            expect(el().querySelector('h2')?.textContent?.trim()).toBe('Delete');
            expect(el().querySelector('mat-dialog-content')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
                'Should the release be deleted?',
            );
        });

        it('offers Cancel first and Delete second', () => {
            expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Cancel', 'Delete']);
        });

        it('shows neither checkbox nor note', () => {
            expect(el().querySelector('mat-checkbox')).toBeNull();
            expect(el().querySelectorAll('mat-dialog-content > div').length).toBe(1);
        });

        it('closes with the legacy boolean false on Cancel', () => {
            buttons()[0].click();
            expect(close).toHaveBeenCalledOnceWith(false);
        });

        it('closes with the legacy boolean true on Delete', () => {
            buttons()[1].click();
            expect(close).toHaveBeenCalledOnceWith(true);
        });
    });

    describe('with a checkbox', () => {
        it('starts unchecked by default and reports the state on Delete', async () => {
            await create({ checkboxText: 'Delete all previous releases' });
            expect(el().querySelector('mat-checkbox')?.textContent?.trim()).toBe('Delete all previous releases');
            expect(checkbox()?.checked).toBeFalse();
            buttons()[1].click();
            expect(close).toHaveBeenCalledOnceWith({ confirmed: true, checkboxChecked: false });
        });

        it('starts checked with checkboxDefault', async () => {
            await create({ checkboxText: 'Also delete', checkboxDefault: true });
            expect(checkbox()?.checked).toBeTrue();
            buttons()[1].click();
            expect(close).toHaveBeenCalledOnceWith({ confirmed: true, checkboxChecked: true });
        });

        it('reports a toggled checkbox on Delete', async () => {
            await create({ checkboxText: 'Also delete' });
            checkbox()?.click();
            fixture.detectChanges();
            buttons()[1].click();
            expect(close).toHaveBeenCalledOnceWith({ confirmed: true, checkboxChecked: true });
        });

        it('reports the checkbox state on Cancel with confirmed false', async () => {
            await create({ checkboxText: 'Also delete', checkboxDefault: true });
            buttons()[0].click();
            expect(close).toHaveBeenCalledOnceWith({ confirmed: false, checkboxChecked: true });
        });
    });

    describe('with a note only', () => {
        beforeEach(() => create({ note: 'Meter parents are removed too.' }));

        it('shows the note below the question and no checkbox', () => {
            const rows = Array.from(el().querySelectorAll('mat-dialog-content > div')).map((d) => d.textContent?.trim());
            expect(rows).toEqual(['Should the release be deleted?', 'Meter parents are removed too.']);
            expect(el().querySelector('mat-checkbox')).toBeNull();
        });

        it('closes with an object without checkboxChecked', () => {
            buttons()[1].click();
            expect(close).toHaveBeenCalledOnceWith({ confirmed: true });
            close.calls.reset();
            buttons()[0].click();
            expect(close).toHaveBeenCalledOnceWith({ confirmed: false });
        });
    });
});
