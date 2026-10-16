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
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { NetworksComponent } from './networks.component';
import { NetworksService } from './shared/networks.service';
import { ExtendedHubModel } from './shared/networks.model';
import { DeviceInstancesService } from '../device-instances/shared/device-instances.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';

describe('NetworksComponent list', () => {
    let component: NetworksComponent;
    let fixture: ComponentFixture<NetworksComponent>;

    const service: Spy<NetworksService> = createSpyFromClass<NetworksService>(NetworksService);
    const dialogStub = { open: jasmine.createSpy('open') };
    const hub = (write: boolean): ExtendedHubModel => ({
        id: 'urn:hub:1', name: 'Gateway', hash: '', owner_id: 'u1', device_local_ids: ['a', 'b'], device_ids: null,
        connection_state: 'online', shared: false,
        permissions: { read: true, write, administrate: write, execute: true },
    });

    function init(rights = { update: true, delete: true, create: true }, write = true) {
        service.listExtendedHubs.and.returnValue(of({ result: [hub(write)], total: 1 }));
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        service.userHasShareAuthorization.and.returnValue(true);
        service.userHasLoraCertAuthorization.and.returnValue(false);

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, NetworksComponent],
            providers: [
                { provide: NetworksService, useValue: service },
                { provide: DeviceInstancesService, useValue: {} },
                { provide: PermissionsService, useValue: {} },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: MatDialog, useValue: dialogStub },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(NetworksComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.listExtendedHubs.calls.reset();
        service.openNetworkEditDialog.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.listExtendedHubs.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.listExtendedHubs).toHaveBeenCalledTimes(1);
    }));

    it('shows the create button only with the create right', fakeAsync(() => {
        init({ update: true, delete: true, create: false });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
    }));

    it('has the selection column only with the delete right', fakeAsync(() => {
        init({ update: true, delete: false, create: true });
        discardPeriodicTasks();

        expect(component.displayedColumns).not.toContain('select');
    }));

    it('opens the edit dialog on a row click, read-only without the update right or the write right on the network', fakeAsync(() => {
        init();
        component.open(hub(true));
        expect(service.openNetworkEditDialog.calls.mostRecent().args[1]).toBeFalse();

        component.open(hub(false));
        expect(service.openNetworkEditDialog.calls.mostRecent().args[1]).toBeTrue();

        component.userHasUpdateAuthorization = false;
        component.open(hub(true));
        expect(service.openNetworkEditDialog.calls.mostRecent().args[1]).toBeTrue();
        discardPeriodicTasks();
    }));

    it('shows the connection state as a status chip', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('.status-chip.online').textContent).toBe('Online');
    }));
});
