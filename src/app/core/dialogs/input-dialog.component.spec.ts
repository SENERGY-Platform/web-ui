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

import { InputDialogComponent } from './input-dialog.component';

describe('InputDialogComponent', () => {
    let fixture: ComponentFixture<InputDialogComponent>;
    let close: jasmine.Spy;
    let fields: { [key: string]: string };

    async function create(required: string[] | null | undefined): Promise<void> {
        close = jasmine.createSpy('close');
        fields = { name: 'Design 1', description: 'first' };
        await TestBed.configureTestingModule({
            imports: [InputDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close } },
                { provide: MAT_DIALOG_DATA, useValue: { title: 'Design Name and Description', fields, required } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(InputDialogComponent);
        fixture.detectChanges();
        await fixture.whenStable();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const buttons = (): HTMLButtonElement[] => Array.from(el().querySelectorAll('button'));
    const inputs = (): HTMLInputElement[] => Array.from(el().querySelectorAll('input'));

    describe('with a required field', () => {
        beforeEach(() => create(['name']));

        it('renders the title and one input per field with a title-cased label', () => {
            expect(el().querySelector('h2')?.textContent?.trim()).toBe('Design Name and Description');
            expect(inputs().map((i) => i.placeholder)).toEqual(['Name', 'Description']);
            expect(Array.from(el().querySelectorAll('mat-label')).map((l) => l.textContent?.trim())).toEqual(['Name', 'Description']);
        });

        it('fills the inputs from the fields and marks only the required one', () => {
            expect(inputs().map((i) => i.value)).toEqual(['Design 1', 'first']);
            expect(inputs().map((i) => i.required)).toEqual([true, false]);
        });

        it('offers Cancel first and OK second', () => {
            expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Cancel', 'OK']);
        });

        it('closes with null on Cancel', () => {
            buttons()[0].click();
            expect(close).toHaveBeenCalledOnceWith(null);
        });

        it('closes with the edited fields on OK', () => {
            const name = inputs()[0];
            name.value = 'Renamed';
            name.dispatchEvent(new Event('input'));
            fixture.detectChanges();
            buttons()[1].click();
            expect(close).toHaveBeenCalledOnceWith({ name: 'Renamed', description: 'first' });
        });
    });

    it('treats missing required as none required', async () => {
        await create(undefined);
        expect(inputs().map((i) => i.required)).toEqual([false, false]);
    });
});
