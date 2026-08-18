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

import { ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceInstanceModel } from '../shared/device-instances.model';
import { DeviceInstancesEditDialogComponent } from './device-instances-edit-dialog.component';

describe('DeviceInstancesEditDialogComponent', () => {
    let dialogRefSpy: Spy<MatDialogRef<DeviceInstancesEditDialogComponent>>;
    let deviceTypeServiceSpy: Spy<DeviceTypeService>;

    const newComponent = (device: DeviceInstanceModel) => {
        dialogRefSpy = createSpyFromClass(MatDialogRef<DeviceInstancesEditDialogComponent>);
        deviceTypeServiceSpy = createSpyFromClass(DeviceTypeService);
        deviceTypeServiceSpy.getProtocols.and.returnValue(of([]));
        deviceTypeServiceSpy.getDeviceType.and.returnValue(of(null));
        return new DeviceInstancesEditDialogComponent(
            dialogRefSpy,
            deviceTypeServiceSpy,
            {} as ChangeDetectorRef,
            {
                device,
                userHasUpdateDisplayNameAuthorization: true,
                userHasUpdateAttributesAuthorization: true,
            },
        );
    };

    const deviceWithNickname = () => ({
        id: 'device-1',
        name: 'device-name',
        display_name: 'my-nickname',
        device_type_id: 'dt-1',
        local_id: 'local-1',
        attributes: [
            { key: 'shared/nickname', value: 'my-nickname', origin: 'shared' },
            { key: 'timezone', value: 'Europe/Berlin', origin: 'web-ui' },
        ],
    } as DeviceInstanceModel);

    it('removes the nickname attribute and clears display_name when the display name is deleted', () => {
        const component = newComponent(deviceWithNickname());
        component.displayname = '';
        component.save();

        const closedWith = dialogRefSpy.close.calls.mostRecent().args[0] as DeviceInstanceModel;
        expect(closedWith.attributes?.find((attr) => attr.key === 'shared/nickname')).toBeUndefined();
        expect(closedWith.display_name).toBe('');
    });

    it('updates the nickname attribute and display_name when a new display name is entered', () => {
        const component = newComponent(deviceWithNickname());
        component.displayname = 'new-nickname';
        component.save();

        const closedWith = dialogRefSpy.close.calls.mostRecent().args[0] as DeviceInstanceModel;
        expect(closedWith.attributes?.find((attr) => attr.key === 'shared/nickname')?.value).toBe('new-nickname');
        expect(closedWith.display_name).toBe('new-nickname');
    });
});
