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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { NetworksComponent } from './networks.component';
import { NetworksService } from './shared/networks.service';
import { ExtendedHubModel, HubHealthModel } from './shared/networks.model';
import { DeviceInstancesService } from '../device-instances/shared/device-instances.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { CoreModule } from '../../../core/core.module';

describe('NetworksComponent health and owner columns', () => {
    let component: NetworksComponent;
    let fixture: ComponentFixture<NetworksComponent>;

    const service: Spy<NetworksService> = createSpyFromClass<NetworksService>(NetworksService);
    const getUserById = jasmine.createSpy('getUserById');
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const hub = (id: string, shared = false): ExtendedHubModel => ({
        id, name: 'Gateway ' + id, hash: '', owner_id: 'owner-' + id, device_local_ids: [], device_ids: null,
        connection_state: 'online', shared,
        permissions: { read: true, write: true, administrate: true, execute: true },
    });
    const report = (hubId: string, state: number, stale = false, reasons: string[] = []): HubHealthModel => ({
        hub_id: hubId, state, reasons, report: {}, report_time: '', received: '2026-10-12T08:30:00', stale,
    });
    const hubs = ['healthy', 'unhealthy', 'undetermined', 'stale', 'silent'].map((name) => hub('urn:hub:' + name));

    function init(options: { admin?: boolean; reports?: HubHealthModel[]; hubs?: ExtendedHubModel[] } = {}) {
        service.listExtendedHubs.and.returnValue(of({ result: options.hubs ?? hubs, total: (options.hubs ?? hubs).length }));
        service.queryHubHealth.and.returnValue(of(options.reports ?? [
            report('urn:hub:healthy', 1),
            report('urn:hub:unhealthy', 2, false, ['no heartbeat', 'disk full']),
            report('urn:hub:undetermined', 0),
            report('urn:hub:stale', 1, true),
        ]));
        service.userHasUpdateAuthorization.and.returnValue(true);
        service.userHasDeleteAuthorization.and.returnValue(true);
        service.userHasCreateAuthorization.and.returnValue(true);
        service.userHasShareAuthorization.and.returnValue(true);
        service.userHasLoraCertAuthorization.and.returnValue(false);
        getUserById.and.callFake((id: string) => of({ id, username: 'name of ' + id }));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatPaginatorModule, NetworksComponent],
            providers: [
                { provide: NetworksService, useValue: service },
                { provide: DeviceInstancesService, useValue: {} },
                { provide: PermissionsService, useValue: { getUserById } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: MatDialog, useValue: {} },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: AuthorizationService, useValue: { userIsAdmin: () => options.admin ?? false } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(NetworksComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    const healthCells = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('td.mat-column-health'));

    afterEach(() => {
        service.listExtendedHubs.calls.reset();
        service.queryHubHealth.calls.reset();
        getUserById.calls.reset();
        snackBar.open.calls.reset();
    });

    it('shows a chip per state, outdated for a stale report and a dash without a report', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const cells = healthCells();
        expect(cells.map((c) => c.textContent?.trim())).toEqual(['Healthy', 'Unhealthy', 'Undetermined', 'Outdated', '–']);
        expect(cells[0].querySelector('.status-chip.online')).not.toBeNull();
        expect(cells[1].querySelector('.status-chip.failed')).not.toBeNull();
        expect(cells[2].querySelector('.status-chip.warning')).not.toBeNull();
        expect(cells[3].querySelector('.status-chip.muted')).not.toBeNull();
        expect(cells[4].querySelector('.status-chip')).toBeNull();
    }));

    it('shows an inactive hub as inactive whatever its report says', fakeAsync(() => {
        const inactive = { ...hub('urn:hub:inactive'), attributes: [{ key: 'inactive', value: 'true', origin: 'web-ui' }] };
        const notInactive = { ...hub('urn:hub:flagged-off'), attributes: [{ key: 'inactive', value: 'false', origin: 'web-ui' }] };
        init({ hubs: [inactive, notInactive], reports: [report('urn:hub:inactive', 2, false, ['no heartbeat']), report('urn:hub:flagged-off', 2)] });
        discardPeriodicTasks();

        const cells = healthCells();
        expect(cells.map((c) => c.textContent?.trim())).toEqual(['Inactive', 'Unhealthy']);
        expect(cells[0].querySelector('.status-chip.muted')).not.toBeNull();
        expect(cells[0].querySelector('.status-chip.failed')).toBeNull();
    }));

    it('puts the health column directly after the connection and does not sort it', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const columns = component.displayedColumns;
        expect(columns[columns.indexOf('connection') + 1]).toBe('health');
        expect(fixture.nativeElement.querySelector('th.mat-column-health').classList).not.toContain('mat-sort-header');
    }));

    it('names the reasons and the report time in the tooltip', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(component.healthTooltip(report('x', 2, false, ['no heartbeat', 'disk full'])))
            .toBe('no heartbeat; disk full. Reported 12.10.2026 08:30');
        expect(component.healthTooltip(report('x', 1))).toBe('Reported 12.10.2026 08:30');
    }));

    it('queries the health of the ids of the loaded page', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(service.queryHubHealth).toHaveBeenCalledOnceWith(hubs.map((h) => h.id));
    }));

    it('queries the health again when the list reloads', fakeAsync(() => {
        init();
        service.queryHubHealth.calls.reset();

        component.reload();
        discardPeriodicTasks();

        expect(service.queryHubHealth).toHaveBeenCalledTimes(1);
    }));

    it('shows dashes and no snack bar when the health query is answered with nothing', fakeAsync(() => {
        init({ reports: [] });
        discardPeriodicTasks();

        expect(healthCells().map((c) => c.textContent?.trim())).toEqual(['–', '–', '–', '–', '–']);
        expect(snackBar.open).not.toHaveBeenCalled();
    }));

    it('has the owner column for an admin and resolves the owner of every row', fakeAsync(() => {
        init({ admin: true });
        discardPeriodicTasks();

        const columns = component.displayedColumns;
        expect(columns[columns.indexOf('shared') + 1]).toBe('owner');
        expect(fixture.nativeElement.querySelector('th.mat-column-owner').textContent.trim()).toBe('Owner');
        expect(getUserById).toHaveBeenCalledTimes(hubs.length);
        const owner = fixture.nativeElement.querySelector('td.mat-column-owner') as HTMLElement;
        expect(owner.textContent?.trim()).toBe('name of owner-urn:hub:healthy');
        expect(owner.classList).toContain('muted');
    }));

    it('shows the raw owner id while the name is unknown', fakeAsync(() => {
        init({ admin: true });
        getUserById.calls.reset();
        component.userIdToName = {};
        fixture.detectChanges();
        discardPeriodicTasks();

        expect((fixture.nativeElement.querySelector('td.mat-column-owner') as HTMLElement).textContent?.trim()).toBe('owner-urn:hub:healthy');
    }));

    it('has no owner column for a non-admin and resolves only the owners of shared rows', fakeAsync(() => {
        init({ hubs: [hub('urn:hub:own'), hub('urn:hub:shared', true)] });
        discardPeriodicTasks();

        expect(component.displayedColumns).not.toContain('owner');
        expect(fixture.nativeElement.querySelector('td.mat-column-owner')).toBeNull();
        expect(getUserById.calls.allArgs()).toEqual([['owner-urn:hub:shared']]);
    }));
});
