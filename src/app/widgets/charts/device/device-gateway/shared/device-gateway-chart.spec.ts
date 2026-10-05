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

import { ExtendedHubModel } from '../../../../../modules/devices/networks/shared/networks.model';
import { devicesPerGateway, devicesPerGatewayTable } from './device-gateway-chart';

function hub(name: string, deviceLocalIds: string[] | null): ExtendedHubModel {
    return { id: name, name, hash: '', owner_id: '', device_local_ids: deviceLocalIds, device_ids: null, connection_state: 'online', shared: false } as ExtendedHubModel;
}

describe('devicesPerGateway', () => {
    it('counts the devices of each gateway, in listing order', () => {
        expect(devicesPerGateway([hub('Hub Z', ['a', 'b', 'c']), hub('Hub A', ['d'])])).toEqual([
            { name: 'Hub Z', count: 3 },
            { name: 'Hub A', count: 1 },
        ]);
    });

    it('counts a gateway without device list as 0 devices', () => {
        expect(devicesPerGateway([hub('Empty', null), hub('None', [])])).toEqual([
            { name: 'Empty', count: 0 },
            { name: 'None', count: 0 },
        ]);
    });
});

describe('devicesPerGatewayTable (Google)', () => {
    it('labels each column with its count and paints every column #4484ce', () => {
        expect(devicesPerGatewayTable([{ name: 'Hub A', count: 3 }, { name: 'Hub B', count: 0 }]).data).toEqual([
            ['Name', 'Count', { role: 'annotation' }, { role: 'style' }],
            ['Hub A', 3, 3, '#4484ce'],
            ['Hub B', 0, 0, '#4484ce'],
        ]);
    });
});
