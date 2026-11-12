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
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { of } from 'rxjs';

import { DIALOG_WIDTHS } from '../../../../core/dialog-size';
import { DesignerDialogService } from './designer-dialog.service';

describe('DesignerDialogService dialog sizes', () => {
    // Without a size Material caps a dialog at 560px, and the editor stuck out of it
    it('opens wide, within narrow screens', () => {
        const open = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(undefined) });
        TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: { open } }] });
        TestBed.inject(DesignerDialogService).openScriptEditorDialog({ script: '', scriptFormat: 'javascript' } as any, []);
        const config: MatDialogConfig = open.calls.mostRecent().args[1];
        expect(config.width).toBe(DIALOG_WIDTHS.xl);
        expect(config.maxWidth).toBe('95vw');
    });

    it('opens the process io dialog wide enough for its fields', () => {
        const open = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(null) });
        TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: { open } }] });
        TestBed.inject(DesignerDialogService).openProcessIoDialog({ set: [], get: [] } as any);
        const config: MatDialogConfig = open.calls.mostRecent().args[1];
        expect(config.width).toBe(DIALOG_WIDTHS.l);
        expect(config.maxWidth).toBe('95vw');
    });
});
