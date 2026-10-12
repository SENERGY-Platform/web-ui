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

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of, Subject } from 'rxjs';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceTypeService as PlatformDeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { DatasetSource } from '../shared/environments.model';
import { PlatformDeviceLookup } from './platform-device-lookup.service';

describe('PlatformDeviceLookup', () => {
    const services = [
        { id: 's1', name: 'Power', outputs: [{ content_variable: { name: 'cv1' } }] },
        { id: 's2', name: 'Energy', outputs: [] },
    ] as any[];
    const deviceType = { id: 'dt1', name: 'Meter Type', services } as any;
    let instances: Spy<DeviceInstancesService>;
    let types: Spy<PlatformDeviceTypeService>;
    let lookup: PlatformDeviceLookup;

    const dataset = (ref: string | undefined, origin: DatasetSource['origin'] = 'platform'): DatasetSource => ({ origin, ref });

    beforeEach(() => {
        instances = createSpyFromClass(DeviceInstancesService);
        types = createSpyFromClass(PlatformDeviceTypeService);
        instances.getDeviceInstance.and.returnValue(of({ id: 'd1', display_name: 'Boiler Meter', device_type_id: 'dt1' } as any));
        types.getDeviceType.and.returnValue(of(deviceType));
        types.getValuePathsAndContentVariables.and.returnValue([{ path: 'a' }, { path: 'a.b' }] as any);
        TestBed.configureTestingModule({
            providers: [
                provideZonelessChangeDetection(),
                PlatformDeviceLookup,
                { provide: DeviceInstancesService, useValue: instances },
                { provide: PlatformDeviceTypeService, useValue: types },
            ],
        });
        lookup = TestBed.inject(PlatformDeviceLookup);
    });

    it('publishes the name and the type as signal values once loaded, each as a new map', () => {
        const namesBefore = lookup.names();
        const typesBefore = lookup.types();

        lookup.ensureLoaded('d1');

        expect(lookup.names()).not.toBe(namesBefore);
        expect(lookup.types()).not.toBe(typesBefore);
        expect(lookup.names().get('d1')).toBe('Boiler Meter');
        expect(lookup.types().get('d1')).toBe(deviceType);
        expect(namesBefore.size).toBe(0);
    });

    it('loads a device once and ignores an unset id', () => {
        lookup.ensureLoaded('d1');
        lookup.ensureLoaded('d1');
        lookup.ensureLoaded(undefined);

        expect(instances.getDeviceInstance).toHaveBeenCalledOnceWith('d1');
    });

    it('ignores a second request while the first is in flight', () => {
        instances.getDeviceInstance.and.returnValue(new Subject<any>());

        lookup.ensureLoaded('d1');
        lookup.ensureLoaded('d1');

        expect(instances.getDeviceInstance).toHaveBeenCalledTimes(1);
    });

    it('only loads platform-origin datasets with a ref', () => {
        lookup.ensureLoadedForDataset(dataset('d1', 'file'));
        lookup.ensureLoadedForDataset(dataset(undefined));
        lookup.ensureLoadedForDataset(undefined);
        expect(instances.getDeviceInstance).not.toHaveBeenCalled();

        lookup.ensureLoadedForDataset(dataset('d1'));
        expect(instances.getDeviceInstance).toHaveBeenCalledOnceWith('d1');
    });

    it('refreshes the cached service options when the device type arrives', () => {
        const pending = new Subject<any>();
        types.getDeviceType.and.returnValue(pending);
        const ds = dataset('d1');
        lookup.ensureLoaded('d1');
        const empty = lookup.serviceOptions(ds);
        expect(empty).toEqual([]);
        expect(lookup.serviceOptions(ds)).toBe(empty);

        pending.next(deviceType);

        expect(lookup.serviceOptions(ds)).toBe(services as any);
    });

    it('refreshes the cached column options when the device type arrives', () => {
        const pending = new Subject<any>();
        types.getDeviceType.and.returnValue(pending);
        const ds = { ...dataset('d1'), service_ref: 's1' };
        lookup.ensureLoaded('d1');
        expect(lookup.columnOptions(ds)).toEqual([]);

        pending.next(deviceType);

        expect(lookup.columnOptions(ds)).toEqual(['a', 'a.b']);
        expect(types.getValuePathsAndContentVariables).toHaveBeenCalledOnceWith({ name: 'cv1' } as any);
    });
});
