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

import { FormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { TimeValuePairModel } from '../../../../widgets/shared/export-data.model';
import { ExportDataService } from '../../../../widgets/shared/export-data.service';
import { DeviceTypeModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { Attribute, DeviceInstanceModel } from '../shared/device-instances.model';
import { DeviceInstancesService } from '../shared/device-instances.service';
import { DeviceInstancesServiceDialogComponent } from './device-instances-service-dialog.component';

describe('DeviceInstancesServiceDialogComponent', () => {
    const nimbusA = 'urn:infai:ses:device:nimbus-a';
    const nimbusB = 'urn:infai:ses:device:nimbus-b';
    let deviceInstancesServiceSpy: Spy<DeviceInstancesService>;

    const newComponent = (attributes: Attribute[], readableNimbuses: DeviceInstanceModel[], lastValues: TimeValuePairModel[] = []) => {
        const exportDataServiceSpy = createSpyFromClass(ExportDataService);
        exportDataServiceSpy.getLastValuesTimescale.and.returnValue(of(lastValues));
        exportDataServiceSpy.getTimescaleDataAvailability.and.returnValue(of([]));
        const authorizationServiceSpy = createSpyFromClass(AuthorizationService);
        authorizationServiceSpy.userIsDeveloper.and.returnValue(false);
        deviceInstancesServiceSpy = createSpyFromClass(DeviceInstancesService);
        deviceInstancesServiceSpy.userHasReadAuthorizationConnectionLog.and.returnValue(false);
        deviceInstancesServiceSpy.getDeviceInstance.and.returnValue(of({ id: 'meter', attributes } as DeviceInstanceModel));
        deviceInstancesServiceSpy.getDeviceListByIds.and.returnValue(of(readableNimbuses));

        const component = new DeviceInstancesServiceDialogComponent(
            createSpyFromClass(MatDialogRef<DeviceInstancesServiceDialogComponent>),
            {
                device: { id: 'meter' } as DeviceInstanceModel,
                services: [],
                lastValueElements: [],
                deviceType: { services: [] } as unknown as DeviceTypeModel,
                serviceOutputCounts: [],
                descriptions: [],
            },
            exportDataServiceSpy,
            new FormBuilder(),
            createSpyFromClass(ErrorHandlerService),
            authorizationServiceSpy,
            deviceInstancesServiceSpy,
        );
        component.ngOnInit();
        return component;
    };

    const now = Date.now();
    const ago = (ms: number) => new Date(now - ms).toISOString();
    const receiverAttributes = [
        { key: 'wmbus/last_seen/' + nimbusB, value: ago(3 * 24 * 3600 * 1000), origin: nimbusB },
        { key: 'wmbus/last_seen/' + nimbusA, value: ago(12 * 60 * 1000), origin: nimbusA },
    ];

    it('lists each receiving nimbus by name, most recent first', () => {
        const component = newComponent(receiverAttributes, [{ id: nimbusA, name: 'nimbus-a', display_name: 'Nimbus A' } as DeviceInstanceModel]);

        expect(deviceInstancesServiceSpy.getDeviceListByIds).toHaveBeenCalledWith([nimbusA, nimbusB]);
        // nimbus b is not readable for the user and keeps its id
        expect(component.receivers.map(r => ({ nimbus: r.nimbus, ago: component.timeAgo(r.time) }))).toEqual([
            { nimbus: 'Nimbus A', ago: '12 minutes ago' },
            { nimbus: nimbusB, ago: '3 days ago' },
        ]);
    });

    it('counts the seconds of a message that just came in', () => {
        const component = newComponent([], []);

        expect(component.timeAgo(new Date(Date.now() - 3000))).toBe('3 seconds ago');
    });

    it('keeps the relative times until the next refresh', () => {
        jasmine.clock().install();
        try {
            const time = new Date('2026-10-27T10:00:00Z');
            jasmine.clock().mockDate(new Date(time.valueOf() + 12 * 60 * 1000));
            const component = newComponent([], []);

            jasmine.clock().mockDate(new Date(time.valueOf() + 17 * 60 * 1000));
            expect(component.timeAgo(time)).toBe('12 minutes ago');

            component.refresh();
            expect(component.timeAgo(time)).toBe('17 minutes ago');
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('marks the nimbuses that received the last message within the tolerance', () => {
        const component = newComponent(receiverAttributes, [], [
            { time: ago(12 * 60 * 1000 - 110 * 1000), value: 1 },
            { time: null, value: null },
        ]);

        expect(component.receivers.map(r => component.receivedLastMessage(r))).toEqual([true, false]);
    });

    it('leaves the state open while the last message is unknown', () => {
        const component = newComponent(receiverAttributes, [], [{ time: null, value: null }]);

        expect(component.receivers.map(r => component.receivedLastMessage(r))).toEqual([undefined, undefined]);
    });

    it('looks up no nimbus for a device that no nimbus has received', () => {
        const component = newComponent([{ key: 'wmbus/key', value: '0102', origin: '' }], []);

        // an empty id list would list every device of the user
        expect(deviceInstancesServiceSpy.getDeviceListByIds).not.toHaveBeenCalled();
        expect(component.receivers).toEqual([]);
    });
});
