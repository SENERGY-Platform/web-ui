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

import { TestBed, waitForAsync } from '@angular/core/testing';
import { createSpyFromClass } from 'jasmine-auto-spies';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideAppCharts } from '../../../core/charts/provide-app-charts';
import { EnvironmentDetailComponent } from './environment-detail.component';
import { EnvironmentsService } from '../shared/environments.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceTypeService as PlatformDeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { ExportService } from '../../exports/shared/export.service';
import { environment } from '../../../../environments/environment';
import { CatalogDeviceType, Environment } from '../shared/environments.model';

/**
 * The bodies the editor PUTs to MOSES, pinned as sent: the document as loaded plus the one edit, with the
 * version read on load sent back unchanged. A change here changes what the simulation service receives.
 */
describe('EnvironmentDetailComponent requests', () => {
    const environmentsUrl = environment.mosesUrl + '/environments';
    const loaded: Environment = {
        id: 'e1',
        name: 'Plant A',
        type: 'industrial_site',
        version: 7,
        seed: 1,
        owner: 'u1',
        context: { energy_price: 0.32 },
        timeline: [{ at: '2026-01-01T00:00:00Z', target: 'context.energy_price', value: 0.4 }],
        zones: [
            {
                id: 'z1',
                name: 'Building',
                type: 'building',
                assets: [
                    {
                        id: 'a1',
                        name: 'Meter 1',
                        kind: 'meter',
                        channels: [{ id: 'c1', name: 'Power', direction: 'sensor', source: { kind: 'script', script: { code: 'return 1;' } } }],
                    },
                    { id: 'a2', name: 'Press 1', external_type_id: 't1' },
                ],
            },
        ],
    };
    const deviceType: CatalogDeviceType = {
        id: 't1',
        name: 'Press',
        services: [
            { id: 's1', name: 'Power', direction: 'sensor', characteristic_id: 'watt' },
            { id: 's2', name: 'Switch', direction: 'actuator', characteristic_id: 'bool' },
        ],
    };
    const clone = (env: Environment): Environment => JSON.parse(JSON.stringify(env));

    let component: EnvironmentDetailComponent;
    let httpMock: HttpTestingController;
    let dialogOpen: jasmine.Spy;

    beforeEach(waitForAsync(() => {
        const exportServiceSpy = createSpyFromClass(ExportService);
        exportServiceSpy.getAvailableExports.and.returnValue(of([]));
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, EnvironmentDetailComponent],
            providers: [
                EnvironmentsService,
                DialogsService,
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: () => undefined } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'e1' } } } },
                { provide: DeviceInstancesService, useValue: { getDeviceInstance: () => of(null) } },
                { provide: PlatformDeviceTypeService, useValue: { getDeviceType: () => of(null), getValuePathsAndContentVariables: () => [] } },
                { provide: PermissionsService, useValue: { getUserById: (id: string) => of({ id, username: 'Name of ' + id }) } },
                { provide: ExportService, useValue: exportServiceSpy },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                provideAppCharts(),
            ],
        }).compileComponents();
        httpMock = TestBed.inject(HttpTestingController);
        dialogOpen = spyOn(TestBed.inject(MatDialog), 'open');
        const fixture = TestBed.createComponent(EnvironmentDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        httpMock.expectOne(environmentsUrl + '/e1').flush(clone(loaded));
        httpMock.expectOne(environment.mosesUrl + '/datasets').flush([]);
        httpMock.expectOne(environment.mosesUrl + '/device-types').flush([deviceType]);
        fixture.detectChanges();
    }));

    afterEach(() => {
        httpMock.verify();
    });

    function put(): Environment {
        component.save();
        const req = httpMock.expectOne(environmentsUrl + '/e1');
        expect(req.request.method).toBe('PUT');
        const body = req.request.body as Environment;
        req.flush(clone(body));
        httpMock.expectOne(environmentsUrl + '/e1').flush(clone(body)); // the reload after a success
        return body;
    }

    it('sends the edited node with the loaded version', () => {
        component.select(component.root!.children[0]);
        component.selectedZone!.name = 'Hall';
        component.onZoneNameChange();

        const expected = clone(loaded);
        expected.zones![0].name = 'Hall';
        expect(put()).toEqual(expected);
    });

    it('sends the edited context with the loaded version', () => {
        component.setEnvironmentContext(component.selectedEnvironment!, { energy_price: 0.5, floor_area: 1200 });

        const expected = clone(loaded);
        expected.context = { energy_price: 0.5, floor_area: 1200 };
        expect(put()).toEqual(expected);
    });

    it('sends the edited timeline with the loaded version', () => {
        component.timelineOf(component.selectedEnvironment!).push({ at: '2026-02-01T00:00:00Z', target: 'context.energy_price', value: 0.6 });
        component.onTimelineChange();

        const expected = clone(loaded);
        expected.timeline!.push({ at: '2026-02-01T00:00:00Z', target: 'context.energy_price', value: 0.6 });
        expect(put()).toEqual(expected);
    });

    it('sends the asset of a device type without a device reference, and creates no device itself', () => {
        component.markDirty();

        const body = put();

        expect(body.zones![0].assets![1]).toEqual({ id: 'a2', name: 'Press 1', external_type_id: 't1' });
        httpMock.expectNone(environment.mosesUrl + '/devices');
    });

    it('sends a machine added from the catalog as an asset with its type and one channel per service', () => {
        dialogOpen.and.returnValue({ afterClosed: () => of({ name: 'Press 2', deviceType }) } as unknown as MatDialogRef<unknown>);
        component.addMachine(component.root!.children[0]);

        const body = put();

        const expected = clone(loaded);
        expected.zones![0].assets!.push({
            name: 'Press 2',
            kind: 'machine',
            external_type_id: 't1',
            channels: [
                {
                    name: 'Power',
                    direction: 'sensor',
                    characteristic_id: 'watt',
                    external_ref: 's1',
                    interval_seconds: 30,
                    source: { kind: 'profile', interval_seconds: 0, profile: { base: 0 } },
                },
                {
                    name: 'Switch',
                    direction: 'actuator',
                    characteristic_id: 'bool',
                    external_ref: 's2',
                    interval_seconds: 0,
                    source: { kind: 'script', interval_seconds: 0, script: { code: 'moses.device.state.set("switch", moses.service.input);' } },
                },
            ],
        });
        expect(body).toEqual(expected);
        httpMock.expectNone(environment.mosesUrl + '/devices');
    });

    describe('409 conflict', () => {
        function conflict(): void {
            component.save();
            httpMock.expectOne(environmentsUrl + '/e1').flush('version conflict: you have 7, current is 8', { status: 409, statusText: 'Conflict' });
        }

        beforeEach(() => {
            component.setEnvironmentContext(component.selectedEnvironment!, { energy_price: 0.5 });
        });

        it('keeps the edit and the old version when the user keeps editing, so the next save sends the same body again', () => {
            dialogOpen.and.returnValue({ afterClosed: () => of(false) } as unknown as MatDialogRef<unknown>);
            conflict();
            httpMock.expectNone(environmentsUrl + '/e1');
            expect(component.isDirty).toBe(true);

            component.save();
            const req = httpMock.expectOne(environmentsUrl + '/e1');
            const expected = clone(loaded);
            expected.context = { energy_price: 0.5 };
            expect(req.request.body).toEqual(expected);
            req.flush('version conflict', { status: 409, statusText: 'Conflict' });
        });

        it('reads the document again, without writing, when the user reloads', () => {
            dialogOpen.and.returnValue({ afterClosed: () => of(true) } as unknown as MatDialogRef<unknown>);
            conflict();

            const reload = httpMock.expectOne(environmentsUrl + '/e1');
            expect(reload.request.method).toBe('GET');
            expect(reload.request.body).toBeNull();
            const current = clone(loaded);
            current.version = 8;
            reload.flush(current);
            expect(component.environment?.version).toBe(8);
            expect(component.isDirty).toBe(false);
        });
    });
});
