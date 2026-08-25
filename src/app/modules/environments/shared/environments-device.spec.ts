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

import { assetFromDeviceType } from './environments-device';
import { CatalogDeviceType } from './environments.model';

describe('assetFromDeviceType', () => {
    // s1 (Power) mirrors a "measure" service (sensor), s2 (Switch/On-Off) a "request"
    // service (actuator) -- the two shapes the server's device-type catalog actually sends.
    const deviceType: CatalogDeviceType = {
        id: 't1',
        name: 'Press',
        services: [
            { id: 's1', name: 'Power', direction: 'sensor', characteristic_id: 'watt' },
            { id: 's2', name: 'Switch: On/Off', direction: 'actuator', characteristic_id: 'bool' },
        ],
    };

    it('sets external_type_id but leaves external_ref unset -- the server creates the device on save', () => {
        const asset = assetFromDeviceType(deviceType, 'Press 1');
        expect(asset.external_type_id).toBe('t1');
        expect(asset.external_ref).toBeUndefined();
        expect(asset.name).toBe('Press 1');
    });

    it('creates one channel per service, carrying the service id as external_ref', () => {
        const asset = assetFromDeviceType(deviceType, 'Press 1');
        expect(asset.channels?.length).toBe(2);
        expect(asset.channels?.[0].external_ref).toBe('s1');
        expect(asset.channels?.[1].external_ref).toBe('s2');
    });

    it('preserves each service\'s direction and characteristic on its channel', () => {
        const asset = assetFromDeviceType(deviceType, 'Press 1');
        expect(asset.channels?.[0].direction).toBe('sensor');
        expect(asset.channels?.[0].characteristic_id).toBe('watt');
        expect(asset.channels?.[1].direction).toBe('actuator');
        expect(asset.channels?.[1].characteristic_id).toBe('bool');
    });

    it('produces no channels for a device type without services', () => {
        const asset = assetFromDeviceType({ id: 't2', name: 'Empty', services: [] }, 'Empty 1');
        expect(asset.channels).toEqual([]);
    });

    // BLOCKING regression: the server rejects a profile source on anything but a sensor
    // with a nonzero interval, and a nonzero own-compute (source.interval_seconds) on
    // anything but script. A request/actuator service given a profile source (as an
    // earlier version did) produced an asset that could never be saved, with no field in
    // the editor to fix it from -- the same dead end applySourceKind was already fixed for.
    describe('validation conformance of the generated channels', () => {
        const asset = assetFromDeviceType(deviceType, 'Press 1');
        const sensorChannel = asset.channels![0];
        const actuatorChannel = asset.channels![1];

        it('gives a sensor a profile source with a nonzero send interval and a zero own-compute interval', () => {
            expect(sensorChannel.interval_seconds).toBeGreaterThan(0);
            expect(sensorChannel.source?.kind).toBe('profile');
            expect(sensorChannel.source?.interval_seconds).toBe(0);
            expect(sensorChannel.source?.profile).toBeDefined();
        });

        it('gives an actuator a script source instead of a profile, with both intervals at zero', () => {
            expect(actuatorChannel.interval_seconds).toBe(0);
            expect(actuatorChannel.source?.kind).toBe('script');
            expect(actuatorChannel.source?.interval_seconds).toBe(0);
            expect(actuatorChannel.source?.profile).toBeUndefined();
        });

        it('writes the commanded value into a slugified state key a sensor elsewhere could read', () => {
            expect(actuatorChannel.source?.script?.code).toContain('moses.device.state.set("switch_on_off"');
            expect(actuatorChannel.source?.script?.code).toContain('moses.service.input');
        });
    });

    it('falls back to a generic key when a service name has nothing alphanumeric in it', () => {
        const symbolsOnly: CatalogDeviceType = { id: 't3', services: [{ id: 's1', name: '---', direction: 'actuator' }] };
        const asset = assetFromDeviceType(symbolsOnly, 'Odd 1');
        expect(asset.channels?.[0].source?.script?.code).toContain('moses.device.state.set("value"');
    });
});
