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

import { of } from 'rxjs';
import { DeviceDowntimeGatewayService } from './device-downtime-gateway.service';
import { NetworksHistoryModel } from '../../../../../modules/devices/networks/shared/networks-history.model';
import { WidgetModel } from '../../../../../modules/dashboard/shared/dashboard-widget.model';

describe('DeviceDowntimeGatewayService', () => {
    const day = 86400000;
    const widget = { id: 'w', properties: {} } as WidgetModel;

    afterEach(() => jasmine.clock().uninstall());

    function service(gateways: NetworksHistoryModel[]) {
        const networks = { getNetworksHistory: () => of(gateways) };
        return new DeviceDowntimeGatewayService({} as any, {} as any, {} as any, {} as any, networks as any);
    }

    // SNRGY-4848 item 1: the window used to end at the time the module was loaded.
    it('ends the week at the time of each request', () => {
        const requested = new Date(2030, 0, 10, 12);
        const gateway: NetworksHistoryModel = {
            network: { id: 'g', name: 'G', connection_state: 'online' } as any,
            history: { id: 'g', next_state: null, prev_state: { connected: true, time: '' }, states: [{ connected: false, time: new Date(requested.getTime() - day).toISOString() }] },
        };
        jasmine.clock().install();
        jasmine.clock().mockDate(requested);
        let rows: any;
        service([gateway]).getDevicesDowntimePerGateway(widget).subscribe((r) => (rows = r));
        expect(rows).toEqual([{ name: 'G', failureRatio: 0.1429, label: '14.29%' }]);
    });

    it('has no rows without gateways', () => {
        let rows: any = 'not set';
        service([]).getDevicesDowntimePerGateway(widget).subscribe((r) => (rows = r));
        expect(rows).toBeUndefined();
    });
});
