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

import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of, Subject } from 'rxjs';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceInstancesServiceDialogComponent } from '../dialogs/device-instances-service-dialog.component';
import { DeviceInstanceModel } from './device-instances.model';
import { DeviceInstancesDialogService } from './device-instances-dialog.service';
import { DeviceInstancesService } from './device-instances.service';

describe('DeviceInstancesDialogService data dialog', () => {
    let deviceTypeService: Spy<DeviceTypeService>;
    let dialog: jasmine.SpyObj<MatDialog>;
    let afterClosed: Subject<unknown>;
    let service: DeviceInstancesDialogService;

    const device = { id: 'urn:device:1', device_type_id: 'dt1' } as unknown as DeviceInstanceModel;
    const deviceType = {
        id: 'dt1',
        services: [
            { id: 'urn:service:a', name: 'Energy', outputs: [{ content_variable: { name: 'a' } }] },
            { id: 'urn:service:b', name: 'Status', outputs: [] },
        ],
    };

    beforeEach(() => {
        deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getMeasuringFunctions.and.returnValue(of([{ id: 'f1', display_name: 'Get energy' }] as never));
        deviceTypeService.getAspectNodesWithMeasuringFunction.and.returnValue(of([{ id: 'a1', name: 'Air' }] as never));
        deviceTypeService.getLeafCharacteristics.and.returnValue(of([{ id: 'c1', name: 'kWh', display_unit: 'kWh' }] as never));
        deviceTypeService.getDeviceType.and.returnValue(of(deviceType as never));
        deviceTypeService.getValuePathsAndContentVariables.and.returnValue([
            { path: 'value.total', contentVariable: { function_id: 'f1', characteristic_id: 'c1', aspect_ids: ['a1'] } },
            { path: 'value.power', contentVariable: { function_id: 'f1' } },
        ] as never);
        afterClosed = new Subject();
        dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
        dialog.open.and.returnValue({ afterClosed: () => afterClosed } as never);
        TestBed.configureTestingModule({
            providers: [
                { provide: MatDialog, useValue: dialog },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: MatSnackBar, useValue: {} },
                { provide: DeviceInstancesService, useValue: {} },
            ],
        });
        service = TestBed.inject(DeviceInstancesDialogService);
    });

    it('builds one last-value request element per output path of every service', () => {
        service.openDeviceServiceDialog(device);

        const config = dialog.open.calls.mostRecent().args[1] as { data: Record<string, unknown> };
        expect(dialog.open.calls.mostRecent().args[0]).toBe(DeviceInstancesServiceDialogComponent);
        expect(config.data['lastValueElements']).toEqual([
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'value.total' },
            { deviceId: 'urn:device:1', serviceId: 'urn:service:a', columnName: 'value.power' },
        ]);
        expect(config.data['serviceOutputCounts']).toEqual([2, 0]);
        expect(config.data['descriptions']).toEqual([['Air, Get energy, kWh', 'Get energy'], []]);
        expect(config.data['units']).toEqual([['kWh', ''], []]);
    });

    it('marks the paths whose content variable has an aspect, from the data it loads anyway', () => {
        service.openDeviceServiceDialog(device);

        const config = dialog.open.calls.mostRecent().args[1] as { data: Record<string, unknown> };
        expect(config.data['valueMeta']).toEqual([[
            { hasAspect: true, aspectName: 'Air', characteristicName: 'kWh' },
            { hasAspect: false, aspectName: '', characteristicName: '' },
        ], []]);
    });

    it('treats the deprecated aspect_id alone as an aspect', () => {
        deviceTypeService.getValuePathsAndContentVariables.and.returnValue([
            { path: 'v', contentVariable: { aspect_id: 'a1' } },
        ] as never);
        service.openDeviceServiceDialog(device);

        const config = dialog.open.calls.mostRecent().args[1] as { data: Record<string, unknown> };
        expect((config.data['valueMeta'] as { hasAspect: boolean }[][])[0][0].hasAspect).toBeTrue();
    });

    it('loads the functions, aspects, characteristics and the device type once each, and nothing else', () => {
        service.openDeviceServiceDialog(device);

        expect(deviceTypeService.getMeasuringFunctions).toHaveBeenCalledTimes(1);
        expect(deviceTypeService.getAspectNodesWithMeasuringFunction).toHaveBeenCalledTimes(1);
        expect(deviceTypeService.getLeafCharacteristics).toHaveBeenCalledTimes(1);
        expect(deviceTypeService.getDeviceType).toHaveBeenCalledOnceWith('dt1');
    });

    it('offers Edit in the dialog only with a callback, and calls it when the dialog closes with edit', () => {
        const onEdit = jasmine.createSpy('onEdit');
        service.openDeviceServiceDialog(device, onEdit);
        expect((dialog.open.calls.mostRecent().args[1] as { data: Record<string, unknown> }).data['canEdit']).toBeTrue();

        afterClosed.next(undefined);
        expect(onEdit).not.toHaveBeenCalled();
        afterClosed.next('edit');
        expect(onEdit).toHaveBeenCalledTimes(1);

        service.openDeviceServiceDialog(device);
        expect((dialog.open.calls.mostRecent().args[1] as { data: Record<string, unknown> }).data['canEdit']).toBeFalse();
    });
});
