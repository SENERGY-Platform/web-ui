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
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { DeviceTypesOverviewComponent } from './device-types-overview.component';
import { DeviceTypeService } from './shared/device-type.service';
import { DeviceInstancesDialogService } from '../../devices/device-instances/shared/device-instances-dialog.service';
import { CoreModule } from '../../../core/core.module';
import { DeviceTypeModel } from './shared/device-type.model';

describe('DeviceTypesOverviewComponent list', () => {
    let component: DeviceTypesOverviewComponent;
    let fixture: ComponentFixture<DeviceTypesOverviewComponent>;

    const service: Spy<DeviceTypeService> = createSpyFromClass<DeviceTypeService>(DeviceTypeService);
    const instancesDialog = jasmine.createSpyObj<DeviceInstancesDialogService>('DeviceInstancesDialogService', ['openDeviceCreateDialog']);
    const plug: DeviceTypeModel = { id: 'urn:infai:ses:device-type:plug', name: 'Plug', description: '', services: [], device_class_id: 'urn:infai:ses:device-class:lamp' };

    function init(rights = { update: true, delete: true, create: true }) {
        service.getDeviceTypes.and.returnValue(of({ result: [plug], total: 1 }));
        service.getDeviceClasses.and.returnValue(of([]));
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        service.userHasCreateAuthorization.and.returnValue(rights.create);

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, DeviceTypesOverviewComponent],
            providers: [
                { provide: DeviceTypeService, useValue: service },
                { provide: DeviceInstancesDialogService, useValue: instancesDialog },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(DeviceTypesOverviewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.getDeviceTypes.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getDeviceTypes.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getDeviceTypes).toHaveBeenCalledTimes(1);
    }));

    it('opens the page in edit mode on a row click with update permission, in details mode without it', fakeAsync(() => {
        init();
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

        component.openDeviceType(plug);
        expect(navigate.calls.mostRecent().args[1]).toEqual({ queryParams: { function: 'edit' } });

        component.userHasUpdateAuthorization = false;
        component.openDeviceType(plug);
        expect(navigate.calls.mostRecent().args[1]).toEqual({ queryParams: { function: 'details' } });
        discardPeriodicTasks();
    }));

    it('takes the create button from the create right and the selection column from the delete right', fakeAsync(() => {
        init({ update: false, delete: false, create: true });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).not.toBeNull();
        expect(component.displayedColumns).not.toContain('select');
    }));

    it('hides the create button without the create right', fakeAsync(() => {
        init({ update: true, delete: true, create: false });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
    }));

    it('names the device class from the loaded classes', fakeAsync(() => {
        init();
        component.deviceClasses = [{ id: plug.device_class_id, name: 'Lamp', image: '' }];
        discardPeriodicTasks();

        expect(component.deviceClassName(plug.device_class_id)).toBe('Lamp');
        expect(component.deviceClassName('unknown')).toBe('');
    }));
});
