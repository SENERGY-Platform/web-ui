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
import { By } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { NetworksComponent } from './networks.component';
import { NetworksService } from './shared/networks.service';
import { ExtendedHubModel, HubHealthModel, HubModuleVersion, readHubHealthReport } from './shared/networks.model';
import { DeviceInstancesService } from '../device-instances/shared/device-instances.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { CoreModule } from '../../../core/core.module';

describe('NetworksComponent updates column', () => {
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
    const moduleVersion = (name: string, version: string, nextVersion = '', id = 'github.com/SENERGY-Platform/' + name): HubModuleVersion => ({
        id, name, source: 'https://github.com/SENERGY-Platform', channel: 'main', version, next_version: nextVersion,
    });
    const report = (hubId: string, body: unknown, stale = false): HubHealthModel => ({
        hub_id: hubId, state: 1, reasons: [], report: body, report_time: '', received: '', stale,
    });

    const hubs = ['current', 'pending', 'many', 'unreported', 'null-modules', 'silent'].map((name) => hub('urn:hub:' + name));
    const defaultReports = [
        report('urn:hub:current', { module_versions: [moduleVersion('MQTT Device Connector', 'v1.0.40')] }),
        report('urn:hub:pending', { module_versions: [moduleVersion('MQTT Device Connector', 'v1.0.36', 'v1.0.40')] }),
        report('urn:hub:many', {
            module_versions: [
                moduleVersion('MQTT Device Connector', 'v1.0.36', 'v1.0.40'),
                moduleVersion('Zigbee Device Connector', 'v2.0.1', 'v2.0.3'),
                moduleVersion('', 'v0.9.0', 'v0.9.1', 'github.com/SENERGY-Platform/mgw-lora'),
            ],
        }),
        report('urn:hub:unreported', {}),
        report('urn:hub:null-modules', { module_versions: null, module_versions_error: 'read failed: timeout' }),
    ];

    function init(options: { reports?: HubHealthModel[]; hubs?: ExtendedHubModel[] } = {}) {
        service.listExtendedHubs.and.returnValue(of({ result: options.hubs ?? hubs, total: (options.hubs ?? hubs).length }));
        service.queryHubHealth.and.returnValue(of(options.reports ?? defaultReports));
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
                { provide: AuthorizationService, useValue: { userIsAdmin: () => false } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(NetworksComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    const updateCells = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('td.mat-column-updates'));
    const tooltipIn = (cell: HTMLElement): string | undefined => {
        const host = fixture.debugElement.queryAll(By.directive(MatTooltip)).find((d) => cell.contains(d.nativeElement));
        return host?.injector.get(MatTooltip).message;
    };

    afterEach(() => {
        service.listExtendedHubs.calls.reset();
        service.queryHubHealth.calls.reset();
        getUserById.calls.reset();
        snackBar.open.calls.reset();
    });

    it('puts the updates column directly after the health column and does not sort it', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const columns = component.displayedColumns;
        expect(columns[columns.indexOf('health') + 1]).toBe('updates');
        expect(fixture.nativeElement.querySelector('th.mat-column-updates').textContent.trim()).toBe('Updates');
        expect(fixture.nativeElement.querySelector('th.mat-column-updates').classList).not.toContain('mat-sort-header');
    }));

    it('shows up to date, the count of pending updates, a dash for an unreported gateway and a dash for no report', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const cells = updateCells();
        expect(cells.map((c) => c.textContent?.trim())).toEqual(['Up to date', '1 update', '3 updates', '–', '–', '–']);
        expect(cells[0].querySelector('.status-chip.online')).not.toBeNull();
        expect(cells[1].querySelector('.status-chip.warning')).not.toBeNull();
        expect(cells[2].querySelector('.status-chip.warning')).not.toBeNull();
        expect(cells[3].querySelector('.muted')).not.toBeNull();
    }));

    it('lists the pending modules in the order the gateway reported them, with the id for a module without name', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(tooltipIn(updateCells()[2])).toBe([
            'MQTT Device Connector v1.0.36 → v1.0.40',
            'Zigbee Device Connector v2.0.1 → v2.0.3',
            'github.com/SENERGY-Platform/mgw-lora v0.9.0 → v0.9.1',
        ].join('; '));
    }));

    it('shows the generic reason as the tooltip of a dash when the gateway does not report module versions', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(tooltipIn(updateCells()[3])).toBe('Gateway does not report module versions');
    }));

    it('shows the gateway error as the tooltip of a dash when module versions are null', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(tooltipIn(updateCells()[4])).toBe('read failed: timeout');
    }));

    it('shows a dash without tooltip when the hub has no health report', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(tooltipIn(updateCells()[5])).toBe('');
    }));

    it('reads a malformed report as unknown and shows the generic reason', fakeAsync(() => {
        init({ hubs: [hub('urn:hub:malformed')], reports: [report('urn:hub:malformed', { module_versions: 'not a list' })] });
        discardPeriodicTasks();

        expect(updateCells()[0].textContent?.trim()).toBe('–');
        expect(tooltipIn(updateCells()[0])).toBe('Gateway does not report module versions');
    }));

    it('shows the updates of an inactive hub and of a stale report', fakeAsync(() => {
        const inactive = { ...hub('urn:hub:inactive'), attributes: [{ key: 'inactive', value: 'true', origin: 'web-ui' }] };
        init({
            hubs: [inactive, hub('urn:hub:stale')],
            reports: [
                report('urn:hub:inactive', { module_versions: [moduleVersion('MQTT Device Connector', 'v1.0.36', 'v1.0.40')] }),
                report('urn:hub:stale', { module_versions: [moduleVersion('MQTT Device Connector', 'v1.0.36', 'v1.0.40')] }, true),
            ],
        });
        discardPeriodicTasks();

        expect(updateCells().map((c) => c.textContent?.trim())).toEqual(['1 update', '1 update']);
    }));

    it('reads the module versions of a well-formed report', () => {
        const modules = [moduleVersion('MQTT Device Connector', 'v1.0.36', 'v1.0.40')];

        expect(readHubHealthReport({ module_versions: modules, module_versions_error: '' })).toEqual({ module_versions: modules, module_versions_error: '' });
        expect(readHubHealthReport({ module_versions: null, module_versions_error: 'read failed' })).toEqual({ module_versions: null, module_versions_error: 'read failed' });
        expect(readHubHealthReport({})).toEqual({ module_versions: undefined, module_versions_error: undefined });
    });

    it('returns undefined for a malformed report', () => {
        expect(readHubHealthReport(undefined)).toBeUndefined();
        expect(readHubHealthReport(null)).toBeUndefined();
        expect(readHubHealthReport('report')).toBeUndefined();
        expect(readHubHealthReport({ module_versions: 'list' })).toBeUndefined();
        expect(readHubHealthReport({ module_versions: [{ id: 'a', name: 'b' }] })).toBeUndefined();
        expect(readHubHealthReport({ module_versions: [moduleVersion('MQTT', 'v1', '', 'id')], module_versions_error: 3 })).toBeUndefined();
    });
});
