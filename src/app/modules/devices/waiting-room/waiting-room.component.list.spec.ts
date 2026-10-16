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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { delay } from 'rxjs/operators';
import { EMPTY, of } from 'rxjs';

import { WaitingRoomComponent } from './waiting-room.component';
import { WaitingRoomService } from './shared/waiting-room.service';
import { WaitingDeviceModel } from './shared/waiting-room.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';

describe('WaitingRoomComponent list', () => {
    let component: WaitingRoomComponent;
    let fixture: ComponentFixture<WaitingRoomComponent>;

    const service: Spy<WaitingRoomService> = createSpyFromClass<WaitingRoomService>(WaitingRoomService);
    const dialogStub = { open: jasmine.createSpy('open') };
    const device: WaitingDeviceModel = {
        local_id: 'l1', name: 'Meter', device_type_id: 'dt', hidden: true, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-02T10:00:00Z',
    };

    function init(devices: WaitingDeviceModel[] = [device]) {
        service.searchDevices.and.returnValue(of({ result: devices, total: devices.length }).pipe(delay(1)));
        service.events.and.returnValue(EMPTY);
        dialogStub.open.and.returnValue({ afterClosed: () => of(undefined) });

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, WaitingRoomComponent],
            providers: [
                { provide: WaitingRoomService, useValue: service },
                { provide: DialogsService, useValue: {} },
                { provide: MatDialog, useValue: dialogStub },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(WaitingRoomComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.searchDevices.calls.reset();
        dialogStub.open.calls.reset();
        localStorage.removeItem('devices.waiting-room.showHidden');
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.searchDevices.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.searchDevices).toHaveBeenCalledTimes(1);
    }));

    it('loads once with the hidden devices when the show hidden chip is switched on', fakeAsync(() => {
        init();
        service.searchDevices.calls.reset();

        component.showHiddenChanged(true);
        tick(400);
        discardPeriodicTasks();

        expect(service.searchDevices).toHaveBeenCalledTimes(1);
        expect(service.searchDevices.calls.mostRecent().args[5]).toBeTrue();
    }));

    it('does not keep reloading after a click on the show hidden chip', fakeAsync(() => {
        init();
        service.searchDevices.calls.reset();

        (fixture.nativeElement.querySelector('mat-chip-option button') as HTMLElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.searchDevices).toHaveBeenCalledTimes(1);
        expect(component.showHidden).toBeTrue();
    }));

    it('opens the edit dialog on a row click', fakeAsync(() => {
        init();
        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();

        expect(dialogStub.open.calls.mostRecent().args[1].data.useDialog).toBeFalse();
        discardPeriodicTasks();
    }));

    it('shows one empty state and no second message when nothing is waiting', fakeAsync(() => {
        init([]);
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelectorAll('senergy-empty-state').length).toBe(1);
        expect(fixture.nativeElement.textContent).not.toContain('No devices found.');
    }));

    it('marks a hidden device with a chip', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('tr.clickable-row .type-chip').textContent).toBe('Hidden');
    }));
});
