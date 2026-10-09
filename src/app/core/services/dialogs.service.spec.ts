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
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { DialogsService } from './dialogs.service';
import { DeleteDialogComponent, DeleteDialogResponse } from '../dialogs/delete-dialog.component';
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog.component';
import { InputDialogComponent } from '../dialogs/input-dialog.component';

describe('DialogsService', () => {
    let service: DialogsService;
    let open: jasmine.Spy;

    beforeEach(() => {
        open = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(undefined) });
        TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: { open } }] });
        service = TestBed.inject(DialogsService);
    });

    it('opens the delete dialog with autoFocus and the text, options undefined', () => {
        service.openDeleteDialog('release');
        expect(open).toHaveBeenCalledTimes(1);
        const [component, config] = open.calls.mostRecent().args;
        expect(component).toBe(DeleteDialogComponent);
        expect(config.autoFocus).toBeTrue();
        expect(config.data).toEqual({ text: 'release', options: undefined });
    });

    it('passes delete dialog options through as data', () => {
        const options = { checkboxText: 'All', checkboxDefault: true, note: 'n' };
        service.openDeleteDialog('release', options);
        expect(open.calls.mostRecent().args[1].data).toEqual({ text: 'release', options });
    });

    it('opens the confirm dialog with autoFocus, title and text', () => {
        service.openConfirmDialog('Title', 'Text');
        const [component, config] = open.calls.mostRecent().args;
        expect(component).toBe(ConfirmDialogComponent);
        expect(config.autoFocus).toBeTrue();
        expect(config.data).toEqual({ title: 'Title', text: 'Text' });
    });

    it('opens the input dialog with autoFocus, title, fields and required', () => {
        const fields = { name: 'a' };
        service.openInputDialog('Title', fields, ['name']);
        const [component, config] = open.calls.mostRecent().args;
        expect(component).toBe(InputDialogComponent);
        expect(config.autoFocus).toBeTrue();
        expect(config.data).toEqual({ title: 'Title', fields, required: ['name'] });
    });

    it('returns the ref of MatDialog.open', () => {
        const ref = { afterClosed: () => of(true) };
        open.and.returnValue(ref);
        expect(service.openDeleteDialog('x')).toBe(ref as never);
    });

    it('types the results by overload', () => {
        // Compile-time check: a plain delete yields boolean | undefined, with options a DeleteDialogResponse | undefined.
        service.openDeleteDialog('x').afterClosed().subscribe((r: boolean | undefined) => r);
        service.openDeleteDialog('x', { note: 'n' }).afterClosed().subscribe((r: DeleteDialogResponse | undefined) => r);
        expect(open).toHaveBeenCalledTimes(2);
    });
});
