/*
 * Copyright 2021 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { WaitingRoomComponent } from './waiting-room.component';
import { WaitingRoomService } from './shared/waiting-room.service';

// Built in an injection context instead of rendered: only the delete handler is under test.
const deleteWith = (status: number): jasmine.Spy => {
    const snackOpen = jasmine.createSpy('open');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            { provide: MatDialog, useValue: {} },
            { provide: ChangeDetectorRef, useValue: {} },
            { provide: SearchbarService, useValue: {} },
            { provide: WaitingRoomService, useValue: { deleteDevice: () => of({ status }) } },
            { provide: MatSnackBar, useValue: { open: snackOpen } },
            { provide: DialogsService, useValue: { openDeleteDialog: () => ({ afterClosed: () => of(true) }) } },
            { provide: PreferencesService, useValue: { pageSize: 20 } },
        ],
    });
    TestBed.runInInjectionContext(() => new WaitingRoomComponent()).deleteDevice('local-1');
    return snackOpen;
};

describe('WaitingRoomComponent delete', () => {
    it('reports success when the device was deleted', () => {
        const snackOpen = deleteWith(204);
        expect(snackOpen).toHaveBeenCalledWith('Device deleted', undefined, { duration: 2000 });
    });

    it('reports a failed delete as an error, not as success', () => {
        const snackOpen = deleteWith(404);
        expect(snackOpen).toHaveBeenCalledWith('Device could not be deleted', 'close', { panelClass: 'snack-bar-error' });
        expect(snackOpen).not.toHaveBeenCalledWith('Device could not be deleted', undefined, jasmine.anything());
    });
});
