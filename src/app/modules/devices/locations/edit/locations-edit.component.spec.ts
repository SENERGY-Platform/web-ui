/*
 * Copyright 2020 InfAI (CC SES)
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

import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { CoreModule } from '../../../../core/core.module';
import { LocationsEditComponent } from './locations-edit.component';
import { LocationsService } from '../shared/locations.service';
import { LocationModel } from '../shared/locations.model';
import { DeviceInstancesService } from '../../device-instances/shared/device-instances.service';
import { DeviceGroupsService } from '../../device-groups/shared/device-groups.service';

describe('LocationsEditComponent', () => {
    let component: LocationsEditComponent;
    let fixture: ComponentFixture<LocationsEditComponent>;

    const exampleLocation: LocationModel = {
        id: 'location:id',
        name: 'Office',
        description: 'first floor',
        image: '',
        device_ids: ['device:id-1', 'device:id-2'],
        device_group_ids: ['group:id-1'],
    };

    const devices = [
        { id: 'device:id-1', name: 'Lamp' },
        { id: 'device:id-2', name: 'Sensor' },
        { id: 'device:id-3', name: 'Switch' },
    ];

    beforeEach(
        fakeAsync(() => {
            const locationServiceSpy: Spy<LocationsService> = createSpyFromClass<LocationsService>(LocationsService);
            locationServiceSpy.getLocation.and.callFake(() => of(JSON.parse(JSON.stringify(exampleLocation))));
            const deviceServiceSpy: Spy<DeviceInstancesService> = createSpyFromClass<DeviceInstancesService>(DeviceInstancesService);
            deviceServiceSpy.getDeviceListByIds.and.callFake((ids: string[]) => of(devices.filter((d) => ids.includes(d.id))));
            const groupServiceSpy: Spy<DeviceGroupsService> = createSpyFromClass<DeviceGroupsService>(DeviceGroupsService);
            groupServiceSpy.getDeviceGroupListByIds.and.callFake((ids: string[]) => of(ids.map((id) => ({ id, name: 'Group ' + id }))));

            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, LocationsEditComponent],
                providers: [
                    { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'location:id' }) } } },
                    { provide: LocationsService, useValue: locationServiceSpy },
                    { provide: DeviceInstancesService, useValue: deviceServiceSpy },
                    { provide: DeviceGroupsService, useValue: groupServiceSpy },
                    provideHttpClient(withInterceptorsFromDi()),
                    provideHttpClientTesting(),
                ],
            }).compileComponents();
            fixture = TestBed.createComponent(LocationsEditComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            flush();
        }),
    );

    afterEach(
        fakeAsync(() => {
            fixture.destroy();
            flush();
        }),
    );

    function settle() {
        fixture.detectChanges();
        tick(100);
        flush();
        fixture.detectChanges();
    }

    it(
        'shows the location name and the save bar only while there are changes',
        fakeAsync(() => {
            settle();
            const el: HTMLElement = fixture.nativeElement;
            expect(el.querySelector('senergy-page-header')?.textContent).toContain('Office');
            expect(el.querySelector('senergy-save-bar')).toBeNull();

            component.addDevice('device:id-3');
            settle();
            expect(el.querySelector('senergy-save-bar')).not.toBeNull();

            component.removeDevice('device:id-3');
            settle();
            expect(el.querySelector('senergy-save-bar')).toBeNull();
        }),
    );

    it(
        'discard restores the loaded fields, devices and device groups',
        fakeAsync(() => {
            component.addDevice('device:id-3');
            component.removeDeviceGroup('group:id-1');
            component.locationForm.get('name')?.setValue('other');
            settle();
            expect(component.hasChanges()).toBeTrue();

            component.discard();
            settle();

            expect(component.hasChanges()).toBeFalse();
            expect(component.locationForm.get('name')?.value).toBe('Office');
            expect(component.locationForm.get('device_ids')?.value).toEqual(['device:id-1', 'device:id-2']);
            expect(component.locationForm.get('device_group_ids')?.value).toEqual(['group:id-1']);
            expect(component.devicesForm.value.length).toBe(2);
        }),
    );

    it(
        'discard on a new location returns to the list',
        fakeAsync(() => {
            component.id = '';
            const router = TestBed.inject(Router);
            const navigate = spyOn(router, 'navigate').and.resolveTo(true);
            component.discard();
            expect(navigate).toHaveBeenCalledWith(['devices/locations']);
        }),
    );
});
