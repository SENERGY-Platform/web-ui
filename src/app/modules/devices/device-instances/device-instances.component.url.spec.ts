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

import { discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { DeviceInstancesComponent } from './device-instances.component';
import { DeviceInstancesDialogService } from './shared/device-instances-dialog.service';
import { DeviceInstancesService } from './shared/device-instances.service';
import { KeepPageInRangeDirective } from '../../../core/directives/keep-page-in-range.directive';
import { DialogsService } from '../../../core/services/dialogs.service';
import { ExportDataService } from '../../../widgets/shared/export-data.service';
import { DeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';

describe('DeviceInstancesComponent page in the URL', () => {
    let getDeviceInstances: jasmine.Spy;

    /** A service without rights and without answers, apart from the given methods. */
    const stub = (methods: { [name: string]: unknown } = {}) =>
        new Proxy({}, { get: (_target, name: string) => (name === 'then' ? undefined : (methods[name] ?? (() => false))) });

    beforeEach(() => {
        localStorage.removeItem('PreferencesService/pageSize');
        getDeviceInstances = jasmine.createSpy('getDeviceInstances').and.returnValue(of({ result: [], total: 100 }));
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [DeviceInstancesComponent],
            imports: [NoopAnimationsModule, MatDialogModule, MatSnackBarModule, MatMenuModule, MatTableModule, MatSortModule, MatPaginatorModule, KeepPageInRangeDirective],
            providers: [
                provideRouter([]),
                { provide: DeviceInstancesService, useValue: stub({ getDeviceInstances }) },
                { provide: DeviceInstancesDialogService, useValue: stub() },
                { provide: PermissionsDialogService, useValue: stub() },
                { provide: DialogsService, useValue: stub() },
                { provide: DeviceTypeService, useValue: stub() },
                { provide: ExportDataService, useValue: stub() },
                { provide: PermissionsService, useValue: stub() },
            ],
        });
    });

    function open(url: string) {
        const router = TestBed.inject(Router);
        router.navigateByUrl(url);
        tick();
        const fixture = TestBed.createComponent(DeviceInstancesComponent);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
        tick(400);
        return { fixture, router };
    }

    it('loads once on opening, with the page of the URL', fakeAsync(() => {
        const { fixture, router } = open('/?page=3&network-id=hub-1');
        discardPeriodicTasks();
        flush();

        expect(getDeviceInstances).toHaveBeenCalledTimes(1);
        expect(getDeviceInstances.calls.mostRecent().args[0].offset).toBe(60);
        expect(getDeviceInstances.calls.mostRecent().args[0].hubId).toBe('hub-1');
        expect(fixture.componentInstance.pageIndex).toBe(3);
        expect(router.url).toBe('/?page=3&network-id=hub-1');
    }));

    it('reloads on another filter, not on another parameter of the URL', fakeAsync(() => {
        const { router } = open('/?page=3&network-id=hub-1');
        getDeviceInstances.calls.reset();

        router.navigateByUrl('/?page=4&network-id=hub-1&search=foo');
        tick(400);
        expect(getDeviceInstances).not.toHaveBeenCalled();

        router.navigateByUrl('/?page=4&network-id=hub-2&search=foo');
        tick(400);
        discardPeriodicTasks();
        flush();
        expect(getDeviceInstances).toHaveBeenCalledTimes(1);
        expect(getDeviceInstances.calls.mostRecent().args[0].hubId).toBe('hub-2');
    }));
});
