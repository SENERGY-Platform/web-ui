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

import { DeviceClassesComponent } from './device-classes.component';
import { DeviceClassesService } from './shared/device-classes.service';
import { DeviceTypeService } from '../device-types-overview/shared/device-type.service';
import { CoreModule } from '../../../core/core.module';
import { DeviceTypeDeviceClassModel } from '../device-types-overview/shared/device-type.model';

describe('DeviceClassesComponent list', () => {
    let component: DeviceClassesComponent;
    let fixture: ComponentFixture<DeviceClassesComponent>;

    const service: Spy<DeviceClassesService> = createSpyFromClass<DeviceClassesService>(DeviceClassesService);
    const deviceTypeService: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    const dialogStub = { open: jasmine.createSpy('open') };
    const lamp: DeviceTypeDeviceClassModel = { id: 'urn:infai:ses:device-class:lamp', name: 'Lamp', image: '' };

    function init(rights = { update: true, delete: true, create: true }) {
        service.getDeviceClasses.and.returnValue(of({ result: [lamp], total: 1 }));
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        deviceTypeService.userHasUsedInAuthorization.and.returnValue(false);
        dialogStub.open.and.returnValue({ afterClosed: () => of(undefined) });

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, DeviceClassesComponent],
            providers: [
                { provide: DeviceClassesService, useValue: service },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: MatDialog, useValue: dialogStub },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(DeviceClassesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.getDeviceClasses.calls.reset();
        dialogStub.open.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getDeviceClasses.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getDeviceClasses).toHaveBeenCalledTimes(1);
    }));

    it('takes the create button from the create right, not from the delete right', fakeAsync(() => {
        init({ update: true, delete: false, create: true });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).not.toBeNull();
        expect(component.displayedColumns).not.toContain('select');
    }));

    it('hides the create button without the create right even with the delete right', fakeAsync(() => {
        init({ update: true, delete: true, create: false });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
    }));

    it('opens the edit dialog on a row click with update permission, the read-only view without it', fakeAsync(() => {
        init();

        component.openDeviceClass(lamp);
        expect(dialogStub.open.calls.mostRecent().args[1].data.disabled).toBeUndefined();

        component.userHasUpdateAuthorization = false;
        component.openDeviceClass(lamp);
        expect(dialogStub.open.calls.mostRecent().args[1].data.disabled).toBeTrue();
        discardPeriodicTasks();
    }));
});
